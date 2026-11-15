import type { Metadata } from "next";
import { StewardRequests } from "@/nx/pages/DataRequests";
export const metadata: Metadata = { title: "Data requests, StrayPaw" };
export default function Page() { return <StewardRequests />; }
