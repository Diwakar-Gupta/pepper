// localStorage helpers. Every access is guarded: private windows or blocked
// storage must never break the page.
import { useEffect, useState } from "react";

const PREFIX = "pepper:";

export function load(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    if (value === undefined || value === null) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/** useState that persists to localStorage. */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => load(key, initial));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue];
}

// ---- code drafts ---------------------------------------------------------- //

export const draftKey = (slug, lang) => `code:${slug}:${lang}`;
export const loadDraft = (slug, lang) => load(draftKey(slug, lang));
export const saveDraft = (slug, lang, code) => save(draftKey(slug, lang), code);

// ---- progress (works even without the judge) ------------------------------ //

const listeners = new Set();

export function getProgress() {
  return load("progress", {});
}

/** status: "solved" | "attempted". "solved" is never downgraded. */
export function markProgress(slug, status) {
  const progress = getProgress();
  if (progress[slug] === "solved" && status !== "solved") return;
  progress[slug] = status;
  save("progress", progress);
  listeners.forEach((fn) => fn(progress));
}

/** Merge progress reported by the judge (its database is the long-term record). */
export function mergeProgress(remote) {
  const progress = getProgress();
  let changed = false;
  for (const [slug, status] of Object.entries(remote || {})) {
    if (progress[slug] !== "solved" && progress[slug] !== status) {
      progress[slug] = status;
      changed = true;
    }
  }
  if (changed) {
    save("progress", progress);
    listeners.forEach((fn) => fn(progress));
  }
}

export function useProgress() {
  const [progress, setProgress] = useState(getProgress);
  useEffect(() => {
    const fn = (p) => setProgress({ ...p });
    listeners.add(fn);
    const onStorage = (e) => e.key === PREFIX + "progress" && fn(getProgress());
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return progress;
}
