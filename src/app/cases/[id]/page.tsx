import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Dog as DogIcon } from "lucide-react";
import { getCaseById } from "@/lib/cases";
import { CASE_CATEGORY_META } from "@/lib/types";
import { timeAgo, formatDate } from "@/lib/utils";
import {
  CaseStatusBadge,
  SeverityBadge,
  OwnershipBadge,
  OverdueBadge,
  VerifiedBadge,
} from "@/components/cases/CaseBadges";
import { CaseControls } from "@/components/cases/CaseControls";
import { CaseTimeline } from "@/components/cases/CaseTimeline";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCaseById(id);
  return { title: data ? `${data.case.title} — StrayPaw` : "Case not found" };
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCaseById(id);
  if (!data) notFound();
  const { case: c, updates } = data;
  const cat = CASE_CATEGORY_META[c.category];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/cases"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> All cases
      </Link>

      {/* header */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bark-900/[0.05] text-xl dark:bg-white/[0.06]">
            {cat.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold leading-tight tracking-tightest">
              {c.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bark-500">
              {c.zone && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {c.zone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Opened {formatDate(c.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <CaseStatusBadge status={c.status} />
          <VerifiedBadge c={c} />
          <OwnershipBadge name={c.assignee_name} />
          <SeverityBadge severity={c.severity} />
          <OverdueBadge c={c} />
          {c.resolution && (
            <span className="chip bg-status-vaccinated/15 font-semibold text-status-vaccinated">
              {c.resolution}
            </span>
          )}
        </div>

        {c.description && (
          <p className="mt-3 text-sm text-bark-700 dark:text-bark-200">
            {c.description}
          </p>
        )}

        {c.dog_id && (
          <Link
            href={`/dog/${c.dog_id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:underline"
          >
            <DogIcon className="h-4 w-4" /> View dog profile
          </Link>
        )}
      </div>

      {/* controls */}
      <section className="mt-5">
        <CaseControls c={c} />
      </section>

      {/* audit trail */}
      <section className="mt-7">
        <h2 className="mb-3 font-display text-lg font-bold tracking-tight">
          Activity
          <span className="ml-2 text-sm font-normal text-bark-400">
            updated {timeAgo(c.last_activity_at)}
          </span>
        </h2>
        <CaseTimeline updates={updates} />
      </section>
    </div>
  );
}
