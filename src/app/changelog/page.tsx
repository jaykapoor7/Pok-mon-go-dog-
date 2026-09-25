import Link from "next/link";
import { MarketingPage, Band } from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Changelog, StrayPaw",
  description: "What shipped on StrayPaw, month by month, in plain language.",
};

/* Entries are written by hand, newest first, and describe what changed for
   the people using the product rather than which files moved. Dates are the
   month the work went live. Nothing is listed here that is not on the site. */
const ENTRIES: { month: string; items: string[] }[] = [
  {
    month: "September 2026",
    items: [
      "Reporting no longer requires a photograph. A located, described sighting is enough; a field team can add the photo later.",
      "Added a page for municipal bodies covering coverage methodology, auditability and how the register is maintained.",
      "The app works offline. Pages you have already opened stay readable without a signal, and the register is never served stale while you are online.",
      "Animal records now carry structured data and appear in the sitemap, so a record can be cited, not just read.",
      "Public rescue stories are only published once the case is actually closed, so nothing is labelled completed while it is still open.",
      "Fixed the post-bite first-aid steps being covered by the section bar on /resources.",
      "Reconciled the street-dog population figure across the site: the 2019 census count and the higher modelled estimates are now distinguished, with sources.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <MarketingPage
      title="What shipped,"
      accent="month by month."
      lede="A running record of what changed on StrayPaw. Written for the people who use it, not for the people who built it."
      next={[
        { label: "See the register", href: "/map", note: "The live map of animals on the record." },
        { label: "Suggest a change", href: "/contact?subject=Product%20feedback", note: "Field teams find the things we miss." },
      ]}
    >
      {ENTRIES.map((entry, i) => (
        <Band
          key={entry.month}
          tone={i % 2 === 0 ? "paper" : "bone"}
          kicker={entry.month.toUpperCase()}
          title="Shipped"
          accent={entry.month.split(" ")[0].toLowerCase() + "."}
        >
          <ul className="mk-list">
            {entry.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Band>
      ))}
      <Band tone="paper" title="Earlier work" accent="is in the record.">
        <p className="mk-body">
          This log starts in September 2026. Work before that built the register
          itself: the animal identity model, the partner console, the evidence
          pages and the first historical import. The{" "}
          <Link href="/evidence">evidence pages</Link> are the best account of
          what that produced.
        </p>
      </Band>
    </MarketingPage>
  );
}
