import type { Metadata } from "next";
import { ProgrammeCoverage } from "@/oh/pages/programme";
export const metadata: Metadata = { title: "Dog vaccination, StrayPaw", robots: { index: false } };
export default function Page() { return <ProgrammeCoverage />; }
