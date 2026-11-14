import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import JudgeSetup from "../components/JudgeSetup";
import { ErrorState, ProgressBar, Spinner } from "../components/ui";
import { REPO_URL } from "../constants";
import { useJudge } from "../contexts/JudgeContext";
import { getCourses, getModule, getCourse, useLoader } from "../lib/data";
import { useProgress } from "../lib/storage";

/** Slugs of every problem in a course, loaded lazily for the progress bar. */
function useCourseProblemSlugs(courseSlug) {
  const [slugs, setSlugs] = useState(null);
  useEffect(() => {
    let alive = true;
    getCourse(courseSlug)
      .then((c) =>
        Promise.all(c.categories.flatMap((cat) => cat.modules.map((m) => getModule(courseSlug, m.slug).catch(() => null))))
      )
      .then((mods) => {
        if (!alive) return;
        setSlugs(mods.filter(Boolean).flatMap((m) => m.items.filter((i) => i.type === "problem").map((i) => i.slug)));
      })
      .catch(() => alive && setSlugs([]));
    return () => {
      alive = false;
    };
  }, [courseSlug]);
  return slugs;
}

function CourseCard({ course, index }) {
  const progress = useProgress();
  const slugs = useCourseProblemSlugs(course.slug);
  const solved = slugs ? slugs.filter((s) => progress[s] === "solved").length : 0;
  const counts = course.counts || {};
  const accents = ["from-orange-500 to-rose-500", "from-violet-500 to-indigo-500", "from-sky-500 to-emerald-500"];

  return (
    <Link
      to={`/course/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`h-2 bg-gradient-to-r ${accents[index % accents.length]}`} />
      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">{course.name}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{course.description}</p>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Problems", counts.problems],
            ["Articles", counts.articles],
            ["Videos", counts.videos],
          ].map(([label, n]) => (
            <div key={label} className="rounded-lg bg-slate-50 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums text-slate-800">{n ?? "–"}</dd>
            </div>
          ))}
        </dl>
        {slugs && slugs.length > 0 && (
          <div className="mt-4">
            <ProgressBar value={solved} total={slugs.length} />
          </div>
        )}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data: courses, error, loading } = useLoader(getCourses, []);
  const { connected } = useJudge();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Free · Open source · No sign-up</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Learn data structures &amp; algorithms, one problem at a time.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          The complete Pepcoding curriculum, preserved: video lectures, notes, and hundreds of problems you can solve right
          in your browser. Your code runs on your own computer, so it is fast and private.
        </p>
      </section>

      <section className="mt-10">
        {loading && <Spinner />}
        {error && <ErrorState title="Could not load courses">{String(error.message)}</ErrorState>}
        {courses && (
          <div className="grid gap-6 md:grid-cols-3">
            {courses.map((c, i) => (
              <CourseCard key={c.slug} course={c} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-14 grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
          <ol className="mt-4 space-y-4 text-sm text-slate-600">
            {[
              ["Pick a problem", "Watch the question video, read the statement, write code in the editor."],
              ["Run it locally", "A tiny judge on your laptop compiles and runs your code against the test cases."],
              ["Track progress", "Solved problems get a ✓. History is saved on your machine, not on a server."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                  {i + 1}
                </span>
                <span>
                  <b className="text-slate-800">{t}.</b> {d}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-slate-500">
            Content restored from the Internet Archive. Found a mistake?{" "}
            <a href={REPO_URL} className="font-medium text-brand-700 hover:underline" target="_blank" rel="noreferrer">
              Contribute on GitHub
            </a>
            .
          </p>
        </div>
        <div>
          {connected ? (
            <div className="flex h-full flex-col justify-center rounded-xl bg-emerald-50 p-6 text-emerald-800">
              <p className="text-lg font-semibold">✓ Your judge is connected</p>
              <p className="mt-1 text-sm">Open any problem and press Run.</p>
            </div>
          ) : (
            <JudgeSetup />
          )}
        </div>
      </section>
    </div>
  );
}
