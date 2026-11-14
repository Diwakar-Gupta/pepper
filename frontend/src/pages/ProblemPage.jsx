import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ItemNav, { useNeighbours } from "../components/ItemNav";
import JudgeSetup from "../components/JudgeSetup";
import ConsolePanel from "../components/problem/ConsolePanel";
import { SolutionTab, StatementTab } from "../components/problem/Statement";
import SubmissionsTab from "../components/problem/SubmissionsTab";
import { ErrorState, Kbd, Spinner } from "../components/ui";
import { DEFAULT_TEMPLATES, LANGUAGE_META } from "../constants";
import { useJudge } from "../contexts/JudgeContext";
import { getModule, getProblem, getTestCases, useLoader } from "../lib/data";
import * as judge from "../lib/judge";
import { loadDraft, markProgress, saveDraft, usePersistentState, useProgress } from "../lib/storage";

// Ace is large; load it after the statement is on screen.
const CodeEditor = lazy(() => import("../components/problem/CodeEditor"));
const editorThemes = () => import("../components/problem/CodeEditor").then((m) => m.EDITOR_THEMES);

const LANGUAGE_ORDER = ["java", "cpp", "python", "c", "javascript"];
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function templateFor(problem, lang) {
  return (problem?.templates && problem.templates[lang]) || DEFAULT_TEMPLATES[lang] || "";
}

