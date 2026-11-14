import React, { useState } from "react";

/**
 * Lightweight YouTube embed: shows the thumbnail and only loads the (heavy)
 * player iframe once the user clicks play.
 */
export default function YouTube({ id, title = "Video" }) {
  const [playing, setPlaying] = useState(false);
  if (!id) return null;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
          <span className="absolute left-1/2 top-1/2 flex h-14 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-red-600 shadow-lg transition group-hover:scale-105">
            <span className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white" />
          </span>
        </button>
      )}
    </div>
  );
}
