import type { Metadata } from "next";
import { Channel } from "@/nx/pages/Channel";
export const metadata: Metadata = { title: "Channel, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ name: string }> }) { const { name } = await params; return <Channel name={decodeURIComponent(name).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "general"} />; }
