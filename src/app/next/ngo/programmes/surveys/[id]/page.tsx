import type { Metadata } from "next";
import { SurveyRecord } from "@/nx/pages/ngo/SurveyRecord";
export const metadata: Metadata = { title: "Survey, StrayPaw" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ collect?: string }> }) {
  const [{ id }, { collect }] = await Promise.all([params, searchParams]);
  return <SurveyRecord id={id} collect={collect === "1"} />;
}
