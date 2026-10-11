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
    <Link href={`/fundraisers/${f.id}`} className={`fr-card${f.featured ? " is-pick" : ""}`}>
      <div className="fr-media">
        {f.cover_photo && <DogPhoto src={f.cover_photo} alt={f.title} seed={f.id} sensitive />}
        {f.featured && (
          <span className="fr-pick"><BadgeCheck size={13} aria-hidden /> StrayPaw pick</span>
        )}
      </div>
      <div className="fr-body">
        <div className="fr-meta">
          <span className="fr-chip">{cat.label}</span>
          {f.created_by_name && <span>{f.created_by_name}</span>}
        </div>
        <h3 className="fr-title">{f.title}</h3>

        {f.goal_amount != null && (
          <>
            {pct != null && (
              <div className="fr-bar" role="img" aria-label={`${pct}% of goal raised`}>
                <div className="fr-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="fr-fig">
              {f.raised_reported != null && <b>{formatINR(f.raised_reported)} raised</b>}
              {f.raised_reported != null ? " · " : ""}
              goal {formatINR(f.goal_amount)}
            </p>
          </>
        )}

        <div className="fr-foot">
          <span className="fr-donate">Donate &rarr;</span>
          {f.deadline && (
            <span className="fr-by"><Clock size={13} aria-hidden /> by {timeAgo(f.deadline)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
