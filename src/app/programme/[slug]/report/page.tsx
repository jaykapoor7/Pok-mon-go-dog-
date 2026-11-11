import type { Metadata } from "next";
import { ProgrammeReport } from "@/oh/pages/programme";
export const metadata: Metadata = { title: "Programme report, StrayPaw", robots: { index: false } };
export default function Page() { return <ProgrammeReport />; }
