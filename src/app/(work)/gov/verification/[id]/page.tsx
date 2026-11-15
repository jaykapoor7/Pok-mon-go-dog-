import type { Metadata } from "next";
import { PackageReview } from "@/nx/pages/gov/Review";
export const metadata: Metadata = { title: "Package review, StrayPaw" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PackageReview id={id} />; }
