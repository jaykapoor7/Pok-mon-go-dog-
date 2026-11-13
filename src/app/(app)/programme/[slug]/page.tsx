import type { Metadata } from "next";
import { ProgrammeOverview } from "@/oh/pages/programme";
export const metadata: Metadata = { title: "Programme, StrayPaw", robots: { index: false } };
export default function Page() { return <ProgrammeOverview />; }
