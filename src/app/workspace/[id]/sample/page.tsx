import type { Metadata } from "next";
import { WorkspaceSample } from "@/oh/pages/workspace";
export const metadata: Metadata = { title: "Send a sample · StrayPaw", robots: { index: false } };
export default function Page() { return <WorkspaceSample />; }
