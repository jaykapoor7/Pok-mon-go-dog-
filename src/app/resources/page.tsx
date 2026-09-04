import Link from "next/link";
import { PlatformShell } from "@/components/platform/PlatformNav";
import { FloatingPillNav } from "@/components/platform/FloatingPillNav";
import { ResourcesDirectory } from "@/components/platform/ResourcesDirectory";
import { Phone, ArrowRight } from "lucide-react";

export const dynamic = "force-static";
export const metadata = {
  title: "Resources - StrayPaw",
  description:
    "Find animal welfare organisations, rescue helplines, veterinary contacts, and post-bite care guidance across India.",
};

const HELPLINES = [
  {
    name: "PFA National Helpline",
    number: "011-23719293",
    note: "People for Animals, New Delhi",
  },
  {
    name: "Friendicoes Emergency",
    number: "011-24314787",
    note: "Delhi rescue and ambulance",
  },
  {
    name: "BSPCA Mumbai",
    number: "022-24137518",
    note: "Mumbai rescue and shelter",
  },
  {
    name: "Blue Cross of India",
    number: "044-22354959",
    note: "Chennai rescue and ambulance",
  },
  {
    name: "CUPA Bengaluru",
    number: "080-26631514",
    note: "Bengaluru rescue and shelter",
  },
  {
    name: "Animal Help Foundation",
    number: "079-40203025",
    note: "Ahmedabad rescue and hospital",
  },
];

const POST_BITE_STEPS = [
  "Wash the wound immediately with soap and running water for at least 15 minutes.",
  "Apply an antiseptic (povidone-iodine or alcohol-based) after washing.",
  "Visit a hospital or health centre for anti-rabies vaccination (ARV) as soon as possible.",
  "Complete the full course of ARV injections on schedule (typically days 0, 3, 7, 14, and 28).",
  "For deep or bleeding bites, ask about rabies immunoglobulin (RIG) in addition to ARV.",
  "Do not apply turmeric, chilli, or any home remedy to the wound.",
];

export default function ResourcesPage() {
  return (
    <PlatformShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl tracking-tight text-bark-900 sm:text-4xl">
          Resources
        </h1>
        <p className="mt-3 text-bark-500">
          Rescue contacts, welfare organisations, and practical guidance for
          helping street animals across India.
        </p>

        <FloatingPillNav
          sections={[
            { id: "helplines", label: "Helplines" },
            { id: "post-bite", label: "Post-bite care" },
            { id: "directory", label: "Organisations" },
            { id: "data", label: "Data & research" },
          ]}
        />

        {/* ── Emergency helplines ── */}
        <section id="helplines" className="mt-12 scroll-mt-28">
          <h2 className="flex items-center gap-2 font-display text-xl text-bark-900">
            <Phone className="h-5 w-5 text-paw-500" />
            Emergency rescue helplines
          </h2>
          <p className="mt-1 text-sm text-bark-400">
            Call for injured, trapped, or distressed animals. These are not
            StrayPaw lines; they connect to established rescue organisations.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {HELPLINES.map((h) => (
              <div
                key={h.number}
                className="rounded-lg border border-bark-200 bg-white p-4"
              >
                <p className="font-semibold text-bark-900">{h.name}</p>
                <p className="mt-1 font-mono text-lg text-paw-600">
                  {h.number}
                </p>
                <p className="mt-0.5 text-xs text-bark-400">{h.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Post-bite care ── */}
        <section id="post-bite" className="mt-12 scroll-mt-28">
          <h2 className="font-display text-xl text-bark-900">
            What to do after a dog bite
          </h2>
          <p className="mt-1 text-sm text-bark-400">
            Based on NCDC National Guidelines for Management of Animal Bites
            (2024). Always seek medical care promptly.
          </p>
          <ol className="mt-4 space-y-2">
            {POST_BITE_STEPS.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-bark-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paw-50 text-xs font-bold text-paw-600">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <ResourcesDirectory />

        {/* ── Data & research ── */}
        <section id="data" className="mt-12 scroll-mt-28">
          <h2 className="font-display text-xl text-bark-900">
            Data and research
          </h2>
          <p className="mt-2 text-sm text-bark-600">
            StrayPaw surfaces real, sourced data on street-dog populations,
            sterilisation coverage, rabies, and welfare infrastructure across
            India.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 rounded-full bg-paw-50 px-4 py-2 text-sm font-semibold text-paw-700 hover:bg-paw-100"
            >
              Explore data by state <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/sources"
              className="inline-flex items-center gap-1 rounded-full bg-bark-50 px-4 py-2 text-sm font-semibold text-bark-700 hover:bg-bark-100"
            >
              Research sources <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/insights"
              className="inline-flex items-center gap-1 rounded-full bg-bark-50 px-4 py-2 text-sm font-semibold text-bark-700 hover:bg-bark-100"
            >
              Key findings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
