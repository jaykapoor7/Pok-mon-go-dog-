import { STATUS_META, MOOD_META, type DogStatus, type MoodTag } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Status and mood chips, now built on shadcn's Badge rather than a hand-rolled
 * `.chip` span.
 *
 * The colours stay in STATUS_META, because a dog's status colour is the same
 * value the map markers use and it has to keep matching them. What Badge
 * brings is the parts that were missing: a real focus ring, the transition
 * and border treatment every other control has, and one definition of what a
 * small pill looks like across the app.
 */

export function StatusBadge({
  status,
  className,
}: {
  status: DogStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge
      className={cn("gap-1.5 border-transparent text-white shadow-sm", className)}
      style={{ backgroundColor: meta.color }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}

export function MoodChip({ mood }: { mood: MoodTag }) {
  const meta = MOOD_META[mood];
  return (
    <Badge variant="secondary" className="gap-1.5 font-medium">
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}

/** Small circular trust-score gauge. */
export function TrustRing({
  score,
  size = 44,
}: {
  score: number;
  size?: number;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "#3E8473" : score >= 60 ? "#D9A441" : "#C0492E";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={`Trust score ${score}/100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[11.5px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
