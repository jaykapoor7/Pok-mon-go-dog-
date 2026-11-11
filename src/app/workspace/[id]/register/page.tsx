import type { Metadata } from "next";
import { WorkspaceRegister } from "@/oh/pages/workspace";
export const metadata: Metadata = { title: "Bite register · StrayPaw", robots: { index: false } };
export default function Page() { return <WorkspaceRegister />; }
