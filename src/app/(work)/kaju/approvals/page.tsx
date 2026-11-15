import type { Metadata } from "next";
import { Missions } from "@/nx/pages/Missions";
export const metadata: Metadata = { title: "Approvals, Kaju, StrayPaw" };
export default function Page() { return <Missions view="approvals" />; }
