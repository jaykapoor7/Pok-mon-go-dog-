import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Eye,
  Utensils,
  Syringe,
  Scissors,
  Calendar,
  Quote,
  GitMerge,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { StatusBadge, TrustRing } from "@/components/ui/Badges";
import { DogActions } from "@/components/dog/DogActions";
import { SightingTimeline } from "@/components/dog/SightingTimeline";
import { CaseCard } from "@/components/cases/CaseCard";
import { getDogProfile } from "@/lib/data";
import { getCasesForDog } from "@/lib/cases";
import { timeAgo, formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getDogProfile(id);
  if (!profile) return { title: "Dog not found — StrayPaw Delhi" };
  const { dog } = profile;
  const title = `${dog.name} — StrayPaw Delhi`;
  const description = `Follow ${dog.name}, a street dog around ${dog.zone}. ${dog.sightings_count} sightings tracked by the community.`;
  // Use the dog's own photo as the share image when available.
  const images = dog.cover_photo ? [dog.cover_photo] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, images, type: "article" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function DogProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, dogCases] = await Promise.all([
    getDogProfile(id),
    getCasesForDog(id),
  ]);
  if (!profile) notFound();

  const { dog, sightings, feedEvents, vaccinations, sterilisations, comments, matchSuggestions } =
    profile;

  const lastVaccine = vaccinations[0];
  const sterilisation = sterilisations.find((s) => s.status === "completed");
  const scheduled = sterilisations.find((s) => s.status === "scheduled");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-24 sm:px-6">
      {/* cover */}
      <div className="relative overflow-hidden rounded-[2rem] shadow-card">
        <DogPhoto
          src={dog.cover_photo}
          alt={dog.name ?? "Street dog"}
          seed={dog.id}
          className="h-64 w-full sm:h-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4">
          <StatusBadge status={dog.status} />
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-white/90 p-1">
          <TrustRing score={dog.trust_score} size={48} />
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
          <div>
            <h1 className="font-display text-3xl font-extrabold">{dog.name}</h1>
            <p className="flex items-center gap-1.5 text-sm opacity-90">
              <MapPin className="h-4 w-4" /> Around {dog.zone} · {dog.size} · {dog.color}
            </p>
          </div>
        </div>
      </div>

      {/* best photos */}
      {dog.photos.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {dog.photos.map((p, i) => (
            <DogPhoto
              key={i}
              src={p}
              alt={`${dog.name} photo ${i + 1}`}
              seed={`${dog.id}-${i}`}
              className="aspect-square rounded-2xl"
            />
          ))}
        </div>
      )}

      {/* quick stats */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat icon={<Eye className="h-4 w-4" />} value={formatNumber(dog.sightings_count)} label="sightings" />
        <Stat icon={<Utensils className="h-4 w-4" />} value={formatNumber(dog.feed_count)} label="meals" />
        <Stat icon={<Calendar className="h-4 w-4" />} value={timeAgo(dog.last_seen)} label="last seen" />
        <Stat icon={<MapPin className="h-4 w-4" />} value={dog.zone.split(" ")[0]} label="zone" />
      </div>

      {/* actions */}
      <div className="mt-5">
        <DogActions dogId={dog.id} name={dog.name ?? "this dog"} />
      </div>

      {/* NGO continuity: cases linked to this dog over time */}
      <Section title="Cases">
        {dogCases.length > 0 && (
          <div className="mb-3 space-y-2">
            {dogCases.map((c) => (
              <CaseCard key={c.id} c={c} />
            ))}
          </div>
        )}
        <Link
          href={`/cases/new?dog=${dog.id}`}
          className="flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-bark-700 transition-colors hover:border-black/20 dark:border-white/10 dark:text-bark-200"
        >
          <ClipboardList className="h-4 w-4 text-paw-500" /> Open a case for {dog.name}
        </Link>
      </Section>

      {/* health */}
      <Section title="Health & care">
        <div className="grid gap-3 sm:grid-cols-2">
          <HealthCard
            icon={<Syringe className="h-5 w-5" />}
            title="Vaccination"
            ok={dog.vaccinated}
            okText={
              lastVaccine
                ? `${lastVaccine.vaccine} · ${formatDate(lastVaccine.date)}`
                : "Vaccinated"
            }
            pendingText="No vaccination on record"
            sub={lastVaccine?.administered_by ?? undefined}
          />
          <HealthCard
            icon={<Scissors className="h-5 w-5" />}
            title="Sterilisation"
            ok={dog.sterilised}
            okText={
              sterilisation
                ? `Completed · ${formatDate(sterilisation.date)}`
                : "Sterilised"
            }
            pendingText={
              scheduled
                ? `Scheduled · ${formatDate(scheduled.date)}`
                : "Not yet sterilised"
            }
            sub={sterilisation?.performed_by ?? scheduled?.performed_by ?? undefined}
          />
        </div>
      </Section>

      {/* community notes */}
      {dog.community_notes.length > 0 && (
        <Section title="Community notes">
          <div className="space-y-2">
            {dog.community_notes.map((note, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-2xl bg-paw-50 px-4 py-3 text-sm text-bark-700"
              >
                <Quote className="h-4 w-4 shrink-0 text-paw-400" />
                {note}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* timeline */}
      <Section title="Sightings timeline">
        <SightingTimeline sightings={sightings} />
      </Section>

      {/* feeding history */}
      {feedEvents.length > 0 && (
        <Section title="Feeding history">
          <div className="space-y-2">
            {feedEvents.slice(0, 6).map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-2xl bg-status-hungry/10 px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-bark-700">
                  <Utensils className="h-4 w-4 text-status-hungry" />
                  {f.user_name} · {f.food_type}
                </span>
                <span className="text-xs text-bark-400">{timeAgo(f.created_at)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* merge suggestions — smart system */}
      {matchSuggestions.length > 0 && (
        <Section title="Possibly the same dog?">
          <p className="mb-3 -mt-2 text-xs text-bark-400">
            Our matching engine found nearby profiles that might be {dog.name}.
          </p>
          <div className="space-y-2">
            {matchSuggestions.map((m) => (
              <Link
                key={m.dog.id}
                href={`/dog/${m.dog.id}`}
                className="flex items-center gap-3 rounded-2xl border border-bark-100 p-2.5 transition-colors hover:border-paw-300 hover:bg-paw-50"
              >
                <DogPhoto
                  src={m.dog.cover_photo}
                  alt={m.dog.name ?? "dog"}
                  seed={m.dog.id}
                  className="h-12 w-12 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.dog.name}</p>
                  <p className="truncate text-xs text-bark-400">{m.reason}</p>
                </div>
                <span className="chip bg-status-sterilised/15 text-status-sterilised">
                  <GitMerge className="h-3 w-3" />
                  {Math.round(m.confidence * 100)}%
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* comments */}
      <Section title={`Community (${comments.length})`}>
        {comments.length === 0 ? (
          <p className="text-sm text-bark-400">
            No notes yet — be the first to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                {c.user_avatar ? (
                  <img
                    src={c.user_avatar}
                    alt={c.user_name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-paw-200" />
                )}
                <div className="rounded-2xl bg-bark-50 px-4 py-2">
                  <p className="text-xs font-semibold">
                    {c.user_name}{" "}
                    <span className="font-normal text-bark-400">
                      · {timeAgo(c.created_at)}
                    </span>
                  </p>
                  <p className="text-sm text-bark-700">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="mt-8 flex justify-center">
        <Link href="/map" className="btn-ghost px-6 py-3">
          Back to the map <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-0.5 p-3 text-center">
      <span className="text-paw-500">{icon}</span>
      <span className="text-sm font-bold leading-tight">{value}</span>
      <span className="text-[10px] text-bark-400">{label}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function HealthCard({
  icon,
  title,
  ok,
  okText,
  pendingText,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  ok: boolean;
  okText: string;
  pendingText: string;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="mb-1 flex items-center gap-2">
        <span
          className={ok ? "text-status-vaccinated" : "text-bark-300"}
        >
          {icon}
        </span>
        <span className="font-display text-sm font-bold">{title}</span>
        <span
          className={`chip ml-auto ${
            ok
              ? "bg-status-vaccinated/15 text-status-vaccinated"
              : "bg-bark-100 text-bark-500"
          }`}
        >
          {ok ? "Done" : "Pending"}
        </span>
      </div>
      <p className="text-sm text-bark-700">{ok ? okText : pendingText}</p>
      {sub && <p className="mt-0.5 text-xs text-bark-400">{sub}</p>}
    </div>
  );
}
