import type { Metadata } from "next";
import { VetFollowups } from "@/nx/pages/Vet";
export const metadata: Metadata = { title: "Follow-ups, StrayPaw" };
export default function Page() { return <VetFollowups />; }
