import { DM_Mono, DM_Sans, Instrument_Serif, Tiro_Devanagari_Hindi } from "next/font/google";

/* The brand faces, for StrayPaw 2.0 surfaces only. Tiro Devanagari Hindi is
   the serif's companion for Hindi (place names, bilingual Academy material);
   it loads only where a `.hi` element asks for it. */
const sans = DM_Sans({ subsets: ["latin"], variable: "--sp-sans-f", display: "swap", axes: ["opsz"] });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--sp-serif-f", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--sp-mono-f", display: "swap" });

const deva = Tiro_Devanagari_Hindi({ subsets: ["devanagari"], weight: "400", style: ["normal", "italic"], variable: "--sp-deva-f", display: "swap", preload: false });

export const spFonts = `${sans.variable} ${serif.variable} ${mono.variable} ${deva.variable}`;
