"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { SectionLabel } from "@/components/platform/viz";
import { SourceBadge } from "@/components/platform/DataBadge";
import { RESEARCH, RESEARCH_TOPICS } from "@/lib/platform/research";
import { SOURCE_META, type SourceType } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

const TYPES: SourceType[] = ["government", "research", "ngo"];

export function ResearchClient() {
  const [topic, setTopic] = useState<string | null>(null);
  const [type, setType] = useState<SourceType | null>(null);

  const rows = useMemo(
    () => RESEARCH.filter((r) => (!topic || r.topics.includes(topic)) && (!type || r.type === type)),
    [topic, type]
  );

  return (
    <div>
      <header className="max-w-3xl">
        <SectionLabel>Research</SectionLabel>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">The evidence base.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
          A curated index of government, research and NGO sources on street dogs, rabies and Animal Birth Control in India. These are pointers to primary sources - always verify figures at the source.
        </p>
      </header>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button onClick={() => setType(null)} className={cn("rounded-full border px-3 py-1.5 text-[13px] font-medium", !type ? "border-bark-900 bg-bark-900 text-white dark:border-white dark:bg-white dark:text-bark-900" : "border-black/[0.1] text-bark-600 dark:border-white/[0.14] dark:text-bark-300")}>All types</button>
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType((v) => (v === t ? null : t))} className={cn("rounded-full border px-3 py-1.5 text-[13px] font-medium", type === t ? "border-bark-900 bg-bark-900 text-white dark:border-white dark:bg-white dark:text-bark-900" : "border-black/[0.1] text-bark-600 dark:border-white/[0.14] dark:text-bark-300")}>{SOURCE_META[t].label}</button>
        ))}
        <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />
        {RESEARCH_TOPICS.map((t) => (
          <button key={t} onClick={() => setTopic((v) => (v === t ? null : t))} className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium capitalize", topic === t ? "bg-paw-500 text-white" : "text-bark-500 hover:bg-black/[0.04] dark:text-bark-400")}>{t}</button>
        ))}
      </div>

      <div className="mt-6 divide-y divide-black/[0.07] overflow-hidden rounded border border-black/[0.08] dark:divide-white/[0.06] dark:border-white/[0.1]">
        {rows.map((r) => (
          <article key={r.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-bark-400">
              <SourceBadge type={r.type} />
              <span>· {r.geography}</span>
              <span>· {r.year}</span>
            </div>
            <h2 className="mt-2 font-display text-lg leading-snug tracking-tight">
              {r.url ? (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-paw-600">{r.title} <ExternalLink className="inline h-4 w-4 align-baseline text-bark-300" /></a>
              ) : r.title}
            </h2>
            <p className="mt-0.5 text-[13px] font-medium text-bark-500">{r.org}</p>
            <p className="mt-2 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{r.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.topics.map((t) => <span key={t} className="rounded-full bg-bark-100 px-2 py-0.5 text-[11.5px] capitalize text-bark-500 dark:bg-bark-800">{t}</span>)}
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-bark-400">Have a dataset or study to add? It can be normalised into Explore and cited here.</p>
    </div>
  );
}
