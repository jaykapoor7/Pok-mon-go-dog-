import { Syringe, Stethoscope, Camera, FileCheck2, Copy, Landmark } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { MiniWindow, ProgrammeUi, ReportUi, VetUi } from "@/sp4/home/ui";

export const metadata = {
  title: "ABC / ARV programmes · StrayPaw",
  description: "Sterilisation and anti-rabies vaccination programmes recorded animal by animal, with vet authorisation, evidence and reports.",
};

export default function AbcArvPage() {
  return <ProductPage s={{
    id: "arv",
    eyebrow: "ABC / ARV programmes",
    title: ["Sterilisation and vaccination,", "animal by animal"],
    lede: "Run sterilisation drives and anti-rabies vaccination camps on one record: every animal, every procedure, every dose, and the evidence for each.",
    primary: { href: "/abc-operations", label: "See ABC Operations" },
    secondary: { href: "/demo", label: "Book a demo" },
    hero: <MiniWindow title="Programmes · ABC drive" label="programme overview" active={5}><ProgrammeUi /></MiniWindow>,
    heroV: 0,
    splits: [
      { tag: <Status s="staging" />, title: ["Procedures and doses,", "signed by the vet"], body: "Surgery, ear notch and vaccination are recorded on the animal and authorised by the vet who did them.", ui: <VetUi />, v: 1 },
      { tag: <Status s="live" />, title: ["Drive totals", "you can open"], body: "Every total in a drive or camp report opens to the animals behind it.", ui: <ReportUi />, v: 5 },
    ],
    tiles: {
      title: ["What each", "programme records"],
      items: [
        { icon: <Camera size={20} />, title: "Capture and release", body: "Photos and places for both, so release can be checked against capture." },
        { icon: <Stethoscope size={20} />, title: "Surgery", body: "Procedure, vet and post-operative checks." },
        { icon: <Syringe size={20} />, title: "Vaccination", body: "Anti-rabies doses with batch and date." },
        { icon: <Copy size={20} />, title: "Duplicates", body: "Possible repeats flagged for a person to decide." },
        { icon: <FileCheck2 size={20} />, title: "Evidence", body: "A checklist per programme, matched to your contract." },
        { icon: <Landmark size={20} />, title: "Reporting", body: "Packages for the office that funds the programme." },
      ],
    },
  }} />;
}
