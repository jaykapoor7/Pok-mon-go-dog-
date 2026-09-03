import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Mail,
  Phone,
  Calendar,
  HeartHandshake,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { Logo } from "@/components/brand/Logo";
import { VerifiedBadge } from "@/components/org/VerifiedBadge";
import { FundraiserCard } from "@/components/fundraisers/FundraiserCard";
import { getOrgBySlug, getOrgImpact } from "@/lib/data";
import { getFundraisersByOrg } from "@/lib/fundraisers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) return { title: "Organization not found, StrayPaw" };
  return {
    title: `${org.name}, Animal welfare on StrayPaw`,
    description:
      org.mission?.slice(0, 150) ??
      `${org.name} documents rescue cases and runs transparent campaigns on StrayPaw.`,
    ...(org.cover_photo ? { openGraph: { images: [org.cover_photo] } } : {}),
  };
}

function Stat({ value, label, icon: Icon }: { value: number; label: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 rounded border border-black/[0.06] bg-white p-4 dark:border-white/10 dark:bg-bark-900">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paw-50 text-paw-600 dark:bg-paw-900/30 dark:text-paw-300">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="font-display text-xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50">
          {new Intl.NumberFormat("en-IN").format(value)}
        </div>
        <div className="text-xs text-bark-500">{label}</div>
      </div>
    </div>
  );
}

export default async function OrgProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  const [impact, campaigns] = await Promise.all([
    getOrgImpact(org.id),
    getFundraisersByOrg(org.id),
  ]);

  const location = [org.city, org.state].filter(Boolean).join(", ") || org.area;

  return (
    <div className="pb-24">
      {/* Cover */}
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-paw-500 to-paw-700 sm:h-56">
        {org.cover_photo && (
          <DogPhoto
            src={org.cover_photo}
            alt={org.name}
            seed={org.id}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link
          href="/orgs"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
        >
          <ArrowLeft className="h-4 w-4" /> All organizations
        </Link>

        {/* Header card */}
        <div className="-mt-2 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded border-4 border-paper bg-white shadow-card dark:border-ink dark:bg-bark-900 sm:h-24 sm:w-24">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
            ) : (
              <Logo size="lg" showWordmark={false} />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="mb-1.5">
              <VerifiedBadge verified={org.verified} />
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50 sm:text-3xl">
              {org.name}
            </h1>
            {location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-bark-500">
                <MapPin className="h-4 w-4" /> {location}
              </p>
            )}
          </div>
        </div>

        {/* Mission */}
        {org.mission && (
          <p className="mt-5 text-lg leading-relaxed text-bark-700 dark:text-bark-200">
            {org.mission}
          </p>
        )}

        {/* Impact, real counts only */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={impact.casesResolved} label="cases resolved" icon={CheckCircle2} />
          <Stat value={impact.casesActive} label="active cases" icon={Activity} />
          <Stat value={impact.campaignsActive} label="active campaigns" icon={HeartHandshake} />
        </div>

        {/* Areas of work */}
        {org.areas_of_work && org.areas_of_work.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-400">
              Areas of work
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {org.areas_of_work.map((a) => (
                <span key={a} className="chip bg-paw-50 font-medium text-paw-700 dark:bg-paw-900/30 dark:text-paw-300">
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Active campaigns */}
        {campaigns.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50">
              Active campaigns
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {campaigns.map((f) => (
                <FundraiserCard key={f.id} f={f} />
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {org.about && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-extrabold tracking-tightest text-bark-900 dark:text-bark-50">
              About {org.name}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-bark-700 dark:text-bark-200">
              {org.about}
            </p>
          </section>
        )}

        {/* Contact */}
        <section className="mt-8 rounded border border-black/[0.06] bg-white p-5 dark:border-white/10 dark:bg-bark-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bark-400">
            Get in touch
          </h2>
          <div className="mt-3 flex flex-col gap-2.5 text-sm">
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 font-medium text-paw-600 hover:underline"
              >
                <Globe className="h-4 w-4" /> {org.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {org.contact_email && (
              <a href={`mailto:${org.contact_email}`} className="inline-flex items-center gap-2 font-medium text-paw-600 hover:underline">
                <Mail className="h-4 w-4" /> {org.contact_email}
              </a>
            )}
            {org.contact_phone && (
              <a href={`tel:${org.contact_phone}`} className="inline-flex items-center gap-2 font-medium text-bark-700 dark:text-bark-200">
                <Phone className="h-4 w-4" /> {org.contact_phone}
              </a>
            )}
            {org.founded_year && (
              <p className="inline-flex items-center gap-2 text-bark-500">
                <Calendar className="h-4 w-4" /> Founded {org.founded_year}
              </p>
            )}
            {!org.website && !org.contact_email && !org.contact_phone && (
              <p className="text-bark-400">Contact details coming soon.</p>
            )}
          </div>
          {org.registration_no && (
            <p className="mt-3 border-t border-black/[0.06] pt-3 text-xs text-bark-400 dark:border-white/10">
              Registration: {org.registration_no}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
