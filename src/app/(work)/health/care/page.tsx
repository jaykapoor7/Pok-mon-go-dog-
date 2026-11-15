import type { Metadata } from "next";
import { ClinicalCare } from "@/nx/pages/Vet";
export const metadata: Metadata = { title: "Clinical care, StrayPaw" };
export default function Page() { return <ClinicalCare />; }
