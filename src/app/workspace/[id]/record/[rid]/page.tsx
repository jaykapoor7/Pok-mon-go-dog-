import type { Metadata } from "next";
import { WorkspaceRecord } from "@/oh/pages/workspace";
export const metadata: Metadata = { title: "Record · StrayPaw", robots: { index: false } };
export default function Page() { return <WorkspaceRecord />; }
