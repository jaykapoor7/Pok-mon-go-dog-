import type { Metadata } from "next";
import { NewExposure } from "@/oh/pages/NewExposure";
export const metadata: Metadata = { title: "StrayPaw One Health", robots: { index: false } };
export default function Page() { return <NewExposure />; }
