import Link from "next/link";
import { BackLink } from "@/components/app/BackLink";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PreLaunch } from "@/components/app/PreLaunch";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Outcomes, StrayPaw",
  description:
    "Every funded action keeps a verifiable record. No intervention has closed yet, so this register is empty.",
};

/* What a closed record will carry. Describing the schema is honest; filling
   it with an example would not be. */
const RECORD_FIELDS = [
  ["Geography", "Where the work happened, at the finest resolution the fieldwork supports"],
  ["Method", "How reach was counted, and by whom"],
  ["Reach", "Animals actually treated, not animals targeted"],
  ["Funding", "Amount, funder, and what it was spent against"],
  ["Partner", "The organisation that executed it"],
  ["Verification", "Who checked, when, and what they checked against"],
  ["Confidence", "How much the method supports the number"],
];

export default function OutcomesPage() {
  return (
    <AppShell>
      <BackLink label="Back to the evidence" to="/evidence" />
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / outcomes</span>
          <h1>
            Measure the <em>answer.</em>
          </h1>
        </div>
        <Link href="/studies" className="spa-cta">
          View studies <ArrowUpRight size={14} />
        </Link>
      </div>

      <p className="spa-lede">
        An outcome closes the loop: funding, execution, reach and verification
        stay attached to the study that identified the need.
      </p>

      <PreLaunch
        Icon={ShieldCheck}
        what="outcome records"
        fills="An outcome appears here when a funded intervention closes and its reach has been verified in the field."
        cta={{ href: "/what-would-it-take", label: "Cost an intervention" }}
      />

      <section className="queue">
        <h2 className="queue-head">
          <span className="spa-mono">The record format</span>
          What every closed outcome will carry
        </h2>
        <p className="queue-lede">
          Published in full, including the confidence rating. A record that
          cannot support scrutiny is not worth keeping.
        </p>
        <dl className="schema">
          {RECORD_FIELDS.map(([field, desc]) => (
            <div key={field}>
              <dt>{field}</dt>
              <dd>{desc}</dd>
            </div>
          ))}
        </dl>
      </section>
    </AppShell>
  );
}
