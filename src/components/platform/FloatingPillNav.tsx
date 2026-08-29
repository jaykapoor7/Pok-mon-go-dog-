"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PillSection {
  id: string;
  label: string;
}

export function FloatingPillNav({ sections }: { sections: PillSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  useEffect(() => {
    const pill = barRef.current?.querySelector(`[data-pill="${active}"]`);
    if (pill) pill.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <nav
      ref={barRef}
      className="sticky top-14 z-40 -mx-4 flex gap-1.5 overflow-x-auto border-b border-black/[0.06] bg-paper/90 px-4 py-2 backdrop-blur-md no-scrollbar sm:-mx-6 sm:px-6 dark:border-white/[0.08] dark:bg-ink/90"
    >
      {sections.map((s) => (
        <button
          key={s.id}
          data-pill={s.id}
          onClick={() => scrollTo(s.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
            active === s.id
              ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900"
              : "text-bark-500 hover:bg-bark-100 hover:text-bark-700 dark:text-bark-400 dark:hover:bg-bark-800 dark:hover:text-bark-200",
          )}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
