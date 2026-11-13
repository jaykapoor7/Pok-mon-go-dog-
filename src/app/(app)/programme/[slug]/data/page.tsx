import type { Metadata } from "next";
import { ProgrammeData } from "@/oh/pages/programme";
export const metadata: Metadata = { title: "Research data, StrayPaw", robots: { index: false } };
export default function Page() { return <ProgrammeData />; }
