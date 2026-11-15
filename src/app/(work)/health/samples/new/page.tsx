import type { Metadata } from "next";
import { NewSample, type SampleQuery } from "@/nx/pages/health/Lab";
export const metadata: Metadata = { title: "Send a sample, StrayPaw" };
export default async function Page({ searchParams }: { searchParams: Promise<SampleQuery> }) { return <NewSample q={await searchParams} />; }
