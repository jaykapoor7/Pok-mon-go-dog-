import type { Metadata } from "next";
import { Animals } from "@/nx/pages/Animals";
export const metadata: Metadata = { title: "Animals, StrayPaw" };
export default function Page() { return <Animals />; }
