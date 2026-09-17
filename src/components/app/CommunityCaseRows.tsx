import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicCaseStory } from "@/lib/community-case-stories";
import { formatDate } from "@/lib/utils";

function animalLabel(row: PublicCaseStory) {
  return row.animal_name || row.animal_code || "Animal record";
}

export function CommunityCaseRows({ rows, empty }: { rows: PublicCaseStory[]; empty: string }) {
  if (!rows.length) return <p className="border-t border-black/[.09] py-8 text-sm opacity-60">{empty}</p>;
  return (
    <div className="border-t border-black/[.09]">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={`/dog/${row.dog_id}`}
          className="grid gap-2 border-b border-black/[.08] py-4 transition hover:bg-black/[.02] sm:grid-cols-[120px_160px_minmax(0,1fr)_180px_18px] sm:items-center"
        >
          <time className="text-xs tabular-nums opacity-55">{formatDate(row.resolved_at || row.occurred_at)}</time>
          <span className="text-xs font-semibold capitalize text-[#2457ce]">{row.category.replace(/_/g, " ")}</span>
          <span className="min-w-0">
            <b className="block truncate text-sm">{animalLabel(row)}</b>
            <small className="mt-0.5 block line-clamp-2 text-xs leading-5 opacity-65">{row.title || "Field case"}</small>
          </span>
          <span className="truncate text-xs opacity-60">{row.zone || row.ngo_name || "Location recorded"}</span>
          <ArrowUpRight size={15} />
        </Link>
      ))}
    </div>
  );
}
