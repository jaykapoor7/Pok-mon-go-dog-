import Link from "next/link";
import { ArrowLeft, MapPin, Building2, ExternalLink } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { VerifiedBadge } from "@/components/org/VerifiedBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getOrgs } from "@/lib/data";
import { ORGS } from "@/lib/platform/orgs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Organizations, animal-welfare partners | StrayPaw",
  description:
    "Discover the animal-welfare organizations documenting rescue cases and running transparent campaigns on StrayPaw.",
};

export default async function OrgsPage() {
  const orgs = await getOrgs();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/map"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to app
      </Link>

      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50">
          Organizations
        </h1>
        <p className="mt-1 text-sm text-bark-500">
          The animal-welfare organizations documenting cases and raising for real
          needs on StrayPaw.
        </p>
      </header>

      {orgs.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-7 w-7" />}
          title="No StrayPaw partners yet"
          description="Verified animal-welfare partners running cases and campaigns on StrayPaw will appear here as they join."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {orgs.map((org) => {
            const location = [org.city, org.state].filter(Boolean).join(", ") || org.area;
            return (
              <Link
                key={org.id}
                href={`/org/${org.slug ?? org.id}`}
                className="card card-interactive flex gap-4 p-5"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-bark-900">
                  {org.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
                  ) : (
                    <Logo size="md" showWordmark={false} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-display text-lg font-bold tracking-tight text-bark-900 dark:text-bark-50">
                      {org.name}
                    </h2>
                  </div>
                  <div className="mt-1">
                    <VerifiedBadge verified={org.verified} size="sm" />
                  </div>
                  {location && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-bark-500">
                      <MapPin className="h-3.5 w-3.5" /> {location}
                    </p>
                  )}
                  {org.mission && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-bark-600 dark:text-bark-300">
                      {org.mission}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <section className="mt-10 border-t border-black/[0.08] pt-8 dark:border-white/[0.1]">
        <h2 className="font-display text-xl font-bold tracking-tight text-bark-900 dark:text-bark-50">Directory</h2>
        <p className="mt-1 max-w-2xl text-sm text-bark-500">
          Real, named animal-welfare organisations working across India - sourced from public information, not yet on StrayPaw as partners. Not comprehensive, and not endorsed by these organisations for this listing.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {ORGS.map((o) => (
            <div key={o.id} className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.1]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[15px] font-bold leading-snug tracking-tight text-bark-900 dark:text-bark-50">{o.name}</h3>
                {o.url && (
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-bark-400 hover:text-paw-600">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-bark-500">
                <MapPin className="h-3.5 w-3.5" /> {o.city}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{o.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {o.focus.map((f) => (
                  <span key={f} className="rounded-full bg-bark-100 px-2 py-0.5 text-[11px] text-bark-500 dark:bg-bark-800">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
