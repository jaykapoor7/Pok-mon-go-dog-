import { Suspense } from "react";
import { Verification } from "@/sp/abc/Verification";

export const metadata = { title: "Verification, StrayPaw NGO", robots: { index: false, follow: false } };
export default function Page() { return <Suspense fallback={null}><Verification /></Suspense>; }
