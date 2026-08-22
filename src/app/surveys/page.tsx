import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import { getSurveys } from "@/lib/surveys";
import { speciesLabel } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { SurveyCreate } from "@/components/surveys/SurveyCreate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Surveys & census — StrayPaw" };

export default async function SurveysPage() {
  const surveys = await getSurveys();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-4 border-b border-black/[0.08] pb-4 dark:border-white/[0.1]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Surveys &amp; census</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">Structured field counts across wards, villages and districts.</p>
        </div>
        <SurveyCreate />
      </header>

      {surveys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/[0.1] py-16 text-center dark:border-white/[0.12]">
          <ClipboardList className="mx-auto h-6 w-6 text-bark-300" />
          <p className="mt-2 text-sm text-bark-400">No surveys yet.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {surveys.map((s) => (
            <li key={s.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
              <Link href={`/surveys/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-bark-900 dark:text-bark-50">{s.title}</p>
                  <p className="mt-0.5 text-[12px] text-bark-400">
                    {speciesLabel(s.species)} census · started {formatDate(s.created_at)}
                    {s.status !== "active" ? " · closed" : ""}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-bark-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
