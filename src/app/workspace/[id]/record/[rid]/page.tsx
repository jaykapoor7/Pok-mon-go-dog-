import type { Metadata } from "next";
import { RecordPage } from "@/oh/pages/RecordPage";
export const metadata: Metadata = { title: "StrayPaw One Health", robots: { index: false } };
export default function Page() { return <RecordPage />; }
