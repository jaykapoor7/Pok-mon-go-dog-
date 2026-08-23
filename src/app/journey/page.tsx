import Link from "next/link";
import { Mail } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const dynamic = "force-static";

export const metadata = {
  title: "Our journey, StrayPaw",
  description:
    "Why StrayPaw exists: making the invisible work of street-animal care visible, counted, and shared.",
};

const MAILTO = "/contact";

export default function JourneyPage() {
  return (
    <MarketingShell
      eyebrow="Our journey"
      title="Making invisible work visible."
    >
      <div className="space-y-5 text-lg leading-relaxed text-bark-700 dark:text-bark-200">
        <p>
          StrayPaw started with a simple frustration. The people who care for
          street animals, feeders, rescuers, small NGOs, do extraordinary work.
          But that work lives in WhatsApp groups and paper notebooks: invisible,
          uncounted, and impossible to build on.
        </p>
        <p>
          So we built an open map. Anyone can report an animal. Anyone can see
          what&apos;s being done. The coverage and care data that used to sit locked
          inside individual organizations is opened up{" "}
          <span className="font-semibold text-bark-900 dark:text-bark-50">
            for the people, by the people.
          </span>
        </p>
        <p>
          Now organizations are joining to document their cases and raise for the
          needs that matter, on a platform their supporters can trust. Each
          rescue becomes a record. Each campaign becomes a page you can share.
          That&apos;s the next chapter, and it&apos;s just beginning.
        </p>
        <p className="font-display text-xl font-bold tracking-tight text-paw-600 dark:text-paw-300">
          For the animals, for the people, by the people.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href={MAILTO} className="btn-primary px-6 py-3 text-base">
          <Mail className="h-4 w-4" /> Partner with us
        </a>
        <Link href="/orgs" className="btn-ghost px-6 py-3 text-base">
          See organizations
        </Link>
      </div>
    </MarketingShell>
  );
}
