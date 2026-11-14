import React, { useEffect, useState } from "react";
import { LANGUAGE_META } from "../../constants";
import { useJudge } from "../../contexts/JudgeContext";
import * as judge from "../../lib/judge";

const timeAgo = (iso) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

export default function SubmissionsTab({ problemSlug, refreshKey, onLoadCode }) {
  const { connected } = useJudge();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!connected) return;
    let alive = true;
    judge
      .submissions(problemSlug)
      .then((s) => alive && (setList(s), setError(null)))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [connected, problemSlug, refreshKey]);

  if (!connected) return <p className="text-sm text-slate-500">Your submissions are stored by the local judge. Start it to see your history.</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!list) return <p className="text-sm text-slate-500">Loading…</p>;
  if (list.length === 0) return <p className="text-sm text-slate-500">No submissions yet. Press Submit to judge your code against all test cases.</p>;

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
      {list.map((s) => {
        const ok = s.verdict === "AC";
        return (
          <li key={s.id} className="text-sm">
            <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
              <span className={`w-36 font-medium ${ok ? "text-emerald-600" : "text-rose-600"}`}>{judge.VERDICTS[s.verdict]?.label || s.verdict}</span>
              <span className="flex-1 text-slate-600">{LANGUAGE_META[s.language]?.label || s.language}</span>
              <span className="tabular-nums text-xs text-slate-500">
                {s.passed}/{s.total}
              </span>
              <span className="w-20 text-right text-xs text-slate-400">{timeAgo(s.createdAt)}</span>
            </button>
            {open === s.id && (
              <div className="space-y-2 bg-slate-50 px-3 pb-3">
                <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[12px] text-slate-100">{s.code}</pre>
                <button
                  type="button"
                  onClick={() => onLoadCode(s.language, s.code)}
                  className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
                >
                  Load into editor
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
