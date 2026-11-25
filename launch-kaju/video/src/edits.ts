import type { Edit } from "./types";

/* Every file in edits/ is a film. Drop one in and its compositions appear: nothing to register.
   edits/dev/ holds engine test edits; they are only loaded when REMOTION_KAJU_DEV=1. */
declare const process: { env: Record<string, string | undefined> };
declare const require: { context(dir: string, deep: boolean, match: RegExp): { keys(): string[]; (k: string): { default: Edit } } };
const load = (ctx: ReturnType<typeof require.context>) => ctx.keys().filter((k) => !k.endsWith(".d.ts")).map((k) => ctx(k).default).filter(Boolean);
export const EDITS: Edit[] = [
  ...load(require.context("../edits", false, /\.(ts|json)$/)),
  ...(process.env.REMOTION_KAJU_DEV === "1" ? load(require.context("../edits/dev", false, /\.(ts|json)$/)) : []),
].sort((a, b) => a.slug.localeCompare(b.slug));
