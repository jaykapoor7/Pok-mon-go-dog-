import Link from "next/link";
import { MapPin, ClipboardList, HeartHandshake, Utensils, Building2, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const dynamic = "force-static";

export const metadata = {
  title: "What we do — StrayPaw",
  description:
    "How StrayPaw works: report street animals, track rescues, run transparent campaigns, and map feeding zones.",
};

const ITEMS = [
  {
    icon: MapPin,
    title: "Spot & report",
    body: "A photo and a location puts any street animal on one shared, public map — in seconds, no account needed.",
  },
  {
    icon: ClipboardList,
    title: "Track rescues",
    body: "Turn a sighting into a documented case: condition, treatment, cost, a photo timeline, and a clear outcome.",
  },
  {
    icon: HeartHandshake,
    title: "Back the work",
    body: "Verified organizations run campaigns for real needs — vet bills, sterilisation drives, an ambulance — that link straight to their own donation channel.",
  },
  {
    icon: Utensils,
    title: "Map feeding zones",
    body: "Record the spots that already get fed and the volunteers who show up, so no corner and no animal is missed.",
  },
  {
    icon: Building2,
    title: "Give NGOs a home",
    body: "A credible organization profile, documented cases, and campaign pages they can share with their own supporters.",
  },
];

export default function WhatWeDoPage() {
  return (
    <MarketingShell
      eyebrow="What we do"
      title="One place for the whole journey of care."
      intro="From the first sighting on the street to a resolved case with a clear outcome — StrayPaw keeps it visible, shared and accountable."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="rounded-2xl border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-paw-50 text-paw-600 dark:bg-paw-900/30 dark:text-paw-300">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3 font-semibold">{it.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{it.body}</p>
            </div>
          );
        })}
      </div>

      <Link href="/app" className="btn-primary mt-8 px-6 py-3.5 text-base">
        Open the app <ArrowRight className="h-4 w-4" />
      </Link>
    </MarketingShell>
  );
}
