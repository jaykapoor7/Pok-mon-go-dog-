import { Bell, CalendarClock, HeartPulse, Inbox, PawPrint, Users } from "lucide-react";
import { DemoWindow } from "@/sp3/home/Demos";
import { SolutionPage } from "@/sp3/site/Solution";

export const metadata = {
  title: "Rescue & care · StrayPaw",
  description: "From a resident's report to a recorded outcome: inbox, cases, treatment, follow-ups and care centre records on one animal history.",
};

export default function RescueCarePage() {
  return <SolutionPage s={{
    eyebrow: "Rescue & care",
    title: "From a request to a recorded outcome.",
    lede: "Requests from residents and field teams arrive in one inbox. Cases are taken, treated, followed up and closed with an outcome, on the same animal history as its sterilisation and vaccination.",
    primary: { href: "/partner-apply", label: "Apply for a workspace" },
    secondary: { href: "/community/report", label: "Report an animal" },
    visual: <DemoWindow view="prepared" title="Case · prepared from a field message" />,
    problem: {
      title: "Rescue work disappears into chat threads.",
      body: "A resident messages, someone goes, the animal is treated. Weeks later nobody can say what happened, whether the follow-up was done, or how many cases the team closed.",
      points: ["Requests lost between phones", "Follow-ups without reminders", "Outcomes never written down"],
    },
    steps: [
      { t: "Request", d: "Residents report on the web; teams log their own." },
      { t: "Take the case", d: "Assign it and record treatment and notes." },
      { t: "Follow up", d: "Due dates for checks, dressing changes and boosters." },
      { t: "Close with an outcome", d: "Treated, released, adopted, or why it closed." },
    ],
    features: [
      { icon: <Inbox size={18} />, t: "Inbox & triage", d: "Community reports and your own requests, in one queue.", href: "/ngo/inbox" },
      { icon: <PawPrint size={18} />, t: "Animal history", d: "Every request, treatment and outcome on one record.", href: "/ngo/animals" },
      { icon: <HeartPulse size={18} />, t: "Care ledger", d: "Every care record across animals, for the team and the vet.", href: "/ngo/care" },
      { icon: <CalendarClock size={18} />, t: "Follow-ups", d: "What is due today, overdue, or moved." },
      { icon: <Users size={18} />, t: "Team assignment", d: "Who holds which case, visible to the team." },
      { icon: <Bell size={18} />, t: "Reporter updates", d: "Residents see that their report was received, never a false promise of rescue." },
    ],
    notes: ["Reporting does not guarantee a rescue or a response time; the receipt says so."],
    story: "the-kind-hour-foundation",
    cta: { title: "Close every case with an outcome.", primary: { href: "/partner-apply", label: "Apply for a workspace" }, secondary: { href: "/demo", label: "Book a demo" } },
  }} />;
}
