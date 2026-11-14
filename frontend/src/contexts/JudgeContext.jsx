import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as judge from "../lib/judge";
import { load, mergeProgress, save } from "../lib/storage";

/**
 * Detects the local judge by polling http://127.0.0.1:<port>/health.
 *
 * Probing is "activated" lazily (first visit to a problem page, or after the
 * judge has been seen once) so visitors who never run the judge are not shown
 * a browser "local network access" prompt on the home page.
 */
const JudgeContext = createContext(null);

export const useJudge = () => useContext(JudgeContext);

export function JudgeProvider({ children }) {
  const [status, setStatus] = useState("idle"); // idle | checking | connected | offline
  const [info, setInfo] = useState(null);
  const [active, setActive] = useState(() => Boolean(load("judgeSeen", false)));
  const timer = useRef(null);
  const failures = useRef(0);

  const check = useCallback(async () => {
    clearTimeout(timer.current);
    setStatus((s) => (s === "connected" ? s : "checking"));
    let ok = false;
    try {
      const data = await judge.health();
      ok = data && data.name === "pepper-judge";
      if (ok) {
        setInfo(data);
        setStatus("connected");
        failures.current = 0;
        save("judgeSeen", true);
        judge.progress().then(mergeProgress).catch(() => {});
      }
    } catch {
      /* not running */
    }
    if (!ok) {
      failures.current++;
      setInfo(null);
      setStatus("offline");
    }
    // Poll quickly while waiting for the user to start the judge, slower once connected.
    const delay = ok ? 15000 : Math.min(3000 * failures.current, 15000);
    timer.current = setTimeout(() => {
      if (document.visibilityState === "visible") check();
      else timer.current = setTimeout(check, 30000);
    }, delay);
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    check();
    const onFocus = () => {
      failures.current = 0;
      check();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [active, check]);

  const activate = useCallback(() => setActive(true), []);
  const recheck = useCallback(() => {
    failures.current = 0;
    if (!active) setActive(true);
    else check();
  }, [active, check]);

  const value = {
    status,
    connected: status === "connected",
    languages: info ? info.languages : {},
    version: info ? info.version : null,
    port: judge.judgePort(),
    activate,
    recheck,
  };
  return <JudgeContext.Provider value={value}>{children}</JudgeContext.Provider>;
}
