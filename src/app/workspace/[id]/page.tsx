import type { Metadata } from "next";
import { WorkspaceHome } from "@/oh/pages/WorkspaceHome";
export const metadata: Metadata = { title: "StrayPaw One Health", robots: { index: false } };
export default function Page() { return <WorkspaceHome />; }
