import { notFound } from "next/navigation";
import { getSurveyById, getSurveyAreas } from "@/lib/surveys";
import { SurveyDetail } from "@/components/surveys/SurveyDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSurveyById(id);
  return { title: s ? `${s.title} — StrayPaw` : "Survey not found" };
}

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [survey, areas] = await Promise.all([getSurveyById(id), getSurveyAreas(id)]);
  if (!survey) notFound();
  return <SurveyDetail survey={survey} areas={areas} />;
}
