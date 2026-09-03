import Link from "next/link";
import { Clock, BadgeCheck } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { formatINR } from "@/lib/fundraisers";
import { timeAgo } from "@/lib/utils";
import { fundraiserCategory, type Fundraiser } from "@/lib/types";

export function FundraiserCard({ f }: { f: Fundraiser }) {
  const cat = fundraiserCategory(f.category);
  const pct =
    f.goal_amount && f.raised_reported
      ? Math.min(100, Math.round((f.raised_reported / f.goal_amount) * 100))
      : null;

  return (
    <Link
      href={`/fundraisers/${f.id}`}
      className={`card card-interactive block overflow-hidden ${
        f.featured ? "ring-1 ring-paw-300 dark:ring-paw-500/40" : ""
      }`}
    >
      <div className="relative">
        {f.cover_photo && (
          <DogPhoto src={f.cover_photo} alt={f.title} seed={f.id} className="h-40 w-full" />
        )}
        {f.featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-paw-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-warm">
            <BadgeCheck className="h-3.5 w-3.5" /> StrayPaw pick
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip bg-paw-100 font-semibold text-paw-700">
            {cat.emoji} {cat.label}
          </span>
          {f.created_by_name && <span className="text-bark-500">{f.created_by_name}</span>}
        </div>
        <h3 className="font-display text-base leading-snug tracking-tight">{f.title}</h3>

        {f.goal_amount != null && (
          <div className="mt-3">
            {pct != null && (
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800">
                <div className="h-full rounded-full bg-paw-500" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="text-xs text-bark-500">
              {f.raised_reported != null && (
                <span className="font-semibold text-bark-800 dark:text-bark-100">
                  {formatINR(f.raised_reported)} raised
                </span>
              )}
              {f.raised_reported != null ? " · " : ""}
              goal {formatINR(f.goal_amount)}
            </p>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-paw-600">Donate →</span>
          {f.deadline && (
            <span className="flex items-center gap-1 text-xs text-bark-400">
              <Clock className="h-3.5 w-3.5" /> by {timeAgo(f.deadline)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
