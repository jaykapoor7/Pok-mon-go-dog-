import { DEMO_SITE } from "./demo-site";

/* The demonstration site presents a group's proposed product, not StrayPaw: neutral names for the product and its
   assistant, set by NEXT_PUBLIC_DEMO_BRAND and NEXT_PUBLIC_DEMO_ASSISTANT. Visible text in the source is renamed
   when a demo build compiles (scripts/demo-brand-loader.cjs, same defaults); this module covers what the code
   decides at run time (the mark, text that arrives from the database). Production keeps StrayPaw and Kaju. */
export const DEMO_BRAND = process.env.NEXT_PUBLIC_DEMO_BRAND?.trim() || "One Health Response";
export const DEMO_AIDE = process.env.NEXT_PUBLIC_DEMO_ASSISTANT?.trim() || "Assistant";
/** Two letters for the small mark: the first letters of the product's first two words. */
export const DEMO_MARK = DEMO_BRAND.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "OH";
export const REBRAND = DEMO_SITE;
const WORD = /\b(StrayPaw|Kaju)\b/g;
/** The demo's words for text that arrives at run time; unchanged in production. */
export const rebrand = (s: string) => (REBRAND ? s.replace(WORD, (m) => (m === "Kaju" ? DEMO_AIDE : DEMO_BRAND)) : s);
const AIDE_AT = new RegExp(`@${DEMO_AIDE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
/** A message that asks the assistant: "@Kaju", or on the demo its own name. */
export const asksAssistant = (t: string) => /@kaju\b/i.test(t) || (REBRAND && AIDE_AT.test(t));
