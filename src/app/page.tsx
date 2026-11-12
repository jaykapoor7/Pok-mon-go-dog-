/* ════════════════════════════════════════════════════════════════════
   The homepage: one of two, chosen when the site is built by
   MARKETING_EXPERIENCE (next.config.mjs).

     legacy     ./_home/legacy.tsx, the homepage as it was, unchanged
     cinematic  src/cine/Home.tsx, "The whole world, connected"

   The condition is a constant in the build, so the homepage not chosen,
   with its scripts and styles, is left out of the bundle altogether.
   ════════════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import type { ReactElement } from "react";

type HomeModule = { metadata: Metadata; default: () => ReactElement };

const home: HomeModule = process.env.MARKETING_EXPERIENCE === "cinematic" ? require("@/cine/Home") : require("./_home/legacy");

export const metadata = home.metadata;
export default home.default;
