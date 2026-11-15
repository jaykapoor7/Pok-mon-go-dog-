import type { Metadata } from "next";
import { JoinRequests } from "@/nx/pages/JoinRequests";
export const metadata: Metadata = { title: "Requests to join, StrayPaw" };
export default function Page() { return <JoinRequests />; }
