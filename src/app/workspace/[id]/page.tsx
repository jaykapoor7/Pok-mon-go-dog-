import type { Metadata } from "next";
import { WorkspaceHome } from "@/oh/pages/workspace";
export const metadata: Metadata = { title: "Today · StrayPaw", robots: { index: false } };
export default function Page() { return <WorkspaceHome />; }
