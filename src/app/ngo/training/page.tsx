import { notFound } from "next/navigation";
import { flagOn } from "@/lib/flags";
import { Training } from "@/sp/ngo/training/Training";

export const dynamic = "force-dynamic";
export const metadata = { title: "Training, StrayPaw", robots: { index: false, follow: false } };
export default function TrainingPage() {
  if (!flagOn("training_lms")) notFound();
  return <Training />;
}
