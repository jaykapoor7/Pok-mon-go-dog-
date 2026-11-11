import { Ban, CalendarOff, ClipboardList, EyeOff, FlaskConical, Lightbulb, PhoneCall } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { ListUi, MiniWindow } from "@/sp4/home/ui";

export const metadata = {
  title: "Hospitals & laboratories · StrayPaw",
  description: "For anti-rabies clinics, health centres and diagnostic laboratories in a city programme: a bite register, dose tracking under clinical control, service confirmations, and samples with their chain of custody.",
};

const rollout = <span className="s4-tag is-blue">In rollout · clinical review first</span>;

export default function HospitalsPage() {
  return <ProductPage s={{
    id: "hosp",
    eyebrow: "Hospitals & laboratories",
    title: ["The register you already keep,", "connected to everyone who acts on it"],
    lede: "A bite recorded once at the desk. Doses that do not get missed. A sample that arrives with its history.",
    primary: { href: "/demo?type=programme", label: "Talk to us about a programme" },
    secondary: { href: "/for-governments", label: "For the programme cell" },
    hero: <MiniWindow place="clinic" title="Anti-rabies clinic · Today" label="a clinic's doses due today"><ListUi title="Today" sub="3 things need someone" action="Record a bite" rows={[["Dose 1 of 5 · OPD 4471", "3 days overdue · consent to call", "Call", "amber"], ["Dose 3 of 5 · OPD 4402", "Due today", "Record dose", "blue"], ["Course complete · OPD 4318", "Tell the patient their course is done", "Done", "green"]]} /></MiniWindow>,
    heroV: 3,
    pillars: {
      title: ["Clinical decisions", "stay with clinicians"],
      lede: "StrayPaw keeps the record and shows what is due. It never assesses, schedules or suggests treatment.",
      items: [
        { t: "The clinician decides", d: "The exposure category, the regimen and every dose date are recorded exactly as the clinician set them." },
        { t: "No name is stored", d: "A patient is your own register number. Other partners see counts, and small counts are hidden." },
        { t: "Every read is logged", d: "Opening a record writes who and when. The log cannot be edited." },
      ],
    },
    splits: [
      { tag: rollout, title: ["One minute", "per bite"], body: "Record the bite at the desk. The area’s field team is asked to find the animal, with the place and its description and never the patient.", ui: <MiniWindow place="clinic" active={1} title="Bite register" label="a facility’s bite register"><ListUi title="Bite register" sub="This week" rows={[["OPD 4471 · Category III", "Dog, street · wound washed before arrival", "Course started", "blue"], ["OPD 4466 · Category II", "Cat, owned", "Course started", "blue"], ["OPD 4460 · Category III", "Dog, street · animal follow-up requested", "Field team asked", "amber"]]} /></MiniWindow>, v: 1 },
      { tag: rollout, title: ["Say what you can", "offer today"], body: "Confirm vaccine, immunoglobulin and wound washing in one tap. A confirmation expires within a week, so an old answer is never shown as current.", ui: <MiniWindow place="clinic" active={3} title="Services" label="a facility’s service confirmations"><ListUi title="Services" sub="Confirmed today" action="Confirm" rows={[["Anti-rabies vaccine", "Confirmed by the nurse in charge", "Available", "green"], ["Immunoglobulin", "Refers to the teaching hospital", "Limited", "amber"], ["Wound washing", "Open 8 am to 8 pm", "Available", "green"]]} /></MiniWindow>, v: 4 },
      { tag: rollout, title: ["A sample arrives", "with its history"], body: "Every hand a sample passes through is recorded. The result carries its method and reaches the sender and the programme together.", ui: <MiniWindow place="lab" title="Reference laboratory · Samples" label="a laboratory’s sample list"><ListUi title="Samples" sub="3 in the laboratory" rows={[["S-2614 · brain tissue", "Handed to courier 2 hours ago", "Arriving", "amber"], ["S-2611 · brain tissue", "Fluorescent antibody test", "Testing", "blue"], ["S-2607 · result reported", "Sender and programme told", "Reported", "green"]]} /></MiniWindow>, v: 2 },
    ],
    tiles: {
      title: ["What StrayPaw", "never does"],
      items: [
        { icon: <Lightbulb size={20} />, title: "Never assesses", body: "The exposure category is the one the clinician records." },
        { icon: <CalendarOff size={20} />, title: "Never schedules", body: "Dose dates are the dates the clinician sets." },
        { icon: <Ban size={20} />, title: "Never suggests treatment", body: "The regimen is written by the clinician, in their words." },
        { icon: <EyeOff size={20} />, title: "Never shares a patient", body: "Other partners see counts. Small counts are hidden." },
        { icon: <PhoneCall size={20} />, title: "Reminders are phone calls", body: "Calls are logged by the clinic. SMS and WhatsApp are not connected.", tag: <Status s="off" /> },
        { icon: <ClipboardList size={20} />, title: "No stock system", body: "Availability is what each facility confirms, with a name and a date.", tag: <Status s="off" /> },
        { icon: <FlaskConical size={20} />, title: "Result wording", body: "The laboratory’s own result vocabulary is agreed before real use." },
      ],
    },
    note: <><b>Where this is today.</b> Built and tested with illustrative records. No hospital or laboratory is connected yet, and real use needs clinical, ethics and data-protection review by the partners involved.</>,
    faq: [
      ["Who can see a patient’s record?", "Only staff at the facility that treats the person. Other partners see counts, and counts below a threshold are hidden."],
      ["Does StrayPaw decide treatment?", "Never. A clinician records the category they assessed, writes the regimen and sets each dose date."],
      ["Do we need new hardware?", "No. The desk form and the dose list run in a browser on the computer or phone you already use."],
    ],
    close: { a: "Clinical review", b: "comes first.", primary: { href: "/demo?type=programme", label: "Talk to us about a programme" }, secondary: { href: "/security", label: "Security" } },
  }} />;
}
