import React from "react";
import { useParams } from "react-router-dom";
import ItemNav, { useNeighbours } from "../components/ItemNav";
import { Breadcrumbs } from "../components/Navbar";
import RichHtml from "../components/RichHtml";
import { ErrorState, Spinner } from "../components/ui";
import YouTube from "../components/YouTube";
import { getArticle, getModule, useLoader } from "../lib/data";

/** Articles (notes) and video lectures. */
export default function LessonPage() {
  const { courseSlug, moduleSlug, itemSlug } = useParams();
  const { data: mod, error, loading } = useLoader(() => getModule(courseSlug, moduleSlug), [courseSlug, moduleSlug]);
  const item = mod?.items.find((i) => i.slug === itemSlug && i.type !== "problem");
  const article = useLoader(
    () => (item?.type === "article" ? getArticle(itemSlug) : Promise.resolve(null)),
    [item?.type, itemSlug]
  );
  const { prev, next } = useNeighbours(mod, item?.type, itemSlug);

  if (loading && !mod) return <Spinner />;
  if (error || (mod && !item)) return <ErrorState title="Lesson not found">This lesson is not in the archive.</ErrorState>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Courses", to: "/" },
          { label: courseSlug.replace(/-/g, " "), to: `/course/${courseSlug}` },
          { label: mod.name, to: `/course/${courseSlug}/${moduleSlug}` },
        ]}
      />
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-700">{item.type === "video" ? "Video lecture" : "Notes"}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{item.name}</h1>

      <div className="mt-6">
        {item.type === "video" && <YouTube id={item.youtubeId} title={item.name} />}
        {item.type === "article" &&
          (article.loading ? (
            <Spinner />
          ) : article.data ? (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <RichHtml html={article.data.html} className="prose-pepper" />
            </article>
          ) : (
            <p className="text-slate-500">This article could not be loaded.</p>
          ))}
      </div>

      <div className="mt-8">
        <ItemNav course={courseSlug} module={moduleSlug} prev={prev} next={next} />
      </div>
    </div>
  );
}
