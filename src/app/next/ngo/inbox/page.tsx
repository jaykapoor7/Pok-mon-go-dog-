import type { Metadata } from "next";
import { Inbox } from "@/nx/pages/Inbox";
export const metadata: Metadata = { title: "Inbox, StrayPaw" };
export default function Page() { return <Inbox />; }
