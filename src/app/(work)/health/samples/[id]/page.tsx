import type { Metadata } from "next";
import { SampleRecord } from "@/nx/pages/health/Lab";
export const metadata: Metadata = { title: "Sample, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SampleRecord id={id} />; }
