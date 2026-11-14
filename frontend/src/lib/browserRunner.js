// Runs Python and JavaScript entirely in the browser, no judge needed.
// Returns the same shape as the local judge: {compile, results, summary}.
//   Python:     Pyodide (CPython compiled to WebAssembly), loaded once from jsDelivr.
//   JavaScript: a fresh Web Worker per test, with small shims for Node's fs/readline/process.

export const BROWSER_LANGUAGES = ["python", "javascript"];
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
const TIME_LIMIT_MS = { python: 5000, javascript: 3000 };

// --------------------------------------------------------------------------- //
// Output comparison (mirrors judge/pepper_judge.py)
// --------------------------------------------------------------------------- //

export function normalizeOutput(text) {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, ""));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  while (lines.length && lines[0] === "") lines.shift();
  return lines;
}

/** Unified-style diff: "-" expected lines, "+" your lines. */
function diffLines(expected, actual) {
  const n = expected.length;
  const m = actual.length;
  if (n * m > 4_000_000) {
    return ["--- expected", "+++ yours", ...expected.map((l) => "-" + l), ...actual.map((l) => "+" + l)].join("\n");
  }
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = expected[i] === actual[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out = ["--- expected", "+++ yours"];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && expected[i] === actual[j]) {
      out.push(" " + expected[i]);
      i++;
      j++;
    } else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push("+" + actual[j++]);
    } else {
      out.push("-" + expected[i++]);
    }
  }
  return out.join("\n");
}

export function compareOutputs(actual, expected) {
  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);
  if (a.length === e.length && a.every((l, i) => l === e[i])) return { passed: true, diff: null };
  return { passed: false, diff: diffLines(e, a) };
}

// --------------------------------------------------------------------------- //
// Workers
// --------------------------------------------------------------------------- //

const workerFromSource = (src) => new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));

const JS_WORKER = `
onmessage = (e) => {
  const { code, input } = e.data;
  const out = [], err = [];
  const fmt = (args) => args.map((a) => {
    if (typeof a === "string") return a;
    try { return typeof a === "object" ? JSON.stringify(a) : String(a); } catch (_) { return String(a); }
  }).join(" ");
  const con = {
    log: (...a) => out.push(fmt(a) + "\\n"), info: (...a) => out.push(fmt(a) + "\\n"),
    warn: (...a) => err.push(fmt(a) + "\\n"), error: (...a) => err.push(fmt(a) + "\\n"), debug: () => {},
  };
  const EXIT = {};
  let exitCode = 0;
  const proc = {
    stdout: { write: (s) => { out.push(String(s)); return true; } },
    stderr: { write: (s) => { err.push(String(s)); return true; } },
    stdin: { on: () => {} }, argv: ["node", "main.js"], env: {}, platform: "browser",
    exit: (c = 0) => { exitCode = c; throw EXIT; },
  };
  const lines = input.split("\\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  const readline = {
    createInterface: () => {
      const handlers = {};
      const rl = {
        on: (ev, fn) => { handlers[ev] = fn; return rl; }, close: () => {}, question: () => {},
        [Symbol.asyncIterator]: async function* () { for (const l of lines) yield l; },
      };
      setTimeout(() => {
        try { lines.forEach((l) => handlers.line && handlers.line(l)); handlers.close && handlers.close(); }
        catch (x) { if (x !== EXIT) { err.push((x && x.stack) || String(x)); exitCode = 1; } }
      }, 0);
      return rl;
    },
  };
  const req = (name) => {
    const m = String(name).replace(/^node:/, "");
    if (m === "fs") return { readFileSync: (f) => {
      if (f === 0 || f === "/dev/stdin") return input;
      throw new Error("Reading files is not available in the browser runner");
    } };
    if (m === "readline") return readline;
    throw new Error("Module '" + name + "' is not available in the browser runner");
  };
  const finish = () => postMessage({ stdout: out.join(""), stderr: err.join(""), exitCode });
  try {
    const result = new Function("require", "console", "process", "module", "exports", code)(req, con, proc, { exports: {} }, {});
    Promise.resolve(result).catch((x) => { if (x !== EXIT) { err.push((x && x.stack) || String(x)); exitCode = 1; } });
  } catch (x) {
    if (x !== EXIT) { err.push((x && x.stack) || String(x)); exitCode = 1; }
  }
  // Let readline callbacks and promise chains run before reporting.
  setTimeout(() => setTimeout(finish, 0), 0);
};
`;

