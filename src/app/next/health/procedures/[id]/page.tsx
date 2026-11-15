import type { Metadata } from "next";
import { ProcedureSignOff } from "@/nx/pages/health/Procedure";
export const metadata: Metadata = { title: "Procedure sign-off, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ProcedureSignOff id={id} />; }
