import React, { useState } from "react";
import { Link } from "react-router-dom";

export function Spinner({ label = "Loading…", className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-16 text-slate-500 ${className}`}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ title = "Not found", children }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-5xl">🌶️</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-800">{title}</h1>
      <div className="mt-2 text-slate-600">{children}</div>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Back to courses
      </Link>
    </div>
  );
}

const DIFFICULTY = {
  Easy: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Hard: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function DifficultyBadge({ value }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DIFFICULTY[value] || "bg-slate-50 text-slate-600 ring-slate-500/20"}`}>
      {value}
    </span>
  );
}

export function StatusDot({ status }) {
  if (status === "solved")
    return (
      <span title="Solved" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white">
        ✓
      </span>
    );
  if (status === "attempted")
    return <span title="Attempted" className="block h-5 w-5 rounded-full border-2 border-amber-400 bg-amber-50" />;
  return <span title="Not attempted" className="block h-5 w-5 rounded-full border-2 border-slate-200" />;
}

export function ProgressBar({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right text-xs tabular-nums text-slate-500">
        {value}/{total}
      </span>
    </div>
  );
}

export function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={`rounded-md px-2 py-1 text-xs font-medium transition ${copied ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"} ${className}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Kbd({ children }) {
  return <kbd className="rounded border border-slate-300 bg-white px-1 py-px font-mono text-[10px] text-slate-500">{children}</kbd>;
}
