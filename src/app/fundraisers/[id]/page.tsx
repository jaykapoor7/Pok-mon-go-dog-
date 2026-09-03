import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Clock, ShieldCheck, Wallet, CheckCircle2, Megaphone, ClipboardList } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { Logo } from "@/components/brand/Logo";
import { VerifiedBadge } from "@/components/org/VerifiedBadge";
import { FundraiserOwnerControls } from "@/components/fundraisers/FundraiserOwnerControls";
import { getFundraiserById, getFundraiserUpdates, formatINR } from "@/lib/fundraisers";
import { getOrgById } from "@/lib/data";
import { fundraiserCategory } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFundraiserById(id);
  if (!f) return { title: "Fundraiser not found, StrayPaw" };
  return {
    title: `${f.title}, Fundraiser | StrayPaw`,
    description: f.story?.slice(0, 150) ?? `Support ${f.created_by_name ?? "a rescue"} on StrayPaw.`,
    ...(f.cover_photo ? { openGraph: { images: [f.cover_photo] } } : {}),
  };
}

export default async function FundraiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await getFundraiserById(id);
  if (!f || (f.status !== "active" && f.status !== "closed")) notFound();

  const [org, updates] = await Promise.all([
    f.ngo_id ? getOrgById(f.ngo_id) : Promise.resolve(null),
    getFundraiserUpdates(f.id),
  ]);

  const cat = fundraiserCategory(f.category);
  const pct =
    f.goal_amount && f.raised_reported
      ? Math.min(100, Math.round((f.raised_reported / f.goal_amount) * 100))
      : null;
  const budgetTotal = f.budget.reduce((s, l) => s + (l.amount || 0), 0);

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6">
      <Link
        href="/fundraisers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Fundraisers
      </Link>

      {f.cover_photo && (
        <DogPhoto src={f.cover_photo} alt={f.title} seed={f.id} className="aspect-video w-full rounded" />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-paw-100 font-semibold text-paw-700">
          {cat.emoji} {cat.label}
        </span>
        {f.featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-paw-500 px-2.5 py-1 font-bold text-white">
            <ShieldCheck className="h-3.5 w-3.5" /> StrayPaw pick
          </span>
        )}
        {f.created_by_name && (
          <span className="font-semibold text-bark-600 dark:text-bark-300">{f.created_by_name}</span>
        )}
      </div>

      <h1 className="mt-2 font-display text-2xl tracking-tightest">{f.title}</h1>

      {/* Who's running this, the credibility link */}
      {org && (
        <Link
          href={`/org/${org.slug ?? org.id}`}
          className="mt-3 flex items-center gap-3 rounded border border-black/[0.06] bg-white p-3 dark:border-white/10 dark:bg-bark-900"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded border border-black/[0.06] bg-white dark:border-white/10 dark:bg-bark-900">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
            ) : (
              <Logo size="sm" showWordmark={false} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-bark-900 dark:text-bark-50">{org.name}</p>
            <p className="text-xs text-bark-500">View organization</p>
          </div>
          <VerifiedBadge verified={org.verified} size="sm" />
        </Link>
      )}

      {f.status === "closed" && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-bark-100 px-3 py-1 text-xs font-semibold text-bark-500 dark:bg-bark-800">
          This campaign has closed
        </p>
      )}

      {f.case_id && (
        <Link href={`/cases/${f.case_id}`} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-paw-600 hover:underline">
          <ClipboardList className="h-4 w-4" /> View the case this funds
        </Link>
      )}

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

      {/* Use of funds, the transparency a funder looks for */}
      {f.budget.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-tightest">
            <Wallet className="h-4 w-4 text-paw-600" /> Use of funds
          </h2>
          <div className="mt-3 overflow-hidden rounded border border-black/[0.06] dark:border-white/10">
            {f.budget.map((line, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-black/[0.05] px-4 py-3 text-sm last:border-0 dark:border-white/10"
              >
                <span className="text-bark-700 dark:text-bark-200">{line.label}</span>
                <span className="font-semibold text-bark-900 dark:text-bark-50">{formatINR(line.amount)}</span>
              </div>
            ))}
            {budgetTotal > 0 && (
              <div className="flex items-center justify-between gap-3 bg-bark-50 px-4 py-3 text-sm font-bold dark:bg-bark-800">
                <span>Total</span>
                <span>{formatINR(budgetTotal)}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Outcome, shown once the org reports it */}
      {f.outcome && (
        <section className="mt-6 rounded border border-status-vaccinated/30 bg-status-vaccinated/10 p-4">
          <h2 className="flex items-center gap-2 font-display text-base tracking-tight text-status-vaccinated">
            <CheckCircle2 className="h-4 w-4" /> Outcome
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-bark-700 dark:text-bark-200">
            {f.outcome}
          </p>
        </section>
      )}

      {/* Updates, the running story supporters follow */}
      {updates.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-tightest">
            <Megaphone className="h-4 w-4 text-paw-600" /> Updates
          </h2>
          <div className="mt-3 space-y-4 border-l-2 border-black/[0.06] pl-4 dark:border-white/10">
            {updates.map((u) => (
              <div key={u.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-paw-500" />
                <p className="text-xs text-bark-400">{formatDate(u.created_at)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-bark-700 dark:text-bark-200">
                  {u.body}
                </p>
                {u.photo_url && (
                  <DogPhoto src={u.photo_url} alt="update" seed={u.id} className="mt-2 aspect-video w-full rounded" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Donate, links out to the NGO's own channel */}
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
        payment, your money goes directly to them.
      </p>

      <FundraiserOwnerControls fundraiser={f} />
    </div>
  );
}
