import type { Metadata } from "next";
import { Referrals } from "@/nx/pages/health/Referrals";
export const metadata: Metadata = { title: "Referrals, StrayPaw" };
export default function Page() { return <Referrals />; }