function EditorSettings({ settings, setSettings }) {
  const [open, setOpen] = useState(false);
  const [themes, setThemes] = useState({});
  useEffect(() => {
    editorThemes().then(setThemes);
  }, []);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-100" title="Editor settings">
        ⚙
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-xl">
          <label className="block">
            <span className="mb-1 block font-medium">Theme</span>
            <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })} className="w-full rounded border border-slate-300 p-1">
              {Object.entries(themes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Font size</span>
            <select value={settings.fontSize} onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })} className="w-full rounded border border-slate-300 p-1">
              {[12, 13, 14, 15, 16, 18, 20].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.autocomplete} onChange={(e) => setSettings({ ...settings, autocomplete: e.target.checked })} />
            Live autocomplete
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.vim} onChange={(e) => setSettings({ ...settings, vim: e.target.checked })} />
            Vim key bindings
          </label>
          <button type="button" onClick={() => setOpen(false)} className="w-full rounded bg-slate-100 py-1 font-medium hover:bg-slate-200">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProblemPage() {
  const { courseSlug, moduleSlug, problemSlug } = useParams();
  const { data: problem, error, loading } = useLoader(() => getProblem(problemSlug), [problemSlug]);
  const { data: mod } = useLoader(() => getModule(courseSlug, moduleSlug).catch(() => null), [courseSlug, moduleSlug]);
  const { prev, next } = useNeighbours(mod, "problem", problemSlug, ["problem"]);
  const progress = useProgress();
  const j = useJudge();

  useEffect(() => j.activate(), [j.activate]);

  // ---- language & code --------------------------------------------------- //
  const languages = useMemo(() => {
    const ids = j.connected ? Object.keys(j.languages) : ["java", "cpp", "python"];
    return LANGUAGE_ORDER.filter((l) => ids.includes(l));
  }, [j.connected, j.languages]);
  const [preferred, setPreferred] = usePersistentState("language", "java");
  const language = languages.includes(preferred) ? preferred : languages[0] || "java";

  const [code, setCode] = useState("");
  useEffect(() => {
    if (!problem) return;
    setCode(loadDraft(problem.slug, language) ?? templateFor(problem, language));
  }, [problem, language]);

  const saveTimer = useRef(null);
  const onCodeChange = (value) => {
    setCode(value);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(problemSlug, language, value), 400);
  };

  const [settings, setSettings] = usePersistentState("editorSettings", { theme: "one_dark", fontSize: 14, autocomplete: true, vim: false });

  // ---- tests ------------------------------------------------------------- //
  const [allTests, setAllTests] = useState(null);
  const [cases, setCases] = useState([{ input: "", expected: "" }]);
  useEffect(() => {
    if (!problem) return;
    setAllTests(null);
    const fallback = [{ input: problem.sampleInput || "", expected: problem.sampleOutput || "" }];
    setCases(fallback);
    getTestCases(problem)
      .then((tests) => {
        setAllTests(tests);
        if (tests.length) setCases([{ input: tests[0].input.replace(/\n$/, ""), expected: tests[0].expected.replace(/\n$/, "") }]);
      })
      .catch(() => setAllTests([]));
  }, [problem]);

  // ---- run / submit ------------------------------------------------------ //
  const [busy, setBusy] = useState(null); // "run" | "submit" | null
  const [outcome, setOutcome] = useState(null);
  const [consoleTab, setConsoleTab] = useState("testcase");
  const [leftTab, setLeftTab] = useState("description");
  const [historyKey, setHistoryKey] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(true);

  useEffect(() => {
    setOutcome(null);
    setConsoleTab("testcase");
    setLeftTab("description");
  }, [problemSlug]);

  const doRun = useCallback(async () => {
    if (!j.connected || busy) return;
    setBusy("run");
    setOutcome(null);
    setConsoleOpen(true);
    setConsoleTab("result");
    try {
      const result = await judge.run({
        language,
        code,
        tests: cases.map((c) => ({ input: c.input, expected: c.expected === "" ? null : c.expected })),
      });
      setOutcome({ kind: "run", result });
    } catch (e) {
      setOutcome({ kind: "run", error: e.message });
    } finally {
      setBusy(null);
    }
  }, [j.connected, busy, language, code, cases]);

  const doSubmit = useCallback(async () => {
    if (!j.connected || busy || !allTests?.length) return;
    setBusy("submit");
    setOutcome(null);
    setConsoleOpen(true);
    setConsoleTab("result");
    try {
      const result = await judge.submit({ problemSlug, language, code, tests: allTests });
      setOutcome({ kind: "submit", result });
      markProgress(problemSlug, result.summary.verdict === "AC" ? "solved" : "attempted");
      setHistoryKey((k) => k + 1);
    } catch (e) {
      setOutcome({ kind: "submit", error: e.message });
    } finally {
      setBusy(null);
    }
  }, [j.connected, busy, allTests, problemSlug, language, code]);

  // Shortcuts that also work when focus is outside the editor.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "Enter") return;
      if (e.target?.closest?.(".ace_editor")) return; // Ace handles its own
      e.preventDefault();
      e.shiftKey ? doSubmit() : doRun();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doRun, doSubmit]);

  if (loading && !problem) return <Spinner />;
  if (error) return <ErrorState title="Problem not found">This problem is not in the archive yet.</ErrorState>;

  const canSubmit = j.connected && allTests && allTests.length > 0;
  const solved = progress[problemSlug] === "solved";
  const mod1 = isMac ? "⌘" : "Ctrl";

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 p-3 lg:h-[calc(100vh-3.5rem)] lg:flex-row">
      {/* ---------------- left: problem ---------------- */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:w-1/2">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3">
          <div className="flex items-center">
            {[
              ["description", "Description"],
              ["solution", "Solution"],
              ["submissions", "Submissions"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLeftTab(key)}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${leftTab === key ? "border-brand-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {solved && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">✓ Solved</span>}
            <div className="hidden sm:block">
              <ItemNav course={courseSlug} module={moduleSlug} prev={prev} next={next} compact />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <Link to={`/course/${courseSlug}/${moduleSlug}`} className="text-xs font-medium text-brand-700 hover:underline">
            ← {mod?.name || "Back to module"}
          </Link>
          <div className="mt-2">
            {leftTab === "description" && <StatementTab problem={problem} />}
            {leftTab === "solution" && <SolutionTab key={problemSlug} problem={problem} />}
            {leftTab === "submissions" && (
              <SubmissionsTab
                problemSlug={problemSlug}
                refreshKey={historyKey}
                onLoadCode={(lang, c) => {
                  setPreferred(lang);
                  saveDraft(problemSlug, lang, c);
                  setCode(c);
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ---------------- right: editor + console ---------------- */}
      <section className="flex min-h-[80vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:w-1/2">
        <div className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-1.5">
          <select
            value={language}
            onChange={(e) => setPreferred(e.target.value)}
            className="rounded-md border-0 bg-slate-700 py-1 pl-2 pr-7 text-sm font-medium text-slate-100 focus:ring-2 focus:ring-brand-400"
            aria-label="Language"
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_META[l]?.label || l}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Replace your code with the starter template?")) {
                  const t = templateFor(problem, language);
                  setCode(t);
                  saveDraft(problemSlug, language, null);
                }
              }}
              className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
              title="Reset to starter code"
            >
              ↺
            </button>
            <EditorSettings settings={settings} setSettings={setSettings} />
          </div>
        </div>

        <div className={`min-h-[300px] ${consoleOpen ? "flex-[3]" : "flex-1"}`}>
          <Suspense fallback={<div className="h-full bg-[#282c34]" />}>
            <CodeEditor language={language} value={code} onChange={onCodeChange} settings={settings} onRun={doRun} onSubmit={doSubmit} />
          </Suspense>
        </div>

        {j.connected ? (
          consoleOpen && (
            <div className="min-h-[220px] flex-[2] border-t border-slate-200">
              <ConsolePanel cases={cases} setCases={setCases} outcome={outcome} busy={busy} tab={consoleTab} setTab={setConsoleTab} />
            </div>
          )
        ) : (
          <div className="max-h-[50%] overflow-y-auto border-t border-slate-200 bg-slate-50 p-4">
            <JudgeSetup />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
          <button type="button" onClick={() => setConsoleOpen((o) => !o)} className="text-xs font-medium text-slate-500 hover:text-slate-800" disabled={!j.connected}>
            Console {consoleOpen ? "▾" : "▴"}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={doRun}
              disabled={!j.connected || !!busy}
              title={`Run sample cases (${mod1}+Enter)`}
              className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "run" ? "Running…" : "Run"}
            </button>
            <button
              type="button"
              onClick={doSubmit}
              disabled={!canSubmit || !!busy}
              title={allTests && !allTests.length ? "No test cases archived for this problem" : `Judge against all tests (${mod1}+Shift+Enter)`}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "submit" ? "Judging…" : "Submit"}
            </button>
          </div>
        </div>
        {j.connected && (
          <p className="hidden border-t border-slate-100 px-3 py-1 text-right text-[11px] text-slate-400 lg:block">
            <Kbd>{mod1}</Kbd> <Kbd>Enter</Kbd> run · <Kbd>{mod1}</Kbd> <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> submit · code is saved in this browser
          </p>
        )}
      </section>
    </div>
  );
}
