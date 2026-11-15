import type { Metadata } from "next";
import { PersonalSettings } from "@/nx/pages/ngo/Settings";
export const metadata: Metadata = { title: "Your settings, StrayPaw" };
export default function Page() { return <PersonalSettings />; }
