import type { Metadata } from "next";
import { GovProgrammes } from "@/nx/pages/Gov";
export const metadata: Metadata = { title: "Programmes, StrayPaw" };
export default function Page() { return <GovProgrammes />; }
