import type { Metadata } from "next";
import { Patients } from "@/nx/pages/Vet";
export const metadata: Metadata = { title: "Patients, StrayPaw" };
export default function Page() { return <Patients />; }
