import Link from "next/link";
import { MapPin, ClipboardList, HeartHandshake, Utensils, Building2, ArrowRight, Users, Landmark } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const dynamic = "force-static";

export const metadata = {
  title: "What we do, StrayPaw",
  description:
    "How StrayPaw works: report street animals, track rescues, run transparent campaigns, and map feeding zones.",
};

type Step = { icon: typeof MapPin; title: string; body: string };

const COMMUNITY: Step[] = [
  {
    icon: MapPin,
    title: "Spot & report",
    body: "A photo and a location puts any street animal on one shared, public map in seconds. No account needed.",
  },
  {
    icon: ClipboardList,
    title: "Track the rescue",
    body: "A sighting becomes a documented case: condition, treatment, cost, a photo timeline, and a clear outcome.",
  },
  {
    icon: Utensils,
    title: "Map feeding zones",
    body: "Record the spots that already get fed and the volunteers who show up, so no corner and no animal is missed.",
  },
];

const ORGS: Step[] = [
  {
    icon: HeartHandshake,
    title: "Back the work",
    body: "Verified organizations run campaigns for real needs (vet bills, sterilisation drives, an ambulance) that link straight to their own donation channel.",
  },
  {
    icon: Building2,
    title: "A home for NGOs",
    body: "A credible organization profile, documented cases, and campaign pages they can share with their own supporters.",
  },
];

function Timeline({ steps, offset }: { steps: Step[]; offset: number }) {
  return (
    <ol className="relative">
      {steps.map((s, idx) => {
        const Icon = s.icon;
        const num = String(offset + idx + 1).padStart(2, "0");
        const last = idx === steps.length - 1;
        return (
          <li key={s.title} className="relative flex gap-4 pb-7 last:pb-0">
            {/* connector line to the next node */}
            {!last && (
              <span
                aria-hidden
                className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px -translate-x-1/2 bg-gradient-to-b from-paw-300/70 to-paw-200/0 dark:from-paw-500/40"
              />
            )}
            <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-paw-400 to-paw-600 text-white shadow-warm">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium tracking-widest text-paw-500">{num}</span>
                <h3 className="font-semibold tracking-tight text-bark-900 dark:text-bark-50">{s.title}</h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function GroupHeader({ icon: Icon, kicker, title }: { icon: typeof Users; kicker: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-paw-50 text-paw-600 dark:bg-paw-900/30 dark:text-paw-300">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-bark-400">{kicker}</p>
        <p className="text-[15px] font-semibold tracking-tight text-bark-900 dark:text-bark-50">{title}</p>
      </div>
    </div>
  );
}

export default function WhatWeDoPage() {
  return (
    <MarketingShell
      eyebrow="What we do"
      title="One place for the whole journey of care."
      intro="From the first sighting on the street to a resolved case with a clear outcome, StrayPaw keeps it visible, shared and accountable."
    >
      {/* three surfaces, at a glance */}
      <div className="mb-10 grid grid-cols-3 gap-2.5">
        {[
          { label: "Community app", desc: "Report & follow" },
          { label: "Live map", desc: "Every animal" },
          { label: "Partner OS", desc: "NGO operations" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-black/[0.06] bg-white/70 p-3 text-center dark:border-white/10 dark:bg-bark-900/50">
            <p className="text-[13px] font-semibold tracking-tight text-bark-900 dark:text-bark-50">{s.label}</p>
            <p className="mt-0.5 text-[11px] text-bark-400">{s.desc}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-black/[0.06] bg-white/60 p-6 dark:border-white/10 dark:bg-bark-900/40">
        <GroupHeader icon={Users} kicker="For everyone" title="What the community does" />
        <Timeline steps={COMMUNITY} offset={0} />
      </section>

      <section className="mt-5 rounded-2xl border border-black/[0.06] bg-white/60 p-6 dark:border-white/10 dark:bg-bark-900/40">
        <GroupHeader icon={Landmark} kicker="For organizations" title="What partner NGOs do" />
        <Timeline steps={ORGS} offset={COMMUNITY.length} />
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app" className="btn-primary px-6 py-3.5 text-base">
          Open the app <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/partner" className="btn-ghost px-6 py-3.5 text-base">
          For NGOs &amp; partners
        </Link>
      </div>
    </MarketingShell>
  );
}
