import { STATUS_META, MOOD_META, type DogStatus, type MoodTag } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: DogStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn("chip text-white shadow-sm", className)}
      style={{ backgroundColor: meta.color }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

export function MoodChip({ mood }: { mood: MoodTag }) {
  const meta = MOOD_META[mood];
  return (
    <span className="chip bg-bark-100 text-bark-700">
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
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
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

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
        className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
