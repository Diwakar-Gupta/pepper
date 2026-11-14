// Static content lives in public/database and is served by GitHub Pages.
import { useEffect, useState } from "react";
import { BASE } from "../constants";

const cache = new Map();

async function fetchJson(path) {
  if (!cache.has(path)) {
    const p = fetch(`${BASE}/database/${path}`).then((res) => {
      if (!res.ok) throw new Error(res.status === 404 ? "not-found" : `HTTP ${res.status}`);
      return res.json();
    });
    cache.set(path, p);
    p.catch(() => cache.delete(path));
  }
  return cache.get(path);
}

async function fetchText(path) {
  const res = await fetch(`${BASE}/database/${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---- normalisers keep older JSON layouts working --------------------------- //

function normalizeCourse(c) {
  if (c.categories) return c;
  return {
    ...c,
    categories: (c.categorys || []).map((cat) => ({
      name: cat.name,
      modules: (cat.topics || []).map((t) => ({ name: t.name, slug: t.slug })),
    })),
  };
}

function normalizeModule(m, slug) {
  if (!Array.isArray(m)) return m;
  return {
    name: slug.replace(/-/g, " "),
    slug,
    items: m.map((p) => ({ type: "problem", slug: p.slug, name: p.name, difficulty: p.difficulty })),
  };
}

function normalizeProblem(p) {
  if (p.statement || !p.description) return p;
  return { ...p, legacyDescription: p.description, templates: {} };
}

// ---- API ------------------------------------------------------------------- //

export const getCourses = () => fetchJson("courses/meta.json");
export const getCourse = (course) => fetchJson(`courses/${course}/meta.json`).then(normalizeCourse);
export const getModule = (course, mod) =>
  fetchJson(`courses/${course}/${mod}.json`).then((m) => normalizeModule(m, mod));
export const getProblem = (slug) => fetchJson(`problems/${slug}.json`).then(normalizeProblem);
export const getArticle = (slug) => fetchJson(`articles/${slug}.json`);

/** Loads every test case of a problem as {input, expected}. */
export async function getTestCases(problem) {
  const list = problem.testCases || [];
  return Promise.all(
    list.map(async (tc) => ({
      input: await fetchText(`testcases/${problem.slug}/${tc.input}`),
      expected: await fetchText(`testcases/${problem.slug}/${tc.output}`),
    }))
  );
}

/** Small hook: {data, error, loading} for a promise-returning loader. */
export function useLoader(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ data: s.data, error: null, loading: true }));
    loader()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const assetUrl = (rel) => `${BASE}/${rel}`;
