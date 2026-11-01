import { Bell, CalendarClock, HeartPulse, Inbox, PawPrint, Users } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { AuditUi, MiniWindow, ProposeUi, RescueUi } from "@/sp4/home/ui";

export const metadata = {
  title: "Rescue & care · StrayPaw",
  description: "From a request to a recorded outcome: inbox, cases, treatment and follow-ups on one animal history.",
};

export default function RescueCarePage() {
  return <ProductPage s={{
    id: "rc",
    eyebrow: "Rescue & care",
    title: ["From a request", "to a recorded outcome"],
    lede: "Requests from residents and field teams arrive in one inbox. Cases are taken, treated, followed up and closed with an outcome, on the same history as the animal's sterilisation and vaccination.",
    primary: { href: "/demo", label: "Book a demo" },
    secondary: { href: "/community/report", label: "Report an animal" },
    hero: <MiniWindow title="Rescue · Cases" label="rescue case list" active={2}><RescueUi /></MiniWindow>,
    heroV: 5,
    steps: {
      title: ["Every case,", "closed with an outcome"],
      items: [
        { t: "Request", d: "Residents report on the web; teams log their own." },
        { t: "Take the case", d: "Assign it and record treatment and notes." },
        { t: "Follow up", d: "Due dates for checks, dressings and boosters." },
        { t: "Close", d: "Treated, released, adopted, or why it closed." },
      ],
    },
    splits: [
      { tag: <Status s="live" />, title: ["Follow-ups that", "do not slip"], body: "Kaju can prepare the next check for you; a person confirms it and the team sees what is due.", ui: <ProposeUi />, v: 2 },
      { tag: <Status s="live" />, title: ["A history the", "vet can trust"], body: "Every treatment and note is dated and named, so whoever picks up the case knows what happened.", ui: <MiniWindow title="Case · History" label="a case history"><AuditUi /></MiniWindow>, v: 4 },
    ],
    tiles: {
      title: ["Built for", "rescue teams"],
      items: [
        { icon: <Inbox size={20} />, title: "Inbox & triage", body: "Community reports and your own requests, in one queue." },
        { icon: <PawPrint size={20} />, title: "Animal history", body: "Every request, treatment and outcome on one record." },
        { icon: <HeartPulse size={20} />, title: "Care ledger", body: "Every care record across animals, for the team and the vet." },
        { icon: <CalendarClock size={20} />, title: "Follow-ups", body: "What is due today, overdue, or moved." },
        { icon: <Users size={20} />, title: "Team assignment", body: "Who holds which case, visible to the team." },
        { icon: <Bell size={20} />, title: "Honest receipts", body: "Residents see their report was received, never a promise of a rescue time." },
      ],
    },
    close: { a: "Close every case", b: "with an outcome.", primary: { href: "/demo", label: "Book a demo" }, secondary: { href: "/for-community", label: "For community groups" } },
  }} />;
}
