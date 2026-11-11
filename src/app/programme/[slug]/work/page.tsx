import type { Metadata } from "next";
import { ProgrammeWork } from "@/oh/pages/programme";
export const metadata: Metadata = { title: "Work between partners · StrayPaw", robots: { index: false } };
export default function Page() { return <ProgrammeWork />; }
