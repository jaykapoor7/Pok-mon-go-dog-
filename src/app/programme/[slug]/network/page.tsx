import type { Metadata } from "next";
import { ProgrammeNetwork } from "@/oh/pages/programme";
export const metadata: Metadata = { title: "Care network · StrayPaw", robots: { index: false } };
export default function Page() { return <ProgrammeNetwork />; }
