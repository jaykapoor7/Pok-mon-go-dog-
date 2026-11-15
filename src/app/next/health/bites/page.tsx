import type { Metadata } from "next";
import { Bites } from "@/nx/pages/Health";
export const metadata: Metadata = { title: "Bite cases, StrayPaw Healthcare" };
export default function Page() { return <Bites />; }
