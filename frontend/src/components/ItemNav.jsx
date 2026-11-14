import React from "react";
import { Link } from "react-router-dom";
import { itemPath } from "../pages/ModulePage";

/** Previous / next links within a module. `types` limits which items are stepped through. */
export function useNeighbours(mod, type, slug, types) {
  if (!mod) return {};
  const list = mod.items.filter((i) => !i.unavailable && (!types || types.includes(i.type)));
  const idx = list.findIndex((i) => i.type === type && i.slug === slug);
  return { prev: idx > 0 ? list[idx - 1] : null, next: idx >= 0 ? list[idx + 1] : null, index: idx, total: list.length };
}

export default function ItemNav({ course, module, prev, next, compact = false }) {
  const cls = compact
    ? "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900"
    : "max-w-[48%] truncate rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:border-brand-300 hover:text-brand-700";
  return (
    <div className={`flex items-center ${compact ? "gap-1" : "justify-between gap-3"}`}>
      {prev ? (
        <Link to={itemPath(course, module, prev)} className={cls} title={prev.name}>
          ← {compact ? "Prev" : prev.name}
        </Link>
      ) : (
        !compact && <span />
      )}
      {next ? (
        <Link to={itemPath(course, module, next)} className={cls} title={next.name}>
          {compact ? "Next" : next.name} →
        </Link>
      ) : null}
    </div>
  );
}
