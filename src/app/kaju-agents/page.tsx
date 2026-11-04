import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, ShieldCheck } from "lucide-react";
import { S4Page } from "@/sp4/site/kit";
import { AgentSetup, FeaturedAgents } from "@/sp4/home/v7/Agents";
import { ROLES } from "@/sp4/home/v7/roles";
import { RoleBot } from "@/sp4/home/v7/RoleFace";
import { CloseAndQuestions } from "@/sp4/home/v7/Sections";
import "@/sp4/home/home4.css";
import "@/sp4/home/landing.css";
import "@/sp4/home/v7/landing7.css";
import "@/sp4/home/v7/agents.css";

export const metadata = {
  title: "Kaju agents · StrayPaw",
  description: "Kaju agents run the recurring work of an animal-welfare programme: field intake, register checks, vet paperwork, release evidence, follow-ups and the monthly claim. They prepare; your team approves.",
};

const FAQ: [string, string][] = [
  ["What is a Kaju agent?", "A job Kaju runs on a schedule or when something happens, like chasing release photos every evening. Each agent states what it reads and whom it tells."],
  ["Can an agent approve or submit anything?", "No. Agents prepare drafts, reminders and reports. A named person confirms every change: vets authorise procedures, coordinators approve evidence, the programme lead submits the claim."],
  ["What can an agent read?", "Only what you allow, and never more than its owner can read. Every run logs what it read and prepared."],
  ["Do agents work on WhatsApp?", "Today Kaju reads pasted or forwarded WhatsApp messages and prepares cases. The direct WhatsApp connection is waiting for Meta approval and is shown as not connected until then."],
  ["Do we need to be technical to set one up?", "No. Pick a common job, choose when it runs and what it can use. Most organisations start with release photos and the monthly claim."],
  ["Does Kaju train on our records?", "No. Your records are not used to train models and are never shared with other organisations."],
];

export default function KajuAgentsPage() {
  return (
    <S4Page className="s6-home s7-home s7a" close={false}>
      {/* hero */}
      <section className="s7a-hero" aria-labelledby="ag-title">
        <div className="s4-wrap">
          <h1 id="ag-title" className="s7a-h1">Automate away the paperwork of animal welfare</h1>
          <p className="s7a-lede">Kaju agents chase evidence, draft vet notes and build the monthly claim: the work your team repeats every week.</p>
          <div className="s7-row"><Link href="/demo" className="s7-btn is-blue is-lg">Book a demo <ArrowRight size={16} aria-hidden /></Link><Link href="/platform" className="s7-btn is-ghost is-lg">See StrayPaw</Link></div>
          <div className="s7a-roster" aria-hidden>{ROLES.map((r) => <span key={r.key} title={r.name}><RoleBot tint={r.tint} size={40} /></span>)}</div>
        </div>
      </section>

      {/* featured agents with their run screens */}
      <section className="s4-sec" aria-labelledby="ag-stage">
        <div className="s4-wrap">
          <h2 id="ag-stage" className="s4-h2 s7a-center">Agents for every step of the programme</h2>
          <p className="s7a-sub">Receive, register, treat, release and submit: each step has work Kaju can take off your team.</p>
          <FeaturedAgents />
        </div>
      </section>

      {/* the roles */}
      <section className="s4-sec s7a-roles-sec" aria-labelledby="ag-roles">
        <div className="s4-wrap">
          <h2 id="ag-roles" className="s4-h2">One Kaju, eight jobs</h2>
          <p className="s7a-sub is-left">The roles organisations give Kaju most often. Each runs on its own schedule, with its own permissions.</p>
          <ul className="s7a-roles">
            {ROLES.map((r) => (
              <li key={r.key}>
                <RoleBot tint={r.tint} />
                <b>{r.name}</b>
                <p>{r.short}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* autopilot */}
      <section className="s4-sec s7a-split" aria-labelledby="ag-auto">
        <div className="s4-wrap s7a-split-in">
          <div>
            <h2 id="ag-auto" className="s4-h2">Put repetitive work on autopilot.</h2>
            <p className="s7a-sub is-left">Give your team agents that run recurring intake, evidence and reporting work automatically, on a schedule or when something changes.</p>
          </div>
          <div className="s7a-stage is-tight"><AgentSetup /></div>
        </div>
      </section>

      {/* every hour saved */}
      <section className="s4-sec s7a-hours" aria-labelledby="ag-hours">
        <div className="s4-wrap">
          <h2 id="ag-hours" className="s4-h2 s7a-center">Every hour saved goes back to the animals.</h2>
          <p className="s7a-sub">Agents do the checking and the paperwork. Your team spends the time in the field, in the OT and with the dogs.</p>
          <div className="s7a-three">
            <article><span><ClipboardCheck size={20} /></span><h3>Evidence on autopilot</h3><p>Release photos, places and vet sign-offs checked every day, not discovered missing at month end.</p></article>
            <article><span><BookOpen size={20} /></span><h3>Reports made easy</h3><p>The claim, the summary and the review slides, built from approved records with every figure sourced.</p></article>
            <article><span><ShieldCheck size={20} /></span><h3>Every output traceable</h3><p>Each run shows what Kaju read, what it prepared and who confirmed it. Nothing is approved automatically.</p></article>
          </div>
        </div>
      </section>

      <CloseAndQuestions faq={FAQ} />
    </S4Page>
  );
}
