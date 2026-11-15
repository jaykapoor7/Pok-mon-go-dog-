import type { Metadata } from "next";
import { PackageRecord } from "@/nx/pages/ngo/PackageRecord";
export const metadata: Metadata = { title: "Package, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PackageRecord id={id} />; }
