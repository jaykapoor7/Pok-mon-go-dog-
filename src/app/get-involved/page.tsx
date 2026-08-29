import Link from "next/link";
import { PlatformShell } from "@/components/platform/PlatformNav";
import {
  Heart,
  MapPin,
  Database,
  Users,
  HandHeart,
  Megaphone,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-static";
export const metadata = {
  title: "Get Involved - StrayPaw",
  description:
    "Report sightings, volunteer with local organisations, contribute data, or help spread awareness about street-animal welfare in India.",
};

const WAYS = [
  {
    icon: MapPin,
    title: "Report a sighting",
    description:
      "Spotted a street dog that needs help, or a healthy community pack in your neighbourhood? Report sightings through the community map to build a real, ground-level picture of street-dog presence and welfare across India.",
    action: { label: "Open the community map", href: "/" },
  },
  {
    icon: Heart,
    title: "Volunteer with a local organisation",
    description:
      "Animal-welfare organisations across India need volunteers for feeding rounds, ABC programme support, fostering, adoption drives, and community education. Find an organisation near you in our directory and reach out directly.",
    action: { label: "Browse organisations", href: "/resources" },
  },
  {
    icon: HandHeart,
    title: "Support financially",
    description:
      "Most of India's animal-welfare work is funded by individual donations and volunteer effort. Even small, recurring contributions to a verified local organisation sustain sterilisation drives, rescue operations, and shelter maintenance. Donate directly to organisations listed in our directory.",
    action: { label: "Find an organisation to support", href: "/resources" },
  },
  {
    icon: Database,
    title: "Contribute data",
    description:
      "StrayPaw is built on open, sourced data. If you know of a published, verifiable figure (ABC coverage, population counts, programme outcomes) that we have not captured, or if you can help verify existing entries, your contribution fills a real gap.",
    action: { label: "See current data coverage", href: "/insights" },
  },
  {
    icon: Megaphone,
    title: "Spread awareness",
    description:
      "Share what you learn here with your neighbours, your RWA, your local municipal body. Understanding that ABC is the legal, effective approach (not relocation or culling) changes how communities respond to street dogs, and how local bodies allocate resources.",
    action: { label: "Learn the basics first", href: "/learn" },
  },
  {
    icon: Users,
    title: "Engage your community",
    description:
      "Organise or join a community feeding programme in your area, designate feeding spots, coordinate with local ABC providers, and help manage human-dog conflict through dialogue rather than complaints. Well-coordinated community care makes a measurable difference.",
    action: { label: "See what works elsewhere", href: "/take-action" },
  },
];

const QUICK_TIPS = [
  "Carry water: a collapsible bowl and a bottle can save a dehydrated dog on a hot day.",
  "Know your nearest vet: save the number of a vet or rescue organisation that handles street animals.",
  "Report, do not relocate: moving a dog from its territory is illegal and counterproductive. Report it for ABC instead.",
  "Vaccinate before you pet: if you regularly interact with street dogs, consider pre-exposure rabies vaccination for yourself.",
  "Feed responsibly: fixed times, designated spots, clean up afterward. This reduces conflict and keeps the area clean.",
  "Ear-notch means sterilised: a V-shaped notch on the left ear means the dog has been through an ABC programme.",
];

export default function GetInvolvedPage() {
  return (
    <PlatformShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-bark-900 sm:text-4xl">
          Get involved
        </h1>
        <p className="mt-3 text-bark-500">
          Street-animal welfare in India runs on community effort. Here is how
          you can make a real difference, starting today.
        </p>

        {/* Ways to help */}
        <div className="mt-10 space-y-6">
          {WAYS.map((w) => {
            const Icon = w.icon;
            return (
              <section
                key={w.title}
                className="rounded-lg border border-bark-100 bg-white p-6"
              >
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-bark-900">
                  <Icon className="h-5 w-5 text-paw-500" />
                  {w.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-bark-600">
                  {w.description}
                </p>
                <Link
                  href={w.action.href}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-paw-600 hover:text-paw-700"
                >
                  {w.action.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </section>
            );
          })}
        </div>

        {/* Quick tips */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-bark-900">
            Everyday tips
          </h2>
          <p className="mt-1 text-sm text-bark-400">
            Small things you can do right now, no organisation needed.
          </p>
          <ul className="mt-4 space-y-2">
            {QUICK_TIPS.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-bark-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paw-50 text-[10px] font-bold text-paw-600">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </section>

        {/* Data transparency note */}
        <div className="mt-12 rounded-lg border border-bark-200 bg-bark-50 p-6">
          <p className="font-semibold text-bark-900">
            Why open data matters
          </p>
          <p className="mt-2 text-sm text-bark-600">
            India does not currently publish comprehensive, state-wise data on
            ABC coverage, dog vaccination rates, or street-dog population
            changes. Without this data, it is impossible to measure progress
            toward rabies elimination, allocate resources effectively, or hold
            local bodies accountable. Every verified data point contributed to
            StrayPaw helps close this gap.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/insights"
              className="inline-flex items-center gap-1 rounded-full bg-bark-900 px-4 py-2 text-sm font-semibold text-white hover:bg-bark-800"
            >
              See the data gaps <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 rounded-full border border-bark-300 px-4 py-2 text-sm font-semibold text-bark-700 hover:bg-white"
            >
              Explore what we have <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}
