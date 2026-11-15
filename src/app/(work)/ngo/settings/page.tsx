import type { Metadata } from "next";
import { enabledFlags } from "@/lib/flags";
import { Settings } from "@/nx/pages/ngo/Settings";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings, StrayPaw" };
/* The flags are read on the server, where the deployment's own list lives, and passed down as names only. */
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <Settings tab={tab ?? null} flags={[...enabledFlags()]} />;
}
