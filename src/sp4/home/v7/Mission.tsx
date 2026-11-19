import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { planFromIntent, preview } from "@/lib/kaju/registry";
import { duty } from "@/lib/kaju/capabilities";
import { MissionPlay, type MissionStep } from "./MissionPlay";
import "./mission.css";

/* ════════════════════════════════════════════════════════════════════
   One request, prepared for your approval: how Kaju works today. The
   plan below is not written for the page: it is the plan StrayPaw's own
   fixed rules make for this request (planFromIntent), with each step's
   duty from the same registry the app uses (preview, duty). Only the
   records it finds are illustrative. The step that changes several
   records waits until the visitor approves it, as it waits in the app.
   Rendered on the server, so the planner never reaches the browser.
   ════════════════════════════════════════════════════════════════════ */

const REQUEST = "Prepare this week’s follow-ups in Ward 9 for the field team and tell #field-ops";
const plan = planFromIntent({ action: "prepare_followups", place: "Ward 9", when: "this week", team: "the field team", channel: "field-ops" })!;
const steps: MissionStep[] = preview(plan).map((p, i) => {
  const d = duty(p.tool, p.level);
  return { label: p.label, who: d.who, how: d.how, waits: p.waits, body: i === 2 ? String(plan.steps[i].input.body ?? "") : undefined };
});

export function Mission() {
  return (
    <section className="s4-sec s9-mission" aria-labelledby="mission-title">
      <div className="s4-wrap s9-mission-in">
        <div className="s9-mission-copy">
          <h2 id="mission-title" className="s4-h2">One request, prepared for your approval</h2>
          <p>Kaju plans the steps, does the routine ones and shows what each one made. Anything that changes several records waits for your approval.</p>
          <Link href="/ai" className="s7-link">How Kaju works <ArrowRight size={18} aria-hidden /></Link>
        </div>
        <MissionPlay request={REQUEST} title={plan.title} steps={steps} />
      </div>
    </section>
  );
}