const PY_WORKER = `
importScripts(${JSON.stringify(PYODIDE_URL)});
const ready = loadPyodide().then(async (py) => {
  py.runPython(\`
import sys, io, traceback

def __pepper_run(code, data):
    out, err = io.StringIO(), io.StringIO()
    sys.stdin, sys.stdout, sys.stderr = io.StringIO(data), out, err
    status = 0
    try:
        exec(compile(code, "main.py", "exec"), {"__name__": "__main__"})
    except SystemExit as e:
        status = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
        if not isinstance(e.code, (int, type(None))):
            err.write(str(e.code) + "\\\\n")
    except BaseException:
        status = 1
        err.write(traceback.format_exc())
    finally:
        sys.stdin, sys.stdout, sys.stderr = sys.__stdin__, sys.__stdout__, sys.__stderr__
    return [out.getvalue(), err.getvalue(), status]
\`);
  postMessage({ type: "ready" });
  return py;
}).catch((e) => postMessage({ type: "load-error", message: String(e) }));

onmessage = async (e) => {
  const py = await ready;
  const { code, input } = e.data;
  const run = py.globals.get("__pepper_run");
  const res = run(code, input);
  const [stdout, stderr, exitCode] = res.toJs();
  res.destroy();
  run.destroy();
  postMessage({ type: "result", stdout, stderr, exitCode });
};
`;

let pyWorker = null;
let pyReady = null;

function getPythonWorker(onStatus) {
  if (pyWorker) return pyReady;
  onStatus?.("Loading Python in your browser (first run takes a few seconds)…");
  pyWorker = workerFromSource(PY_WORKER);
  pyReady = new Promise((resolve, reject) => {
    pyWorker.addEventListener("message", function onReady(e) {
      if (e.data.type === "ready") {
        pyWorker.removeEventListener("message", onReady);
        resolve(pyWorker);
      } else if (e.data.type === "load-error") {
        reject(new Error("Could not load Python (Pyodide). Check your internet connection. " + e.data.message));
      }
    });
    pyWorker.addEventListener("error", () => reject(new Error("Could not start the Python runtime.")));
  });
  pyReady.catch(() => killPython());
  return pyReady;
}

function killPython() {
  pyWorker?.terminate();
  pyWorker = null;
  pyReady = null;
}

/** Runs one program with one stdin. Resolves {stdout, stderr, exitCode, timeMs, timedOut}. */
async function execOne(language, code, input, limitMs, onStatus) {
  const worker = language === "python" ? await getPythonWorker(onStatus) : workerFromSource(JS_WORKER);
  onStatus?.(null);
  return new Promise((resolve) => {
    const start = performance.now();
    const done = (r) => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMsg);
      if (language !== "python") worker.terminate();
      resolve({ ...r, timeMs: Math.round(performance.now() - start) });
    };
    const onMsg = (e) => {
      if (language === "python" && e.data.type !== "result") return;
      done({ stdout: e.data.stdout, stderr: e.data.stderr, exitCode: e.data.exitCode, timedOut: false });
    };
    const timer = setTimeout(() => {
      // An infinite loop can only be stopped by killing the worker.
      if (language === "python") killPython();
      else worker.terminate();
      done({ stdout: "", stderr: "", exitCode: null, timedOut: true });
    }, limitMs);
    worker.addEventListener("message", onMsg);
    worker.postMessage({ code, input });
  });
}

export async function runInBrowser({ language, code, tests, stopOnFailure = false, onStatus }) {
  if (!BROWSER_LANGUAGES.includes(language)) throw new Error(`${language} needs the local judge.`);
  const limit = TIME_LIMIT_MS[language];
  const list = tests.length ? tests : [{ input: "", expected: null }];
  const results = [];
  for (let i = 0; i < list.length; i++) {
    const { input = "", expected = null } = list[i];
    const r = await execOne(language, code, input, limit, onStatus);
    const result = {
      index: i,
      input,
      expected,
      stdout: r.stdout,
      stderr: r.stderr,
      timeMs: r.timeMs,
      exitCode: r.exitCode,
      diff: null,
    };
    if (r.timedOut) result.verdict = "TLE";
    else if (r.exitCode !== 0) result.verdict = "RE";
    else if (expected === null || expected === undefined || expected === "") result.verdict = "OK";
    else {
      const c = compareOutputs(r.stdout, expected);
      result.verdict = c.passed ? "AC" : "WA";
      result.diff = c.diff;
    }
    results.push(result);
    if (stopOnFailure && !["AC", "OK"].includes(result.verdict)) break;
  }
  const failing = results.find((r) => !["AC", "OK"].includes(r.verdict));
  return {
    compile: { ok: true, output: "" },
    results,
    summary: { verdict: failing ? failing.verdict : "AC", passed: results.filter((r) => r.verdict === "AC").length, total: list.length },
    ranIn: "browser",
  };
}
