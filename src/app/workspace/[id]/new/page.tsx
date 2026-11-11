import type { Metadata } from "next";
import { WorkspaceNew } from "@/oh/pages/workspace";
export const metadata: Metadata = { title: "Record a bite, StrayPaw", robots: { index: false } };
export default function Page() { return <WorkspaceNew />; }
