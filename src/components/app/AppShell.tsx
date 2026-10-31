"use client";

import type { ReactNode } from "react";
import { Shell } from "@/sp/shell/Shell";
import { SX_FONTS } from "@/components/shell/fonts";
import "./app.css";
/* Content layers still used by pages that were built for the 2.0 console
   (fundraisers, surveys, report-content, policy pages in the app frame).
   Their component classes keep working inside the 3.0 shell. */
import "./editorial.css";
import "./desk.css";
import "./institution.css";
import "./street-os.css";
import "@/components/shell/paper.css";
import "@/components/shell/record.css";
import "@/components/shell/calm.css";

/* ════════════════════════════════════════════════════════════════════
   The 2.0 console shell, retired in StrayPaw 3.0.

   Every page that still mounts <AppShell> now renders inside the one 3.0
   application shell (sidebar, top bar, StrayPaw AI). The `sx sd` scope is
   kept on an inner wrapper so the page's own content styles still apply;
   the old chrome (ink bar, sidebar, folk ground) is gone.
   ════════════════════════════════════════════════════════════════════ */
export function AppShell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return (
    <Shell flush={flush}>
      <div className={`sx sd spa-scope sx-legacy ${SX_FONTS}`}>{children}</div>
    </Shell>
  );
}
