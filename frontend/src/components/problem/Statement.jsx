import React, { useState } from "react";
import RichHtml from "../RichHtml";
import { CopyButton, DifficultyBadge } from "../ui";
import YouTube from "../YouTube";

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function Sample({ title, text }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{title}</span>
      </div>
      <div className="group relative">
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[13px] leading-relaxed text-slate-100">{text || " "}</pre>
        <CopyButton text={text || ""} className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100" />
      </div>
    </div>
  );
}

export function StatementTab({ problem }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{problem.name}</h1>
        <DifficultyBadge value={problem.difficulty} />
      </div>

      {problem.legacyDescription ? (
        <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{problem.legacyDescription}</div>
      ) : (
        <>
          <RichHtml html={problem.statement} pre className="statement mt-4 text-[15px] leading-relaxed text-slate-700" />
          {problem.inputFormat && (
            <Section title="Input format">
              <RichHtml html={problem.inputFormat} pre className="statement text-sm text-slate-700" />
            </Section>
          )}
          {problem.outputFormat && (
            <Section title="Output format">
              <RichHtml html={problem.outputFormat} pre className="statement text-sm text-slate-700" />
            </Section>
          )}
          {problem.constraints && (
            <Section title="Constraints">
              <RichHtml html={problem.constraints} pre className="statement font-mono text-[13px] text-slate-700" />
            </Section>
          )}
          {(problem.sampleInput !== undefined || problem.sampleOutput !== undefined) && (
            <Section title="Example">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Sample title="Input" text={problem.sampleInput} />
                <Sample title="Output" text={problem.sampleOutput} />
              </div>
            </Section>
          )}
        </>
      )}

      {problem.questionVideo && (
        <Section title="Question video">
          <YouTube id={problem.questionVideo} title={`${problem.name} – question`} />
        </Section>
      )}
    </div>
  );
}

export function SolutionTab({ problem }) {
  const [revealed, setRevealed] = useState(false);
  if (!problem.editorial && !problem.solutionVideo)
    return <p className="text-sm text-slate-500">No editorial or solution video was archived for this problem.</p>;

  if (!revealed)
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">Try first, check the solution later.</p>
        <p className="mt-1">Thinking through a problem yourself is where the learning happens. Come back here after a real attempt.</p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-4 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
        >
          Show solution
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      {problem.solutionVideo && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Solution video</h3>
          <YouTube id={problem.solutionVideo} title={`${problem.name} – solution`} />
        </div>
      )}
      {problem.editorial && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Editorial</h3>
          <RichHtml html={problem.editorial} className="prose-pepper" />
        </div>
      )}
    </div>
  );
}
