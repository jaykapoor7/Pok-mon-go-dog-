import type { Metadata } from "next";
import { SystemSpatial } from "@/components/lab/system/spatial";

export const metadata: Metadata = { title: "Spatial intelligence — StrayPaw system, lab" };

export default async function SpatialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const one = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  return <SystemSpatial animal={one("animal")} view={one("view")} mode={one("mode")} />;
}
