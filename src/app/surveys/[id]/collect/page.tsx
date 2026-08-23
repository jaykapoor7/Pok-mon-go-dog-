import { notFound } from "next/navigation";
import { getSurveyById, getSurveyAreas } from "@/lib/surveys";
import { CollectFlow } from "@/components/surveys/CollectFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collect, StrayPaw" };

export default async function CollectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [survey, areas] = await Promise.all([getSurveyById(id), getSurveyAreas(id)]);
  if (!survey) notFound();
  return <CollectFlow survey={survey} areas={areas} />;
}
