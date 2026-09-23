import type { Metadata } from "next";
import { SystemCoverageTest } from "@/components/lab/system/spatial/CoverageTest";

export const metadata: Metadata = { title: "3D coverage test — StrayPaw system, lab" };

export default function CoverageTestPage() {
  return <SystemCoverageTest />;
}
