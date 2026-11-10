import type { Metadata } from "next";
import { Today } from "@/oh/pages/Today";
export const metadata: Metadata = { title: "Today · StrayPaw One Health", robots: { index: false } };
export default function Page() { return <Today />; }
