import { DM_Mono, DM_Sans, Instrument_Serif } from "next/font/google";

/* The brand faces, loaded for the app only.

   DESIGN.md has always named DM Sans, Instrument Serif and DM Mono, but no
   route ever loaded them: every screen fell back to the device's system
   face. They are applied here, on the app shell's root, so the product
   finally speaks in its own voice while the landing page — which the brand
   brief says not to touch — keeps rendering exactly as it does today. */
export const sxSans = DM_Sans({ subsets: ["latin"], variable: "--sx-sans", display: "swap", axes: ["opsz"] });
export const sxSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--sx-serif", display: "swap" });
export const sxMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--sx-mono", display: "swap" });

/* One face across the app: DM Sans. The serif and mono stay loaded only
   where something still names them outside the app shell. */
export const SX_FONTS = `${sxSans.variable}`;
