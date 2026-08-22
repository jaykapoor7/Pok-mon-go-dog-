import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { getCases } from "@/lib/cases";
import { speciesLabel, type Case } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Medical — StrayPaw Partner" };

// Focused on animal-welfare medical work — treatment, vaccination, deworming,
// wound care — surfaced from cases, not a generic hospital EHR.
const MEDICAL_CATEGORIES = new Set(["injury", "vaccination", "sterilisation"]);
const isMedical = (c: Case) => !!c.medical_notes || MEDICAL_CATEGORIES.has(c.category);

export default async function PartnerMedicalPage() {
  const cases = await getCases();
  const medical = cases.filter(isMedical).sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at));

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Medical</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">Treatment, vaccination, deworming and wound care across your cases.</p>
      </header>

      {medical.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-16 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">
          No medical activity yet. Record treatment on a case&apos;s Medical tab.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {medical.map((c) => (
            <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
              <Link href={`/partner/cases/${c.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-bark-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{c.title}</p>
                  <p className="truncate text-[12px] text-bark-400">{speciesLabel(c.species)} · <span className="capitalize">{c.category}</span></p>
                  {c.medical_notes && <p className="mt-1 line-clamp-2 text-[13px] text-bark-600 dark:text-bark-300">{c.medical_notes}</p>}
                </div>
                <span className="shrink-0 text-[12px] tabular-nums text-bark-400">{timeAgo(c.last_activity_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
