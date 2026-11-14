import React, { useMemo } from "react";
import { BASE } from "../constants";
import YouTube from "./YouTube";

/**
 * Renders HTML produced by the scraper (already reduced to a safe tag subset).
 * - local image paths are resolved against the site base
 * - <a data-yt="ID"> placeholders become inline video players
 */
export default function RichHtml({ html, className = "", pre = false }) {
  const parts = useMemo(() => {
    if (!html) return [];
    const fixed = html.replace(/src="database\//g, `src="${BASE}/database/`);
    const out = [];
    const re = /<a data-yt="([A-Za-z0-9_-]{11})"[^>]*>.*?<\/a>/g;
    let last = 0;
    let m;
    while ((m = re.exec(fixed))) {
      out.push({ html: fixed.slice(last, m.index) });
      out.push({ yt: m[1] });
      last = re.lastIndex;
    }
    out.push({ html: fixed.slice(last) });
    return out.filter((p) => p.yt || p.html.trim());
  }, [html]);

  return (
    <div className={`rich ${pre ? "whitespace-pre-wrap" : ""} ${className}`}>
      {parts.map((p, i) =>
        p.yt ? (
          <div key={i} className="my-4 max-w-2xl">
            <YouTube id={p.yt} />
          </div>
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
        )
      )}
    </div>
  );
}
