import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/Navbar";
import { DifficultyBadge, ErrorState, ProgressBar, Spinner, StatusDot } from "../components/ui";
import { getCourse, getModule, useLoader } from "../lib/data";
import { usePersistentState, useProgress } from "../lib/storage";

const FILTERS = [
  ["all", "All"],
  ["problem", "Problems"],
  ["video", "Videos"],
  ["article", "Articles"],
];

export const itemPath = (course, mod, item) =>
  item.type === "problem" ? `/course/${course}/${mod}/${item.slug}` : `/course/${course}/${mod}/learn/${item.slug}`;

function TypeIcon({ type }) {
  const map = {
    video: ["▶", "bg-red-50 text-red-600"],
    article: ["¶", "bg-sky-50 text-sky-600"],
    problem: ["</>", "bg-violet-50 text-violet-600"],
  };
  const [glyph, cls] = map[type] || map.article;
  return <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-md text-[11px] font-bold ${cls}`}>{glyph}</span>;
}

export default function ModulePage() {
  const { courseSlug, moduleSlug } = useParams();
  const { data, error, loading } = useLoader(
    () => Promise.all([getModule(courseSlug, moduleSlug), getCourse(courseSlug).catch(() => null)]),
    [courseSlug, moduleSlug]
  );
  const progress = useProgress();
  const [filter, setFilter] = usePersistentState("moduleFilter", "all");
  const [query, setQuery] = useState("");

  const [mod, course] = data || [];
  const items = useMemo(() => {
    if (!mod) return [];
    const q = query.trim().toLowerCase();
    return mod.items.filter((i) => (filter === "all" || i.type === filter) && (!q || i.name.toLowerCase().includes(q)));
  }, [mod, filter, query]);

  if (loading && !mod) return <Spinner />;
  if (error) return <ErrorState title="Module not found">We could not find “{moduleSlug}”.</ErrorState>;

  const problems = mod.items.filter((i) => i.type === "problem" && !i.unavailable);
  const solved = problems.filter((p) => progress[p.slug] === "solved").length;
  const nextUp = problems.find((p) => progress[p.slug] !== "solved");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Courses", to: "/" }, { label: course?.name || courseSlug, to: `/course/${courseSlug}` }, { label: mod.name }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold capitalize tracking-tight text-slate-900">{mod.name}</h1>
          {problems.length > 0 && (
            <div className="mt-3 w-64">
              <ProgressBar value={solved} total={problems.length} />
            </div>
          )}
        </div>
        {nextUp && (
          <Link
            to={itemPath(courseSlug, moduleSlug, nextUp)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            {solved ? "Continue" : "Start"}: {nextUp.name} →
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-sm">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1 transition ${filter === key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this module…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {items.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nothing matches.</li>}
        {items.map((item) => {
          const content = (
            <>
              <TypeIcon type={item.type} />
              <span className={`min-w-0 flex-1 truncate ${item.unavailable ? "text-slate-400" : "text-slate-800"}`}>{item.name}</span>
              {item.unavailable && <span className="text-xs text-slate-400">not archived</span>}
              {item.type === "problem" && <DifficultyBadge value={item.difficulty} />}
              {item.type === "problem" && !item.unavailable && <StatusDot status={progress[item.slug]} />}
            </>
          );
          return (
            <li key={`${item.type}:${item.slug}`}>
              {item.unavailable ? (
                <div className="flex items-center gap-3 px-4 py-3 text-sm">{content}</div>
              ) : (
                <Link to={itemPath(courseSlug, moduleSlug, item)} className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-50">
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
