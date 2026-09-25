import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import type { ContributorOrg } from "@/lib/contributor-types";

export function ResourcesDirectory({ organisations }: { organisations: ContributorOrg[] }) {
  return (
    <section id="directory" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 font-display text-xl text-bark-900">
        <Building2 className="h-5 w-5 text-paw-500" />
        StrayPaw contributors
      </h2>
      <p className="mt-1 text-sm text-bark-400">
        Only active StrayPaw partners and organisations credited for published records appear here.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {organisations.map((org) => (
          <Link key={org.id} href={org.url} className="rounded border border-bark-100 bg-white p-5 transition hover:border-paw-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-bark-900">{org.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-bark-400">
                  <MapPin className="h-3 w-3" />{[org.city, org.state].filter(Boolean).join(", ")}
                </p>
              </div>
              <span className="rounded-full bg-bark-50 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-bark-500">
                {org.directoryKind === "partner" ? "Partner" : "Data source"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-bark-600">{org.summary}</p>
            <p className="mt-3 text-xs text-bark-400">
              {org.animalCount.toLocaleString("en-IN")} animals · {org.areaRecordCount.toLocaleString("en-IN")} area records
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
