import type { Metadata } from "next";
import { MissionRoomPage } from "@/nx/pages/Missions";
export const metadata: Metadata = { title: "Mission, Kaju, StrayPaw", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <MissionRoomPage id={/^[0-9a-f-]{36}$/i.test(id) ? id : "00000000-0000-0000-0000-000000000000"} />; }
