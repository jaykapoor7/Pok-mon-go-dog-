import type { Metadata } from "next";
import { SendSample } from "@/oh/pages/SendSample";
export const metadata: Metadata = { title: "StrayPaw One Health", robots: { index: false } };
export default function Page() { return <SendSample />; }
