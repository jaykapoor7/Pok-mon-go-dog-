import type { Metadata } from "next";
import { ProgrammeServices } from "@/oh/pages/Programme";
export const metadata: Metadata = { title: "StrayPaw One Health", robots: { index: false } };
export default function Page() { return <ProgrammeServices />; }
