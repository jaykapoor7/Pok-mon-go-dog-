import { Camera, ClipboardCheck, Copy, FileCheck2, History, Landmark, ShieldCheck, Stethoscope, Upload } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { CaptureUi, DuplicateUi, EvidenceUi, GovUi, MiniWindow, ProgrammeUi, ReportUi, ReviewUi, VetUi } from "@/sp4/home/ui";

export const metadata = {
  title: "ABC Operations & Verification · StrayPaw",
  description: "For funded ABC operators: capture, vet-authorised treatment, evidence checks, operator review and report packages a municipal office can verify.",
};

export default function AbcOperationsPage() {
  return <ProductPage s={{
    id: "abc",
    eyebrow: "ABC Operations & Verification",
    title: ["Prove every procedure", "your programme is paid for"],
    lede: "StrayPaw is the operating record for funded animal birth control programmes. Capture, treatment, evidence, review and the report package, on one record a reviewing office can check.",
    primary: { href: "/demo", label: "Book a demo" },
    secondary: { href: "/demo?type=pilot", label: "Scope a pilot" },
    hero: <MiniWindow title="Programmes · ABC drive · October" label="programme overview by ward" active={5}><ProgrammeUi /></MiniWindow>,
    heroV: 4,
    pillars: {
      title: ["Built for programmes", "where every number is checked"],
      lede: "ABC contracts are paid per procedure. The operator who can show the evidence for each one gets paid on time and keeps the contract.",
      items: [
        { t: "One record per animal", d: "Capture, surgery, vaccination and release belong to the same animal, with photos, places and the people involved." },
        { t: "Verification built in", d: "Evidence checklists, vet authorisation and duplicate checks run as the work happens, not at the end of the month." },
        { t: "Reports from records", d: "Every figure in a report package is a count of records you can open, with the exceptions explained." },
      ],
    },
    splits: [
      { id: "capture", tag: <Status s="live" />, title: ["Capture in the field,", "not at night from memory"], body: "Field staff record each animal on a phone at the point of capture: photos, sex, coat, ear notch and the exact place. The record says who created it.", points: ["Works on low-end Android phones and slow networks", "GPS and ward on every capture", "Every record names who created it"], link: { href: "/docs#field", label: "How field capture works" }, ui: <CaptureUi />, v: 0 },
      { id: "treatment", tag: <Status s="staging" />, title: ["Treatment a vet", "actually signed off"], body: "Procedures are recorded against the animal and authorised by the registered veterinarian who performed them. Nothing is marked authorised on anyone else's behalf.", points: ["Surgery, ear notch and anti-rabies vaccination", "Post-operative checks scheduled automatically", "Vet authorisation is a separate, named step"], ui: <VetUi />, v: 1 },
      { id: "evidence", tag: <Status s="staging" />, title: ["Evidence checked", "the day it is missing"], body: "Each animal carries the evidence your contract asks for. Gaps appear in the coordinator's queue straight away, while the field team can still fix them.", points: ["A checklist agreed with you for each programme", "Release checked against the capture ward", "Missing evidence also found on request by Kaju, live today"], ui: <EvidenceUi />, v: 2 },
      { id: "checks", tag: <Status s="live" />, title: ["Duplicates and mismatches,", "decided by a person"], body: "Possible duplicate animals and inconsistent records are flagged, compared side by side, and resolved with a recorded decision.", ui: <DuplicateUi />, v: 3 },
      { id: "review", tag: <Status s="staging" />, title: ["The week, reviewed", "in one queue"], body: "Your coordinator approves what is complete and explains what is not. Approval is recorded with their name and the time.", ui: <ReviewUi />, v: 4 },
      { id: "report", tag: <Status s="live" />, title: ["A report package", "the office can accept"], body: "Totals by ward and week, the evidence index, vet authorisations and an exceptions log, generated from the records. Export to PDF and XLSX.", ui: <ReportUi />, v: 5 },
      { id: "government", tag: <Status s="staging" />, title: ["Government review", "on the same record"], body: "When the funding office is ready, its reviewer gets read-only access to submitted packages, can raise a query on any exception, and records acceptance.", link: { href: "/for-governments", label: "For government" }, ui: <GovUi />, v: 0 },
    ],
    tiles: {
      title: ["Provenance you can", "read on every record"],
      items: [
        { icon: <Upload size={20} />, title: "Historical imported record", body: "Brought in from a past register. Stays labelled as historical until it is validated through review." },
        { icon: <ClipboardCheck size={20} />, title: "Operator-created record", body: "Created by a member of the operating organisation, with their name and the time." },
        { icon: <Camera size={20} />, title: "Community report", body: "Reported by a resident. Triaged by the operator before it becomes work." },
        { icon: <Stethoscope size={20} />, title: "Veterinarian-authorised", body: "A registered vet signed off the procedure on this record." },
        { icon: <FileCheck2 size={20} />, title: "Evidence reviewed", body: "A coordinator checked the evidence and approved it for reporting." },
        { icon: <Landmark size={20} />, title: "Government accepted", body: "The reviewing office accepted the package this record belongs to." },
      ],
    },
    modules: {
      title: ["Everything an ABC operator", "runs, in one workspace"],
      items: [
        { label: "Intake", t: "Intake", d: "Pickup requests, community reports and field drafts, triaged in one inbox.", href: "/docs#intake", cta: "Intake" },
        { label: "Record", t: "Animals", d: "One history per animal, from capture to release and follow-up.", href: "/docs#animals", cta: "Animals" },
        { label: "Clinic", t: "Treatment", d: "Procedures, vaccinations and vet authorisation.", href: "#treatment", cta: "Treatment" },
        { label: "Verify", t: "Evidence & checks", d: "Checklists, duplicates and exceptions, resolved by people.", href: "#evidence", cta: "Evidence" },
        { label: "Approve", t: "Review", d: "The coordinator's weekly queue and approvals.", href: "#review", cta: "Review" },
        { label: "Report", t: "Report packages", d: "Packages for the funding office, with every figure traceable.", href: "#report", cta: "Reports" },
      ],
    },
    note: <><b>What is live today.</b> Field capture, cases, follow-ups, case review, duplicate checks, missing-evidence search, register imports and PDF/XLSX reports run in the product now. The per-animal evidence checklist, vet authorisation, the weekly approval step and the government reviewer role are built in our staging environment and will be switched on with the first pilot. Records shown on this page are illustrative.</>,
    faq: [
      ["Do we have to change how our clinic works?", "No. StrayPaw records the steps you already take. The checklist is set per programme to match your contract."],
      ["What about our past registers?", "Import them from Excel or CSV. They stay labelled as historical imported records, so they are never mixed up with work recorded live."],
      ["Who can mark a procedure as authorised?", "Only a member with the veterinarian role on that organisation, and only for themselves."],
      ["Can the municipal office change our records?", "No. Reviewers read submitted packages and can raise queries or record acceptance. They cannot edit operator records."],
    ],
    close: { a: "Show the office", b: "every procedure, with its evidence." },
  }} />;
}
