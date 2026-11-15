import type { Metadata } from "next";
import { HealthToday } from "@/nx/pages/Health";
export const metadata: Metadata = { title: "Today, StrayPaw Healthcare" };
export default function Page() { return <HealthToday />; }
