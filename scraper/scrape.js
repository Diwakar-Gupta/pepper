#!/usr/bin/env node
/**
 * Rebuilds frontend/public/database from Wayback Machine snapshots of pepcoding.com.
 *
 *   node scrape.js                       # all courses
 *   node scrape.js --course levelup      # one course
 *   node scrape.js --module patterns     # only modules whose slug matches
 *   node scrape.js --index-tests         # only refresh testCases lists from testcases/ folders
 *
 * How it works
 *   1. One CDX query per course lists every archived URL (and every snapshot time).
 *   2. Raw HTML (the `id_` form, without the Wayback toolbar) is fetched for the newest
 *      snapshot, cached in .cache/, and parsed with cheerio. Older snapshots are tried
 *      if the newest one cannot be parsed.
 *   3. Course -> modules -> items (problems, articles, videos) are written as JSON.
 *      Every problem's sample input/output becomes test case #1 unless hand-written
 *      test cases already exist in testcases/<slug>/.
 */
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB = path.resolve(HERE, "../frontend/public/database");
const CACHE = path.join(HERE, ".cache");
const ORIGIN = "https://www.pepcoding.com";

const COURSES = [
  {
    slug: "dsa-fundamentals",
    remote: "online-java-foundation",
    prefix: "",
    name: "Level 1: DSA Fundamentals",
    duration: "2 months",
    description: "For beginners: programming basics, recursion, DP, stacks, queues, trees, hashmaps and graphs.",
  },
  {
    slug: "levelup",
    remote: "data-structures-and-algorithms-in-java-levelup",
    prefix: "levelup-",
    name: "Level 2: LevelUp",
    duration: "3 months",
    description: "For intermediate coders: advanced recursion, DP, graphs, trees, bit manipulation and more.",
  },
  {
    slug: "interview-prep",
    remote: "data-structures-and-algorithms-in-java-interview-prep",
    prefix: "interview-prep-",
    name: "Level 3: Interview Preparation",
    duration: "3 months",
    description: "For interview preparation: company-style problems across every major topic.",
  },
];

// --------------------------------------------------------------------------- //
// CLI
// --------------------------------------------------------------------------- //

const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const ONLY_COURSE = argValue("--course");
const ONLY_MODULE = argValue("--module");
const CONCURRENCY = Number(argValue("--concurrency") || 4);

// --------------------------------------------------------------------------- //
// Utilities
// --------------------------------------------------------------------------- //

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (s) => createHash("sha1").update(s).digest("hex");
export const slugify = (s) =>
  s
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n");
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Tiny promise pool so we stay polite to archive.org. */
function limiter(max) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}
const limit = limiter(CONCURRENCY);

const stats = { fetched: 0, cached: 0, failed: 0 };

/** GET with on-disk cache, retries and backoff. Returns Buffer or null on 404. */
async function get(url, { binary = false } = {}) {
  const file = path.join(CACHE, binary ? "bin" : "html", sha1(url));
  if (existsSync(file)) {
    stats.cached++;
    const buf = await fs.readFile(file);
    return buf.length ? buf : null;
  }
  return limit(async () => {
    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "pepper-scraper (open-source archive reader)" },
          redirect: "follow",
          signal: AbortSignal.timeout(60_000),
        });
        if (res.status === 404 || res.status === 403) {
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, "");
          return null;
        }
        if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, buf);
        stats.fetched++;
        return buf;
      } catch (err) {
        const wait = Math.min(60_000, 2000 * 2 ** attempt);
        if (attempt === 6) {
          stats.failed++;
          console.warn(`  ! giving up on ${url}: ${err.message}`);
          return null;
        }
        await sleep(wait);
      }
    }
    return null;
  });
}

// --------------------------------------------------------------------------- //
// Wayback index
// --------------------------------------------------------------------------- //

