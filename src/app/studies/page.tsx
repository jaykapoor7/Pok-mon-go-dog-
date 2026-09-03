import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Studies, StrayPaw",
  description:
    "Funded studies turn a geographic question into structured field evidence.",
};

type Status = "In field" | "Scoping" | "Closed" | "Seeking funder";

const STUDIES: {
  id: string;
  title: string;
  geo: string;
  status: Status;
  partner: string;
  question: string;
  budget: string;
}[] = [
  {
    id: "SP-ST-014",
    title: "Rohini sterilisation coverage",
    geo: "Rohini, Delhi",
    status: "In field",
    partner: "Partner NGO assigned",
    question: "What share of the local population is already sterilised?",
    budget: "₹3.4L",
  },
  {
    id: "SP-ST-013",
    title: "Jahangirpuri baseline census",
    geo: "Jahangirpuri, Delhi",
    status: "Scoping",
    partner: "Shortlisting partners",
    question: "How many animals, and where are the clusters?",
    budget: "₹2.8L",
  },
  {
    id: "SP-ST-011",
    title: "Nizamuddin rabies exposure",
    geo: "Nizamuddin, Delhi",
    status: "Closed",
    partner: "Fieldwork complete",
    question: "Where are vaccination coverage gaps concentrated?",
    budget: "₹4.1L",
  },
  {
    id: "SP-ST-016",
    title: "South Delhi feeding-point mapping",
    geo: "South Delhi",
    status: "Seeking funder",
    partner: "Open to CSR partner",
    question: "Which feeding points carry the highest animal load?",
    budget: "₹2.2L",
  },
];

const TONE: Record<Status, string> = {
  "In field": "#66c5d5",
  Scoping: "#a68cff",
  Closed: "#6aa84f",
  "Seeking funder": "#ff6a4f",
};

export default function StudiesPage() {
  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / studies</span>
          <h1>
            Fund the <em>question.</em>
          </h1>
        </div>
        <Link href="/partner-apply" className="spa-cta">
          Propose a study
        </Link>
      </div>

      <p
        style={{
          maxWidth: 560,
          marginTop: 18,
          fontSize: 14,
          lineHeight: 1.6,
          color: "#5b6472",
        }}
      >
        Each study names a geography, a question, a method and an executing partner.
        Findings stay attached to the records they came from.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
        {STUDIES.map((s) => (
          <div className="spa-panel" key={s.id}>
            <div className="spa-panel-head">
              <b>{s.title}</b>
              <span
                className="spa-chip"
                style={{ background: `${TONE[s.status]}22`, color: TONE[s.status] }}
              >
                {s.status}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#5b6472", lineHeight: 1.55 }}>
              {s.question}
            </p>
            <div
              style={{
                display: "flex",
                gap: 26,
                flexWrap: "wrap",
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid #e2e7ee",
              }}
            >
              <Meta label="Record" value={s.id} />
              <Meta label="Geography" value={s.geo} />
              <Meta label="Partner" value={s.partner} />
              <Meta label="Budget" value={s.budget} />
            </div>
          </div>
        ))}
      </div>

      <div className="spa-strip">
        <div>
          <span className="spa-mono">For CSR teams</span>
          <h4>Fund a study, get an evidence-backed intervention.</h4>
        </div>
        <div />
        <Link href="/partner-apply">
          Start an initiative <ArrowUpRight size={14} />
        </Link>
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        className="spa-mono"
        style={{ color: "#8a93a0", display: "block", marginBottom: 4 }}
      >
        {label}
      </span>
      <b style={{ fontSize: 12.5, fontWeight: 500 }}>{value}</b>
    </div>
  );
}
