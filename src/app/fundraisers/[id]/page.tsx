import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Clock, ShieldCheck } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { FundraiserOwnerControls } from "@/components/fundraisers/FundraiserOwnerControls";
import { getFundraiserById, formatINR } from "@/lib/fundraisers";
import { fundraiserCategory } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFundraiserById(id);
  if (!f) return { title: "Fundraiser not found — StrayPaw" };
  return {
    title: `${f.title} — Fundraiser | StrayPaw`,
    description: f.story?.slice(0, 150) ?? `Support ${f.created_by_name ?? "a rescue"} on StrayPaw.`,
    ...(f.cover_photo ? { openGraph: { images: [f.cover_photo] } } : {}),
  };
}

export default async function FundraiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFundraiserById(id);
  if (!f || f.status !== "active") notFound();

  const cat = fundraiserCategory(f.category);
  const pct =
    f.goal_amount && f.raised_reported
      ? Math.min(100, Math.round((f.raised_reported / f.goal_amount) * 100))
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/fundraisers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Fundraisers
      </Link>

      {f.cover_photo && (
        <DogPhoto src={f.cover_photo} alt={f.title} seed={f.id} className="aspect-video w-full rounded-3xl" />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-paw-100 font-semibold text-paw-700">
          {cat.emoji} {cat.label}
        </span>
        {f.created_by_name && (
          <span className="inline-flex items-center gap-1 font-semibold text-status-sterilised">
            <ShieldCheck className="h-3.5 w-3.5" /> {f.created_by_name}
          </span>
        )}
      </div>

      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tightest">{f.title}</h1>

      {f.goal_amount != null && (
        <div className="mt-4">
          {pct != null && (
            <div className="mb-1.5 h-2.5 overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800">
              <div className="h-full rounded-full bg-paw-500" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-sm text-bark-600 dark:text-bark-300">
            {f.raised_reported != null && (
              <span className="font-bold text-bark-900 dark:text-bark-50">
                {formatINR(f.raised_reported)}
              </span>
            )}
            {f.raised_reported != null ? " raised of " : "Goal: "}
            <span className="font-semibold">{formatINR(f.goal_amount)}</span>
            {f.raised_reported != null && " goal"}
          </p>
        </div>
      )}

      {f.deadline && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-bark-500">
          <Clock className="h-4 w-4" /> Needed by {formatDate(f.deadline)}
        </p>
      )}

      {f.story && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-bark-700 dark:text-bark-200">
          {f.story}
        </p>
      )}

      {/* Donate — links out to the NGO's own channel */}
      <a
        href={f.donate_url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="btn-primary mt-6 w-full py-4 text-base"
      >
        Donate to {f.created_by_name ?? "this rescue"} <ExternalLink className="h-4 w-4" />
      </a>
      <p className="mt-2 text-center text-xs text-bark-400">
        Opens the NGO&apos;s own donation page. StrayPaw doesn&apos;t process or hold the
        payment — your money goes directly to them.
      </p>

      <FundraiserOwnerControls fundraiser={f} />
    </div>
  );
}
