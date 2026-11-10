import type { Metadata } from "next";
import { Services } from "@/oh/pages/Services";
export const metadata: Metadata = { title: "StrayPaw One Health", robots: { index: false } };
export default function Page() { return <Services />; }
