import React, { useEffect, useState } from "react";
import { VERDICTS } from "../../lib/judge";

const TONES = {
  green: "text-emerald-600",
  red: "text-rose-600",
  amber: "text-amber-600",
  slate: "text-slate-700",
};

function Box({ label, children, tone = "plain" }) {
  const styles = {
    plain: "bg-slate-50 text-slate-800 border-slate-200",
    error: "bg-rose-50 text-rose-800 border-rose-200",
    diff: "bg-amber-50 text-slate-800 border-amber-200",
  };
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <pre className={`max-h-48 overflow-auto rounded-lg border p-2.5 font-mono text-[12.5px] leading-relaxed ${styles[tone]}`}>
        {children === "" || children === null || children === undefined ? <span className="text-slate-400">(empty)</span> : children}
      </pre>
    </div>
  );
}

function DiffView({ diff }) {
  return diff.split("\n").map((line, i) => {
    const cls = line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")
      ? "text-slate-400"
      : line.startsWith("+")
        ? "bg-rose-100 text-rose-800"
        : line.startsWith("-")
          ? "bg-emerald-100 text-emerald-800"
          : "";
    return (
      <div key={i} className={cls}>
        {line || " "}
      </div>
    );
  });
}

function CaseTabs({ count, active, setActive, verdicts, onAdd, onRemove }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => {
        const v = verdicts?.[i];
        const dot = v ? (v === "AC" || v === "OK" ? "bg-emerald-500" : "bg-rose-500") : null;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`group flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${active === i ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
            Case {i + 1}
            {onRemove && count > 1 && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                className="hidden text-slate-400 hover:text-rose-600 group-hover:inline"
                title="Remove case"
              >
                ×
              </span>
            )}
          </button>
        );
      })}
      {onAdd && (
        <button type="button" onClick={onAdd} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" title="Add a test case">
          + Add
        </button>
      )}
    </div>
  );
}

function ResultView({ outcome }) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [outcome]);

  if (outcome.error) return <Box label="Error" tone="error">{outcome.error}</Box>;
  const { result, kind } = outcome;
  const { summary, compile, results } = result;
  const v = VERDICTS[summary.verdict] || VERDICTS.OK;
  const allOk = results.length > 0 && results.every((r) => r.verdict === "OK");
  const headline = kind === "run" && allOk ? "Finished" : v.label;
  const maxTime = results.reduce((m, r) => Math.max(m, r.timeMs || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-lg font-semibold ${TONES[allOk && kind === "run" ? "slate" : v.tone]}`}>{headline}</span>
        {summary.verdict !== "CE" && (
          <span className="text-xs text-slate-500">
            {kind === "submit" ? `${summary.passed} / ${summary.total} test cases passed` : `${results.length} case${results.length === 1 ? "" : "s"}`}
            {results.length > 0 && ` · ${maxTime} ms`}
          </span>
        )}
      </div>

      {!compile.ok && <Box label="Compiler output" tone="error">{compile.output}</Box>}
      {compile.ok && compile.output && <Box label="Compiler warnings">{compile.output}</Box>}

      {kind === "submit" && summary.verdict === "AC" && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">🎉 All test cases passed. Problem marked as solved.</p>
      )}

      {results.length > 0 && (
        <>
          {kind === "submit" ? (
            results[results.length - 1].verdict !== "AC" && (
              <p className="text-xs text-slate-500">Showing the first failing test case (#{results[results.length - 1].index + 1}).</p>
            )
          ) : (
            <CaseTabs count={results.length} active={active} setActive={setActive} verdicts={results.map((r) => r.verdict)} />
          )}
          {(() => {
            const r = kind === "submit" ? results[results.length - 1] : results[active];
            if (!r || (kind === "submit" && r.verdict === "AC")) return null;
            const rv = VERDICTS[r.verdict];
            return (
              <div className="space-y-3">
                {kind === "run" && !["OK", "AC"].includes(r.verdict) && (
                  <p className={`text-sm font-medium ${TONES[rv.tone]}`}>
                    {rv.label} · {r.timeMs} ms
                  </p>
                )}
                <Box label="Input">{r.input}</Box>
                <Box label="Your output">{r.stdout}</Box>
                {r.expected !== null && r.expected !== undefined && r.expected !== "" && <Box label="Expected output">{r.expected}</Box>}
                {r.diff && (
                  <Box label="Difference (green = expected, red = yours)" tone="diff">
                    <DiffView diff={r.diff} />
                  </Box>
                )}
                {r.stderr && <Box label="Error output (stderr)" tone="error">{r.stderr}</Box>}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

export default function ConsolePanel({ cases, setCases, outcome, busy, tab, setTab }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (active >= cases.length) setActive(Math.max(0, cases.length - 1));
  }, [cases.length, active]);

  const update = (field, value) => setCases(cases.map((c, i) => (i === active ? { ...c, [field]: value } : c)));
  const current = cases[active] || { input: "", expected: "" };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-slate-200 px-3">
        {[
          ["testcase", "Testcase"],
          ["result", "Result"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === key ? "border-brand-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {label}
            {key === "result" && busy && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 align-middle" />}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "testcase" ? (
          <div className="space-y-3">
            <CaseTabs
              count={cases.length}
              active={active}
              setActive={setActive}
              onAdd={() => {
                setCases([...cases, { input: "", expected: "" }]);
                setActive(cases.length);
              }}
              onRemove={(i) => setCases(cases.filter((_, j) => j !== i))}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Input</p>
              <textarea
                value={current.input}
                onChange={(e) => update("input", e.target.value)}
                spellCheck={false}
                rows={4}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[12.5px] outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Expected output (optional)</p>
              <textarea
                value={current.expected}
                onChange={(e) => update("expected", e.target.value)}
                spellCheck={false}
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[12.5px] outline-none focus:border-brand-400 focus:bg-white"
              />
            </div>
          </div>
        ) : busy && !outcome ? (
          <p className="py-6 text-center text-sm text-slate-500">Running…</p>
        ) : outcome ? (
          <ResultView outcome={outcome} />
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">Run your code to see results here.</p>
        )}
      </div>
    </div>
  );
}
