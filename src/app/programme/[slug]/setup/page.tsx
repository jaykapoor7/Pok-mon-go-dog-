import type { Metadata } from "next";
import { ProgrammeSetup } from "@/oh/pages/programme";
export const metadata: Metadata = { title: "Programme setup, StrayPaw", robots: { index: false } };
export default function Page() { return <ProgrammeSetup />; }
