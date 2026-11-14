import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { REPO_URL } from "../constants";
import { useJudge } from "../contexts/JudgeContext";
import JudgeSetup from "./JudgeSetup";

function JudgeStatus() {
  const { status, version, languages, recheck } = useJudge();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const view = {
    connected: { dot: "bg-emerald-500", text: "Judge connected" },
    checking: { dot: "bg-amber-400 animate-pulse", text: "Looking for judge…" },
    offline: { dot: "bg-slate-300", text: "Judge offline" },
    idle: { dot: "bg-slate-300", text: "Connect judge" },
  }[status];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (status === "idle") recheck();
        }}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300"
      >
        <span className={`h-2 w-2 rounded-full ${view.dot}`} />
        <span className="hidden sm:inline">{view.text}</span>
        <span className="sm:hidden">Judge</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          {status === "connected" ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-slate-900">Local judge v{version} is running</p>
              <div>
                <p className="mb-1 text-xs text-slate-500">Languages found on this computer</p>
                <ul className="space-y-1">
                  {Object.entries(languages).map(([id, l]) => (
                    <li key={id} className="flex justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-700">{l.name}</span>
                      <span className="truncate text-slate-500">{l.version}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-slate-500">Install another compiler and restart the judge to add it.</p>
            </div>
          ) : (
            <JudgeSetup compact />
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-lg">🌶️</span>
          <span className="text-lg tracking-tight">Pepper</span>
        </Link>
        <div className="flex items-center gap-3">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="hidden text-sm text-slate-500 hover:text-slate-800 sm:block">
            GitHub
          </a>
          <JudgeStatus />
        </div>
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-slate-500">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-slate-300">/</span>}
          {it.to ? (
            <Link to={it.to} className="truncate hover:text-slate-800">
              {it.label}
            </Link>
          ) : (
            <span className="truncate text-slate-700">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
