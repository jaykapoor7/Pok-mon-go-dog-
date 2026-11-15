import type { Metadata } from "next";
import { AnimalRecord } from "@/nx/pages/AnimalRecord";
export const metadata: Metadata = { title: "Animal, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AnimalRecord id={id} />; }
