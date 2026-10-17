import { DM_Mono, DM_Sans, Instrument_Serif } from "next/font/google";

/* The three brand faces, for StrayPaw 2.0 surfaces only. */
const sans = DM_Sans({ subsets: ["latin"], variable: "--sp-sans-f", display: "swap", axes: ["opsz"] });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--sp-serif-f", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--sp-mono-f", display: "swap" });

export const spFonts = `${sans.variable} ${serif.variable} ${mono.variable}`;
