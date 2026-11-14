// Facts about where the app is running.

/** Set by the judge when it serves this site itself (http://127.0.0.1:<port>/pepper/). */
export const servedByJudge = typeof window !== "undefined" && Boolean(window.__PEPPER_JUDGE__);

/** Desktop Safari (Chrome, Edge, Firefox, Brave and Opera all include their own token). */
export const isSafari = (() => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/(Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Brave|Android)/.test(ua);
})();

/**
 * Safari refuses requests from an https page to http://127.0.0.1 ("mixed content"),
 * so the judge can't be reached from the GitHub Pages site there.
 */
export const judgeBlockedByBrowser = isSafari && !servedByJudge && window.location.protocol === "https:";
