// Client for the local judge (judge/pepper_judge.py) at http://127.0.0.1:<port>.
import { DEFAULT_JUDGE_PORT } from "../constants";
import { load } from "./storage";

export const judgePort = () => Number(load("judgePort", DEFAULT_JUDGE_PORT)) || DEFAULT_JUDGE_PORT;
const baseUrl = () => `http://127.0.0.1:${judgePort()}`;

async function call(path, { body, timeoutMs = 60000 } = {}) {
  const res = await fetch(baseUrl() + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Judge returned HTTP ${res.status}`);
  return data;
}

export const health = () => call("/health", { timeoutMs: 2500 });

/** tests: [{input, expected?}] -> {compile, results, summary} */
export const run = ({ language, code, tests }) => call("/run", { body: { language, code, tests } });

export const submit = ({ problemSlug, language, code, tests }) =>
  call("/submit", { body: { problemSlug, language, code, tests }, timeoutMs: 300000 });

export const submissions = (problemSlug) =>
  call(`/submissions?problem=${encodeURIComponent(problemSlug)}`).then((d) => d.submissions);

export const progress = () => call("/progress").then((d) => d.progress);

export const VERDICTS = {
  AC: { label: "Accepted", tone: "green" },
  WA: { label: "Wrong Answer", tone: "red" },
  TLE: { label: "Time Limit Exceeded", tone: "amber" },
  RE: { label: "Runtime Error", tone: "red" },
  CE: { label: "Compilation Error", tone: "red" },
  OK: { label: "Ran", tone: "slate" },
};
