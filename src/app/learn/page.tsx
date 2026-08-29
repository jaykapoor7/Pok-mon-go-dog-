import Link from "next/link";
import { PlatformShell } from "@/components/platform/PlatformNav";
import { FloatingPillNav } from "@/components/platform/FloatingPillNav";
import { RESEARCH, RESEARCH_TOPICS } from "@/lib/platform/research";
import {
  BookOpen,
  ShieldCheck,
  Syringe,
  Scale,
  Dog,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-static";
export const metadata = {
  title: "Learn - StrayPaw",
  description:
    "Understand India's street-dog ecosystem: coexistence, ABC, rabies, legal protections, and what the data actually says.",
};

const SECTIONS = [
  {
    id: "coexist",
    icon: Dog,
    title: "Living alongside street dogs",
    content: [
      "India has an estimated 60 million or more free-roaming dogs. Most are community dogs that live in and around human settlements, surviving on food waste and handouts. They are a permanent part of the urban ecosystem, not a temporary problem waiting for removal.",
      "Community dogs that are sterilised and vaccinated tend to be calmer, territorial (which deters new unvaccinated dogs from entering an area), and pose a lower public-health risk. Feeding dogs at fixed times and in designated spots reduces scavenging, street fouling, and conflict with residents.",
      "If a street dog growls, barks, or shows teeth, give it space. Never corner, chase, or hit a dog. Most aggression is fear-based and ends when the perceived threat withdraws.",
    ],
  },
  {
    id: "abc",
    icon: ShieldCheck,
    title: "What is ABC (Animal Birth Control)?",
    content: [
      "ABC is the only legal, humane method for managing street-dog populations in India. Under the Animal Birth Control Rules (2023), municipal bodies are required to sterilise and vaccinate community dogs and release them back to their territory.",
      "Sterilisation reduces population growth, while vaccination against rabies breaks the transmission cycle. The combination, sustained at 70% or higher coverage, is recognised by the WHO as the most effective and cost-efficient strategy for eliminating dog-mediated rabies.",
      "Relocation and culling are illegal under the Prevention of Cruelty to Animals Act (1960) and have been shown repeatedly to be counterproductive: removing dogs from an area creates a vacuum that is quickly filled by unvaccinated newcomers, resetting the cycle.",
      "As of 2025, comprehensive state-wise ABC coverage data is almost nonexistent. The Supreme Court found that only 2 of 28 states and UTs had filed the sterilisation-compliance reports it ordered. That data gap is itself one of the most important things StrayPaw surfaces.",
    ],
  },
  {
    id: "rabies",
    icon: Syringe,
    title: "Rabies in India",
    content: [
      "India accounts for roughly a third of global human rabies deaths. The official passive-surveillance figure reported by the NCDC for 2024 was 54 suspected deaths; independent peer-reviewed modelling puts the true number at 18,000 to 20,000 deaths per year, a gap of roughly 350x.",
      "Rabies is nearly 100% fatal once symptoms appear, but 100% preventable with timely post-exposure prophylaxis (PEP). After any dog bite or scratch: wash the wound immediately with soap and running water for 15 minutes, then visit a hospital for anti-rabies vaccination (ARV). Do not delay.",
      "India has committed to eliminating dog-mediated human rabies by 2030 under the National Action Plan for Rabies Elimination (NAPRE). The plan relies on mass dog vaccination, ABC, improved surveillance, and accessible PEP across all states.",
      "The gap between reported and estimated rabies deaths is not a sign of declining cases. It reflects chronic under-reporting: most rabies deaths occur at home, in rural areas, without laboratory confirmation. Strengthening surveillance is as critical as expanding vaccination.",
    ],
  },
  {
    id: "legal",
    icon: Scale,
    title: "Legal framework",
    content: [
      "The Prevention of Cruelty to Animals Act, 1960 is the foundational law, establishing the Animal Welfare Board of India (AWBI) and defining cruelty offences. It is illegal to beat, kick, torture, or kill a street dog under this act.",
      "The Animal Birth Control Rules, 2023 (replacing the 2001 rules) require all municipal bodies to implement ABC and anti-rabies vaccination for community dogs. They mandate monitoring committees, prohibit relocation of sterilised dogs, and give recognised animal-welfare organisations a role in programme oversight.",
      "Multiple Supreme Court orders (most recently the 2023 proceedings and 2025 compliance review) have reinforced the duty of local bodies to implement ABC, directed states to file compliance reports, and reiterated that culling and mass relocation are unlawful.",
      "Feeding street dogs at reasonable times and in reasonable ways is legal. Several High Court rulings have affirmed this right while noting that feeders should be responsible (designated spots, cleaning up, not obstructing public areas). Resident Welfare Associations cannot ban feeding outright.",
    ],
  },
];

export default function LearnPage() {
  return (
    <PlatformShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-bark-900 sm:text-4xl">
          Learn
        </h1>
        <p className="mt-3 text-bark-500">
          What you need to know about India&apos;s street dogs, from coexistence
          basics to the policies and data shaping their future.
        </p>

        <FloatingPillNav
          sections={[
            { id: "coexist", label: "Coexistence" },
            { id: "abc", label: "ABC" },
            { id: "rabies", label: "Rabies" },
            { id: "legal", label: "Legal" },
            { id: "sources", label: "Sources" },
          ]}
        />

        {/* Sections */}
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <section key={s.id} id={s.id} className="mt-12 scroll-mt-28">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-bark-900">
                <Icon className="h-5 w-5 text-paw-500" />
                {s.title}
              </h2>
              <div className="mt-4 space-y-3">
                {s.content.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-bark-700">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          );
        })}

        {/* Key sources */}
        <section id="sources" className="mt-12 scroll-mt-28">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-bark-900">
            <BookOpen className="h-5 w-5 text-paw-500" />
            Key sources and further reading
          </h2>
          <p className="mt-2 text-sm text-bark-400">
            {RESEARCH.length} curated references. These are pointers to real,
            public documents; always verify figures at the source.
          </p>
          <div className="mt-4 space-y-3">
            {RESEARCH.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-bark-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-bark-900">
                      {r.title}
                    </p>
                    <p className="mt-0.5 text-xs text-bark-400">
                      {r.org} / {r.year}
                    </p>
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-bark-300 hover:text-paw-500"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="mt-2 text-xs text-bark-600">{r.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-bark-50 px-2 py-0.5 text-[11px] font-medium text-bark-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {RESEARCH.length > 10 && (
            <p className="mt-4 text-sm text-bark-400">
              Showing 10 of {RESEARCH.length} sources.{" "}
              <Link href="/research" className="text-paw-600 underline">
                View all sources
              </Link>
            </p>
          )}
        </section>

        {/* CTA */}
        <div className="mt-12 rounded-lg border border-paw-100 bg-paw-50 p-6">
          <p className="font-semibold text-bark-900">
            Want to help make this information more accessible?
          </p>
          <p className="mt-1 text-sm text-bark-600">
            StrayPaw relies on open data and community contributions. If you
            know of a published source, verified statistic, or active
            organisation we have not listed, let us know.
          </p>
          <Link
            href="/get-involved"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-paw-600 px-5 py-2 text-sm font-semibold text-white hover:bg-paw-700"
          >
            Get involved <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </PlatformShell>
  );
}
