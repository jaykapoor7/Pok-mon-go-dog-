import Link from "next/link";
import { countDogs, getAllDogs } from "@/lib/data";
import { getPublishedCaseStoriesCached as getPublishedCaseStories, getPublicCareTimelineCached as getPublicCareTimeline } from "@/lib/community-case-stories-cached";

export const metadata = {
  title: "Transparency, StrayPaw",
  description:
    "The register in numbers: animals recorded, localities reached, care logged and outcomes published. Every figure is counted from the live record.",
};

export const dynamic = "force-dynamic";

/* Every number on this page is counted from the register at request time.
   Nothing is typed in, and nothing is estimated. Where a figure is not yet
   something the register can produce, the page says so instead of printing
   a plausible one -- an organisation that publishes numbers it cannot
   support is worth less than one that publishes fewer. */
export default async function TransparencyPage() {
  const [total, dogs, stories, care] = await Promise.all([
    countDogs(),
    getAllDogs(),
    getPublishedCaseStories(),
    getPublicCareTimeline(),
  ]);

  const localities = new Set(
    dogs.map((d) => (d.zone ?? "").trim().toLowerCase()).filter(Boolean),
  ).size;
  const withPhoto = dogs.filter((d) => d.cover_photo).length;
  const animalsWithCare = new Set(care.map((c) => c.dog_id).filter(Boolean)).size;

  const rows: { label: string; value: string; note: string }[] = [
    { label: "Animals on the record", value: total.toLocaleString("en-IN"), note: "Distinct animal identities in the public register." },
    { label: "Animals with a recorded location", value: dogs.length.toLocaleString("en-IN"), note: "Those that can be placed on the map. The rest are recorded without usable coordinates." },
    { label: "Localities reached", value: localities.toLocaleString("en-IN"), note: "Distinct localities named across the register." },
    { label: "Animals with logged care", value: animalsWithCare.toLocaleString("en-IN"), note: "At least one treatment, vaccination or sterilisation event on the record." },
    { label: "Completed journeys published", value: stories.length.toLocaleString("en-IN"), note: "Cases closed with an issue, care, an outcome and a date." },
    { label: "Animals with a photograph", value: withPhoto.toLocaleString("en-IN"), note: "A photograph is not required to report, so this is lower than the total by design." },
  ];

  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#0b1e3d]">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6">
        <header className="border-b border-[#0b1e3d]/10 pb-7">
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#2457ce]">Transparency</p>
          <h1 className="mt-2 text-[clamp(2.1rem,6vw,3.6rem)] font-semibold leading-[.95] tracking-[-.05em]">
            The register, counted.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 opacity-60">
            Every figure below is counted from the live record when this page loads.
            None of it is typed in or estimated. Where the register cannot yet produce
            a number, this page says so rather than printing a plausible one.
          </p>
        </header>

        <section className="mt-2">
          <dl className="divide-y divide-[#0b1e3d]/10">
            {rows.map((r) => (
              <div key={r.label} className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                <div>
                  <dt className="text-sm font-semibold">{r.label}</dt>
                  <p className="mt-1 max-w-xl text-xs leading-5 opacity-55">{r.note}</p>
                </div>
                <dd className="text-3xl font-semibold tabular-nums tracking-[-.04em] sm:text-right">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 border-t border-[#0b1e3d]/10 pt-7">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-40">Not published yet</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-.03em]">What this page cannot tell you.</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 opacity-65">
            <li>
              <b className="opacity-100">Ward-level coverage against the WHO 70% threshold.</b>{" "}
              The register holds localities, not a complete ward geometry for every
              city, so a national coverage percentage would be a guess. What is
              known per state is on <Link href="/gaps" className="font-semibold text-[#2457ce]">what is known</Link>.
            </li>
            <li>
              <b className="opacity-100">Money.</b> StrayPaw does not yet run a
              published budget line. When it does, the figures will appear here
              with the same rule: counted, not asserted.
            </li>
            <li>
              <b className="opacity-100">Outcomes as a rate.</b> Outcome recording
              is uneven across imported historical records, so publishing a
              recovery or release rate now would describe the recording, not the
              animals.
            </li>
          </ul>
        </section>

        <footer className="mt-10 flex flex-wrap gap-4 border-t border-[#0b1e3d]/10 pt-6 text-sm font-semibold">
          <Link href="/evidence">The evidence</Link>
          <Link href="/gaps">What is not known</Link>
          <Link href="/data-governance">Data governance</Link>
          <Link href="/contact?subject=Transparency%20question">Ask a question</Link>
        </footer>
      </div>
    </main>
  );
}
