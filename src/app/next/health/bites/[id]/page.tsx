import type { Metadata } from "next";
import { ExposureRecord } from "@/nx/pages/health/Exposure";
export const metadata: Metadata = { title: "Bite record, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ExposureRecord id={id} />; }
