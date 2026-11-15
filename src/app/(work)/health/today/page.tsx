import type { Metadata } from "next";
import { HealthHome } from "@/nx/pages/Vet";
export const metadata: Metadata = { title: "Today, StrayPaw Healthcare" };
export default function Page() { return <HealthHome />; }
