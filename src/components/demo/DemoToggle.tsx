"use client";

import { Sparkles } from "lucide-react";
import { useDemoMode } from "./DemoModeProvider";
import { cn } from "@/lib/utils";

/** Shared Demo on/off pill — usable anywhere (map, Today, etc.). */
export function DemoToggle({ className }: { className?: string }) {
  const { demoOn, toggle } = useDemoMode();
  return (
    <button
      onClick={toggle}
      aria-pressed={demoOn}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-pop backdrop-blur-md transition-colors",
        demoOn
          ? "bg-paw-500 text-white"
          : "bg-white/90 text-bark-700 dark:bg-bark-900/85 dark:text-bark-100",
        className
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Demo
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          demoOn
            ? "bg-white/25 text-white"
            : "bg-bark-900/10 text-bark-500 dark:bg-white/15 dark:text-bark-200"
        )}
      >
        {demoOn ? "ON" : "OFF"}
      </span>
    </button>
  );
}
