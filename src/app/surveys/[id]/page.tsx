import { PrivateSurvey } from "@/components/surveys/PrivateSurvey";
export const metadata = { title: "Survey, StrayPaw", robots: { index: false, follow: false } };
export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params; return <PrivateSurvey id={id} />;
}
