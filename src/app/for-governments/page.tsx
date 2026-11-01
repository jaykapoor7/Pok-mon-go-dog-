import { ClipboardCheck, Eye, FileCheck2, History, Landmark, MessageSquareWarning } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { GovUi, MiniWindow, PackageListUi, ReportUi } from "@/sp4/home/ui";

export const metadata = {
  title: "Government oversight · StrayPaw",
  description: "For municipal offices that fund ABC and anti-rabies programmes: review operator report packages on the same record, query exceptions and record acceptance.",
};

export default function GovernmentPage() {
  return <ProductPage s={{
    id: "gov",
    eyebrow: "Government oversight",
    title: ["Check the work", "before you pay for it"],
    lede: "Your ABC operator keeps every procedure on one record, with its evidence. Your reviewer sees the package they submit, queries what does not add up, and records acceptance on the same record.",
    primary: { href: "/demo?type=pilot", label: "Request a government demo" },
    secondary: { href: "/abc-operations", label: "How operators record the work" },
    hero: <MiniWindow title="Reviewing office · Packages" label="the reviewing office's package list" active={4}><PackageListUi /></MiniWindow>,
    heroV: 4,
    pillars: {
      title: ["Oversight without", "a second system"],
      lede: "StrayPaw starts with the operator doing the work. The reviewing office joins the same record when it is ready, instead of receiving a spreadsheet of totals.",
      items: [
        { t: "Animal-level evidence", d: "Every count in a package opens to the animals behind it: capture, surgery, vaccination, release and photos." },
        { t: "Exceptions, explained", d: "Missing evidence and possible duplicates are listed with the operator's explanation, not hidden in a total." },
        { t: "Read-only by design", d: "Reviewers cannot edit operator records. Queries and acceptance are recorded separately, with names and dates." },
      ],
    },
    splits: [
      { tag: <Status s="staging" />, title: ["Review a package", "in minutes, not weeks"], body: "Open a submitted package, see what was authorised by a vet and what is still an exception, and accept it or return it with a query.", ui: <GovUi v={2} />, v: 0 },
      { tag: <Status s="live" />, title: ["Reports with", "their method attached"], body: "Totals by ward and week, the evidence index and the exceptions log, exported to PDF and XLSX for your file.", ui: <ReportUi v={3} />, v: 5 },
    ],
    tiles: {
      title: ["What a reviewer", "can and cannot do"],
      items: [
        { icon: <Eye size={20} />, title: "Read submitted packages", body: "Only the packages an operator has submitted to your office, and the records inside them." },
        { icon: <MessageSquareWarning size={20} />, title: "Raise a query", body: "Ask about any exception. The operator answers on the record." },
        { icon: <FileCheck2 size={20} />, title: "Record acceptance", body: "Accept a package with your name and the date. It is never accepted automatically." },
        { icon: <ClipboardCheck size={20} />, title: "Cannot edit records", body: "Operator records stay the operator's. Reviewers cannot change them." },
        { icon: <History size={20} />, title: "Full history", body: "Every submission, query, answer and acceptance is kept in order." },
        { icon: <Landmark size={20} />, title: "Your procurement", body: "We work within how your department buys. We do not claim compliance with a tender we have not read." },
      ],
    },
    note: <><b>Where this is today.</b> The operator side is live. The reviewer role, package submission, queries and acceptance are built and tested in our staging environment and are offered as part of a pilot with an operator you already fund. No municipality has accepted a package on StrayPaw yet.</>,
    faq: [
      ["Do we need to buy anything to review?", "A pilot is scoped with you and the operator you fund before any work begins. Pricing is agreed per programme."],
      ["Can we compare operators?", "Once more than one operator submits packages to your office, yes: by ward, period and evidence completeness."],
      ["Does StrayPaw replace our existing systems?", "No. It holds the programme record. We integrate with a department's system only when it asks."],
    ],
    close: { a: "Ask your operator for", b: "a package you can check.", primary: { href: "/demo?type=pilot", label: "Request a government demo" }, secondary: { href: "/abc-operations", label: "See the operator workflow" } },
  }} />;
}