/** "https://www.pepcoding.com/a/b/?x" -> "/a/b" */
function pathKey(url) {
  try {
    const u = new URL(url, ORIGIN);
    return decodeURIComponent(u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Map pathKey -> [{timestamp, original}] newest first, for everything under a course. */
async function loadIndex(remote) {
  const cdx =
    "https://web.archive.org/cdx/search/cdx?output=json&fl=original,timestamp" +
    `&filter=statuscode:200&url=pepcoding.com/resources/${remote}*`;
  const buf = await get(cdx);
  if (!buf) throw new Error(`CDX query failed for ${remote}`);
  const rows = JSON.parse(buf.toString()).slice(1);
  const index = new Map();
  for (const [original, timestamp] of rows) {
    if (original.includes("?")) continue;
    const key = pathKey(original);
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ original, timestamp });
  }
  // The live site was shut down in 2023, so later captures are error pages.
  // Prefer the newest capture from the site's last good period, then older ones, then newer.
  const rank = (t) => (t < "20230101" ? 0 : 1);
  for (const [key, list] of index) {
    const seen = new Set();
    const uniq = list.filter((s) => !seen.has(s.timestamp) && seen.add(s.timestamp));
    uniq.sort((a, b) => rank(a.timestamp) - rank(b.timestamp) || b.timestamp.localeCompare(a.timestamp));
    index.set(key, uniq);
  }
  return index;
}

/** Fetch the newest parseable snapshot of `href`. parse($) returns null to reject. */
async function fetchParsed(index, href, parse) {
  const snaps = index.get(pathKey(href)) || [];
  const tries = snaps.length ? snaps.slice(0, 4) : [{ timestamp: "2022", original: new URL(href, ORIGIN).href }];
  for (const { timestamp, original } of tries) {
    const buf = await get(`https://web.archive.org/web/${timestamp}id_/${original}`);
    if (!buf) continue;
    const $ = cheerio.load(buf.toString("utf8"));
    try {
      const out = await parse($);
      if (out) return out;
    } catch (err) {
      console.warn(`  ! parse error ${href} @${timestamp}: ${err.message}`);
    }
  }
  return null;
}

// --------------------------------------------------------------------------- //
// HTML sanitising (content is rendered with innerHTML on the site)
// --------------------------------------------------------------------------- //

const KEEP = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "s", "ol", "ul", "li", "pre", "code", "blockquote",
  "table", "thead", "tbody", "tr", "th", "td", "img", "a", "sup", "sub", "h3", "h4", "h5", "hr",
]);
const RENAME = { h1: "h3", h2: "h3", h6: "h5" };
const UNWRAP = new Set(["span", "div", "font", "section", "article", "center", "label", "tt", "small", "big", "mark"]);
const DROP = new Set(["script", "style", "svg", "input", "button", "textarea", "select", "form", "noscript", "link", "meta", "head", "object", "embed", "canvas", "video", "audio"]);

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const imageJobs = new Map(); // absolute url -> local relative path

function localImage(src) {
  let abs;
  try {
    abs = new URL(src, ORIGIN).href;
  } catch {
    return null;
  }
  if (abs.startsWith("data:")) return null;
  // Strip any wayback wrapper so we can re-request through it ourselves.
  abs = abs.replace(/^https?:\/\/web\.archive\.org\/web\/[^/]+\//, "");
  if (!imageJobs.has(abs)) {
    const ext = (path.extname(new URL(abs).pathname) || ".png").toLowerCase().slice(0, 5);
    imageJobs.set(abs, `database/images/${sha1(abs).slice(0, 16)}${ext}`);
  }
  return imageJobs.get(abs);
}

/** Converts a cheerio node's children to a small, safe HTML subset. */
export function sanitize($, node, { brToNewline = false } = {}) {
  const out = [];
  let preDepth = 0;
  const walk = (el) => {
    for (const child of $(el).contents().toArray()) {
      if (child.type === "text") {
        let text = child.data.replace(/\u00a0/g, " ");
        if (!brToNewline && preDepth === 0) text = text.replace(/\s+/g, " ");
        out.push(escapeHtml(text));
        continue;
      }
      if (child.type !== "tag") continue;
      let tag = child.name.toLowerCase();
      if (DROP.has(tag)) continue;
      if (tag === "iframe") {
        const id = youtubeId($(child).attr("src"));
        if (id) out.push(`<a data-yt="${id}" href="https://www.youtube.com/watch?v=${id}">Watch video</a>`);
        continue;
      }
      if (tag === "br") {
        out.push(brToNewline ? "\n" : "<br>");
        continue;
      }
      if (UNWRAP.has(tag)) {
        walk(child);
        continue;
      }
      tag = RENAME[tag] || tag;
      if (!KEEP.has(tag)) {
        walk(child);
        continue;
      }
      if (tag === "img") {
        const local = localImage($(child).attr("src") || "");
        if (local) out.push(`<img src="${local}" alt="${escapeHtml($(child).attr("alt") || "")}">`);
        continue;
      }
      if (tag === "a") {
        const href = $(child).attr("href") || "";
        const id = youtubeId(href);
        let abs = null;
        try {
          abs = new URL(href, ORIGIN).href;
        } catch {}
        if (id) {
          out.push(`<a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">`);
        } else if (abs && /^https?:/.test(abs) && !/pepcoding\.com/.test(abs)) {
          out.push(`<a href="${escapeHtml(abs)}" target="_blank" rel="noopener">`);
        } else {
          walk(child); // internal pepcoding links are dead: keep the text only
          continue;
        }
        walk(child);
        out.push("</a>");
        continue;
      }
      out.push(`<${tag}>`);
      if (tag === "pre") preDepth++;
      walk(child);
      if (tag === "pre") preDepth--;
      out.push(`</${tag}>`);
    }
  };
  walk(node);
  return out
    .join("")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(?:<br>\s*){3,}/g, "<br><br>")
    .replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g, "")
    .replace(/>\s+</g, (m) => (m.includes("\n") ? ">\n<" : m))
    .trim();
}

