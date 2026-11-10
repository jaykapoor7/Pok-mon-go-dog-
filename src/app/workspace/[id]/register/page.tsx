import type { Metadata } from "next";
import { Register } from "@/oh/pages/Register";
export const metadata: Metadata = { title: "StrayPaw One Health", robots: { index: false } };
export default function Page() { return <Register />; }
