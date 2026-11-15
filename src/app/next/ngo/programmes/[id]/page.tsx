import type { Metadata } from "next";
import { DriveRecord } from "@/nx/pages/ngo/DriveRecord";
export const metadata: Metadata = { title: "Drive, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <DriveRecord id={id} />; }