/** Plain text of a <pre>, honouring <br>. */
function preText($, el) {
  const clone = $(el).clone();
  clone.find("br").replaceWith("\n");
  return clone
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/^\n+|\s+$/g, "");
}

// --------------------------------------------------------------------------- //
// Page parsers
// --------------------------------------------------------------------------- //

function parseCourse($) {
  const categories = [];
  $("ol.classResource > li, ol.collapsible > li").each((_, li) => {
    const name = $(li).find(".collapsible-header").first().text().trim().replace(/\s+/g, " ");
    const modules = [];
    $(li)
      .find(".collapsible-body a[href], li a[href]")
      .each((_, a) => {
        const href = $(a).attr("href");
        const title = $(a).text().trim().replace(/\s+/g, " ");
        if (!href || !title || !href.includes("/resources/")) return;
        if (!modules.some((m) => m.href === href)) modules.push({ name: title, href });
      });
    if (name && modules.length) categories.push({ name, modules });
  });
  return categories.length ? categories : null;
}

function parseModule($) {
  const items = [];
  $("ul.resourceList > li[resource-type], ul.resourceList > li[resource-Type]").each((_, li) => {
    const type = ($(li).attr("resource-type") || "").toLowerCase();
    const a = $(li).find("a.pageLink, a[href]").first();
    const href = a.attr("href");
    const name = ($(li).find("[resource-name]").attr("resource-name") || a.text()).trim().replace(/\s+/g, " ");
    const badge = $(li).find(".badge").attr("class") || "";
    const difficulty = /\beasy\b/.test(badge) ? "Easy" : /\bmedium\b/.test(badge) ? "Medium" : /\bhard\b/.test(badge) ? "Hard" : null;
    if (href && name) items.push({ type, href, name, difficulty });
  });
  return items.length ? items : null;
}

const SECTION_KEYS = {
  "input format": "inputFormat",
  "output format": "outputFormat",
  constraints: "constraints",
  "sample input": "sampleInput",
  "sample output": "sampleOutput",
};

function parseProblem($) {
  const firstPre = $("pre.card").first();
  if (!firstPre.length) return null;
  const container = firstPre.parent();
  const problem = { statement: sanitize($, firstPre, { brToNewline: true }) };

  container.children("span.pre-heading").each((_, h) => {
    const key = SECTION_KEYS[$(h).text().trim().toLowerCase()];
    if (!key) return;
    const pre = $(h).nextAll("pre").first();
    if (!pre.length) return;
    problem[key] = key.startsWith("sample") ? preText($, pre) : sanitize($, pre, { brToNewline: true });
  });

  problem.questionVideo = youtubeId($("#videoId").attr("value")) || youtubeId($(".question-text-video iframe").attr("src"));
  problem.solutionVideo = youtubeId($("#solutionContainer iframe").attr("src"));

  const templates = {};
  $('input[id$="_sample_code"]').each((_, input) => {
    const raw = $(input).attr("value");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      for (const [lang, v] of Object.entries(parsed)) {
        const code = (v && v.code ? String(v.code) : "").replace(/\r\n/g, "\n");
        if (code.trim() && !/Snippet Here/i.test(code)) templates[lang] = code;
      }
    } catch {}
  });
  problem.templates = templates;

  const editorial = $("#editorial li.editorial .collapsible-body").first();
  if (editorial.length) {
    editorial.find("span.language, span.canRunCode").each((_, s) => {
      const p = $(s).closest("p");
      p.length ? p.remove() : $(s).remove();
    });
    const html = sanitize($, editorial);
    if (html) problem.editorial = html;
  }
  return problem;
}

