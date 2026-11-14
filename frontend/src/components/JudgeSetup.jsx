import React, { useState } from "react";
import { JUDGE_SCRIPT_URL, REPO_URL } from "../constants";
import { useJudge } from "../contexts/JudgeContext";
import { CopyButton } from "./ui";

const detectOs = () => {
  const p = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
  return p.includes("win") ? "windows" : "unix";
};

const COMMANDS = {
  unix: { label: "macOS / Linux", hint: "Terminal", cmd: `curl -fsSL ${JUDGE_SCRIPT_URL} | python3 -` },
  windows: { label: "Windows", hint: "PowerShell", cmd: `(irm ${JUDGE_SCRIPT_URL}) | python -` },
};

/** Instructions for starting the local judge. `compact` is used inside the navbar popover. */
export default function JudgeSetup({ compact = false }) {
  const [os, setOs] = useState(detectOs);
  const { status, recheck, port } = useJudge();
  const c = COMMANDS[os];

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div>
          <h3 className="text-base font-semibold text-slate-900">Start the judge to run your code</h3>
          <p className="mt-1 text-sm text-slate-600">
            Code runs on your own computer using the compilers you already have (Java, C++, Python, C, Node.js). Needs only
            Python 3.8+, nothing to install.
          </p>
        </div>
      )}

      <div>
        <div className="mb-2 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
          {Object.entries(COMMANDS).map(([key, v]) => (
            <button
              key={key}
              type="button"
              onClick={() => setOs(key)}
              className={`flex-1 rounded-md px-2 py-1 transition ${os === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="mb-1.5 text-xs text-slate-500">1. Paste this in {c.hint} and keep it running:</p>
        <div className="flex items-start gap-2 rounded-lg bg-slate-900 p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-[12px] leading-relaxed text-emerald-300">{c.cmd}</code>
          <CopyButton text={c.cmd} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          2. This page connects by itself within a few seconds
          {status === "checking" ? " (checking…)" : ""}.{" "}
          <button type="button" onClick={recheck} className="font-medium text-brand-700 hover:underline">
            Check now
          </button>
        </p>
      </div>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer select-none font-medium text-slate-600">Not connecting?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            If your browser asks to let this site access apps on your device / local network, click <b>Allow</b>.
          </li>
          <li>The judge must say “Listening on http://127.0.0.1:{port}”. Another app using that port? Run with <code>--port 6000</code> and set the same port below.</li>
          <li>Safari may block connections to your own computer from https pages; Chrome, Edge and Firefox work. You can also run the site locally (see README).</li>
          <li>
            Prefer to read the script first?{" "}
            <a className="text-brand-700 hover:underline" href={`${REPO_URL}/blob/main/judge/pepper_judge.py`} target="_blank" rel="noreferrer">
              View it on GitHub
            </a>
            , save it, then run <code>python3 pepper_judge.py</code>.
          </li>
        </ul>
        <PortSetting />
      </details>
    </div>
  );
}

function PortSetting() {
  const { port } = useJudge();
  const [value, setValue] = useState(String(port));
  return (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value);
        if (n > 0 && n < 65536) {
          try {
            window.localStorage.setItem("pepper:judgePort", JSON.stringify(n));
          } catch {}
          window.location.reload();
        }
      }}
    >
      <label className="text-slate-600" htmlFor="judge-port">
        Judge port
      </label>
      <input
        id="judge-port"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        className="w-20 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
      />
      <button className="rounded bg-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-300">Save</button>
    </form>
  );
}
