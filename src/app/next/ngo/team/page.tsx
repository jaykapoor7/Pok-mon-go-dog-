import type { Metadata } from "next";
import { Team } from "@/nx/pages/ngo/Team";
export const metadata: Metadata = { title: "Team, StrayPaw" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) { const { tab } = await searchParams; return <Team tab={tab ?? null} />; }
