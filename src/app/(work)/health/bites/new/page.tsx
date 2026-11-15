import type { Metadata } from "next";
import { NewBite, type BiteQuery } from "@/nx/pages/health/NewBite";
export const metadata: Metadata = { title: "Record a bite, StrayPaw" };
export default async function Page({ searchParams }: { searchParams: Promise<BiteQuery> }) { return <NewBite q={await searchParams} />; }
