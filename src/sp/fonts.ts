import { DM_Mono, DM_Sans, Instrument_Serif, Kalam, Tiro_Devanagari_Hindi } from "next/font/google";

/* The brand faces, for StrayPaw 2.0 surfaces only. Tiro Devanagari Hindi is
   the serif's companion for Hindi (place names, bilingual Academy material);
   it loads only where a `.hi` element asks for it. */
const sans = DM_Sans({ subsets: ["latin"], variable: "--sp-sans-f", display: "swap", axes: ["opsz"] });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--sp-serif-f", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--sp-mono-f", display: "swap" });

const deva = Tiro_Devanagari_Hindi({ subsets: ["devanagari"], weight: "400", style: ["normal", "italic"], variable: "--sp-deva-f", display: "swap", preload: false });

/* Kalam: an Indian handwriting face (Latin and Devanagari) for the Map's
   lettering only: cities, localities and regions, as a map-maker letters a sheet. */
const hand = Kalam({ subsets: ["latin", "devanagari"], weight: ["400", "700"], variable: "--sp-hand-f", display: "swap" });

export const spFonts = `${sans.variable} ${serif.variable} ${mono.variable} ${deva.variable} ${hand.variable}`;
