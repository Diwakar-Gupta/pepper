import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/Navbar";
import { ErrorState, ProgressBar, Spinner } from "../components/ui";
import { getCourse, getModule, useLoader } from "../lib/data";
import { useProgress } from "../lib/storage";

export default function CoursePage() {
  const { courseSlug } = useParams();
  const { data: course, error, loading } = useLoader(() => getCourse(courseSlug), [courseSlug]);
  const progress = useProgress();
  const [moduleProblems, setModuleProblems] = useState({});

  // Load module item lists in the background for per-module progress.
  useEffect(() => {
    if (!course) return;
    course.categories.forEach((cat) =>
      cat.modules.forEach((m) =>
        getModule(courseSlug, m.slug)
          .then((mod) =>
            setModuleProblems((prev) => ({
              ...prev,
              [m.slug]: mod.items.filter((i) => i.type === "problem" && !i.unavailable).map((i) => i.slug),
            }))
          )
          .catch(() => {})
      )
    );
  }, [course, courseSlug]);

  if (loading && !course) return <Spinner />;
  if (error) return <ErrorState title="Course not found">We could not find “{courseSlug}”.</ErrorState>;

  let moduleNo = 0;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Courses", to: "/" }, { label: course.name }]} />
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{course.name}</h1>
      {course.description && <p className="mt-2 max-w-3xl text-slate-600">{course.description}</p>}

      <div className="mt-8 space-y-10">
        {course.categories.map((cat) => (
          <section key={cat.name}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{cat.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cat.modules.map((m) => {
                moduleNo++;
                const slugs = moduleProblems[m.slug];
                const solved = slugs ? slugs.filter((s) => progress[s] === "solved").length : 0;
                const counts = m.counts || {};
                return (
                  <Link
                    key={m.slug}
                    to={`/course/${courseSlug}/${m.slug}`}
                    className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-700">
                      {moduleNo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 group-hover:text-brand-700">{m.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[
                          counts.problems && `${counts.problems} problems`,
                          counts.videos && `${counts.videos} videos`,
                          counts.articles && `${counts.articles} articles`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || " "}
                      </p>
                      {slugs && slugs.length > 0 && (
                        <div className="mt-2">
                          <ProgressBar value={solved} total={slugs.length} />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