function parseArticle($) {
  const root = $("#summaryTxt").length ? $("#summaryTxt") : $(".topicData");
  if (!root.length) return null;
  // Decorative header (title, quote, scroll arrow) duplicated from the page chrome.
  root
    .find(".article-1-outerbox, .Circles, .ca3-scroll-down-link, .question-logo, .ques-info, .qoute, .qoute-icon, .prev-link, .next-link, .topic-name")
    .remove();
  const html = sanitize($, root);
  return html.replace(/<[^>]+>/g, "").trim().length > 40 ? { html } : null;
}

function parseVideo($) {
  let id = null;
  $("iframe").each((_, f) => {
    id = id || youtubeId($(f).attr("src"));
  });
  return id ? { youtubeId: id } : null;
}

// --------------------------------------------------------------------------- //
// Test cases
// --------------------------------------------------------------------------- //

async function listTestCases(slug) {
  const dir = path.join(DB, "testcases", slug);
  if (!existsSync(dir)) return [];
  const files = await fs.readdir(dir);
  const nums = files
    .map((f) => f.match(/^testcaseinput(\d+)\.txt$/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .filter((n) => files.includes(`testcaseoutput${n}.txt`))
    .sort((a, b) => a - b);
  return nums.map((n) => ({ input: `testcaseinput${n}.txt`, output: `testcaseoutput${n}.txt` }));
}

async function ensureSampleTest(slug, problem) {
  const existing = await listTestCases(slug);
  if (existing.length) return existing;
  if (problem.sampleOutput === undefined || problem.sampleOutput === "") return [];
  const dir = path.join(DB, "testcases", slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "testcaseinput1.txt"), (problem.sampleInput || "") + "\n");
  await fs.writeFile(path.join(dir, "testcaseoutput1.txt"), problem.sampleOutput + "\n");
  return listTestCases(slug);
}

async function indexAllTests() {
  const dir = path.join(DB, "problems");
  let n = 0;
  for (const f of await fs.readdir(dir)) {
    if (!f.endsWith(".json")) continue;
    const file = path.join(dir, f);
    const data = await readJson(file);
    const tests = await listTestCases(data.slug);
    if (JSON.stringify(tests) !== JSON.stringify(data.testCases || [])) {
      data.testCases = tests;
      await writeJson(file, data);
      n++;
    }
  }
  console.log(`Updated testCases in ${n} problem files.`);
}

// --------------------------------------------------------------------------- //
// Course scraping
// --------------------------------------------------------------------------- //

function uniqueSlug(base, used) {
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  used.add(slug);
  return slug;
}

async function scrapeItem(index, course, mod, item, used) {
  const base = `${course.prefix}${mod.slug}-${slugify(item.name)}`;
  if (item.type === "ojquestion") {
    const slug = uniqueSlug(base, used.problems);
    const file = path.join(DB, "problems", `${slug}.json`);
    const parsed = await fetchParsed(index, item.href, parseProblem);
    const entry = { type: "problem", slug, name: item.name, difficulty: item.difficulty || undefined };
    if (!parsed) {
      if (existsSync(file)) return entry; // keep previously scraped data
      return { ...entry, unavailable: true };
    }
    const problem = {
      name: item.name,
      slug,
      course: course.slug,
      module: mod.slug,
      difficulty: item.difficulty || undefined,
      ...parsed,
      source: new URL(item.href, ORIGIN).href,
    };
    problem.testCases = await ensureSampleTest(slug, problem);
    await writeJson(file, problem);
    return { ...entry, tests: problem.testCases.length };
  }
  if (item.type === "topic") {
    const slug = uniqueSlug(base, used.articles);
    const parsed = await fetchParsed(index, item.href, parseArticle);
    if (!parsed) return null; // nothing worth showing
    await writeJson(path.join(DB, "articles", `${slug}.json`), {
      name: item.name,
      slug,
      course: course.slug,
      module: mod.slug,
      html: parsed.html,
      source: new URL(item.href, ORIGIN).href,
    });
    return { type: "article", slug, name: item.name };
  }
  if (item.type === "video") {
    const slug = uniqueSlug(base, used.videos);
    const parsed = await fetchParsed(index, item.href, parseVideo);
    if (!parsed) return null;
    return { type: "video", slug, name: item.name, youtubeId: parsed.youtubeId };
  }
  return null; // MCQs have no archived answers; skip them
}

async function scrapeCourse(course) {
  console.log(`\n== ${course.name} ==`);
  const index = await loadIndex(course.remote);
  console.log(`  ${index.size} archived URLs`);
  const categories = await fetchParsed(index, `/resources/${course.remote}/`, parseCourse);
  if (!categories) throw new Error(`Could not parse course page for ${course.slug}`);

  const used = { problems: new Set(), articles: new Set(), videos: new Set() };
  const seenModules = new Set();
  const outCategories = [];
  for (const cat of categories) {
    const modules = [];
    for (const m of cat.modules) {
      const mod = { name: m.name, slug: slugify(m.name), href: m.href };
      if (seenModules.has(mod.slug)) continue; // some modules are linked from two categories
      seenModules.add(mod.slug);
      if (ONLY_MODULE && !mod.slug.includes(ONLY_MODULE)) {
        const prev = await readJson(path.join(DB, "courses", course.slug, `${mod.slug}.json`));
        if (prev) modules.push({ name: mod.name, slug: mod.slug, counts: prev.counts });
        continue;
      }
      const list = await fetchParsed(index, m.href, parseModule);
      if (!list) {
        console.warn(`  ! module not archived: ${m.name}`);
        continue;
      }
      const items = (await Promise.all(list.map((it) => scrapeItem(index, course, mod, it, used)))).filter(Boolean);
      if (!items.some((i) => !i.unavailable)) {
        console.warn(`  ! nothing archived for module: ${m.name}`);
        continue;
      }
      const counts = {
        problems: items.filter((i) => i.type === "problem" && !i.unavailable).length,
        articles: items.filter((i) => i.type === "article").length,
        videos: items.filter((i) => i.type === "video").length,
      };
      await writeJson(path.join(DB, "courses", course.slug, `${mod.slug}.json`), {
        name: mod.name,
        slug: mod.slug,
        course: course.slug,
        counts,
        items,
      });
      console.log(`  ${mod.name.padEnd(40)} ${counts.problems} problems, ${counts.articles} articles, ${counts.videos} videos`);
      modules.push({ name: mod.name, slug: mod.slug, counts });
    }
    if (modules.length) outCategories.push({ name: cat.name, modules });
  }

  const totals = { problems: 0, articles: 0, videos: 0 };
  for (const c of outCategories) for (const m of c.modules) for (const k in totals) totals[k] += m.counts?.[k] || 0;
  await writeJson(path.join(DB, "courses", course.slug, "meta.json"), {
    name: course.name,
    slug: course.slug,
    description: course.description,
    duration: course.duration,
    counts: totals,
    categories: outCategories,
  });
  return totals;
}

function imageVariants(abs) {
  const u = new URL(abs);
  const host = u.hostname.replace(/^www\./, "");
  const rest = u.pathname + u.search;
  return [abs, `https://www.${host}${rest}`, `http://www.${host}${rest}`, `https://${host}${rest}`, `http://${host}${rest}`]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((v) => `https://web.archive.org/web/2022im_/${v}`);
}

async function downloadImages() {
  const missing = new Set();
  await Promise.all(
    [...imageJobs].map(async ([abs, rel]) => {
      const dest = path.join(DB, "..", rel);
      if (existsSync(dest)) return;
      for (const url of imageVariants(abs)) {
        const buf = await get(url, { binary: true });
        if (buf && buf.length >= 100 && !buf.subarray(0, 64).toString().includes("<")) {
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, buf);
          return;
        }
      }
      missing.add(rel);
    })
  );
  console.log(`\nImages: ${imageJobs.size - missing.size}/${imageJobs.size} saved`);
  if (!missing.size) return;
  // Drop <img> tags whose image was never archived, so the site shows no broken icons.
  for (const dir of ["problems", "articles"]) {
    for (const f of await fs.readdir(path.join(DB, dir))) {
      const file = path.join(DB, dir, f);
      const text = await fs.readFile(file, "utf8");
      const next = text.replace(/<img src=\\"(database\/images\/[^\\"]+)\\"[^>]*>/g, (m, rel) => (missing.has(rel) ? "" : m));
      if (next !== text) await fs.writeFile(file, next);
    }
  }
}

async function main() {
  if (args.includes("--index-tests")) return indexAllTests();

  const summary = [];
  for (const course of COURSES) {
    if (ONLY_COURSE && course.slug !== ONLY_COURSE) {
      summary.push({ ...course, counts: (await readJson(path.join(DB, "courses", course.slug, "meta.json")))?.counts });
      continue;
    }
    const counts = await scrapeCourse(course);
    summary.push({ ...course, counts });
  }
  await downloadImages();

  await writeJson(
    path.join(DB, "courses", "meta.json"),
    summary.map(({ slug, name, description, duration, counts }) => ({ slug, name, description, duration, counts }))
  );
  console.log(`\nDone. fetched=${stats.fetched} cached=${stats.cached} failed=${stats.failed}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
