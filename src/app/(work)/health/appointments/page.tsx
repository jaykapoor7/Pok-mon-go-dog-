import type { Metadata } from "next";
import { Appointments } from "@/nx/pages/Vet";
export const metadata: Metadata = { title: "Appointments, StrayPaw" };
export default function Page() { return <Appointments />; }
