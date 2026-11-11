import type { Metadata } from "next";
import { WorkspaceServices } from "@/oh/pages/workspace";
export const metadata: Metadata = { title: "Services · StrayPaw", robots: { index: false } };
export default function Page() { return <WorkspaceServices />; }
