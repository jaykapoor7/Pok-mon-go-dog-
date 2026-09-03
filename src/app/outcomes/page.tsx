import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Outcomes, StrayPaw",
  description:
    "Every funded action keeps a verifiable record: what was done, where, by whom, and what changed.",
};

const OUTCOMES = [
  {
    id: "SP-OUT-024",
    title: "Rohini sterilisation cluster",
    body: "Study signal → partner NGO → funded intervention → post-field verification.",
    metrics: [
      ["24", "animals reached"],
      ["₹3.4L", "allocated"],
      ["86%", "confidence"],
      ["12.08.26", "closed"],
    ],
    method: "Field + photo + NGO log + geo",
  },
  {
    id: "SP-OUT-021",
    title: "Nizamuddin vaccination drive",
    body: "Coverage gap identified in study SP-ST-011, closed over two field weekends.",
    metrics: [
      ["61", "animals reached"],
      ["₹1.9L", "allocated"],
      ["91%", "confidence"],
      ["28.06.26", "closed"],
    ],
    method: "Field + vet record + geo",
  },
  {
    id: "SP-OUT-018",
    title: "CR Park feeding-point rationalisation",
    body: "Six informal points consolidated to three, agreed with resident association.",
    metrics: [
      ["3", "points established"],
      ["₹0.6L", "allocated"],
      ["78%", "confidence"],
      ["14.05.26", "closed"],
    ],
    method: "Field + community log + geo",
  },
];

export default function OutcomesPage() {
  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Evidence layer / outcomes</span>
          <h1>
            Measure the <em>answer.</em>
          </h1>
        </div>
        <Link href="/studies" className="spa-cta">
          View studies
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
        An outcome closes the loop: funding, execution, reach and verification stay
        attached to the study that identified the need.
      </p>

      <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
        {OUTCOMES.map((o) => (
          <div
            key={o.id}
            style={{
              background: "#10182b",
              color: "#f4f5f7",
              border: "1px solid #30496e",
              padding: 20,
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: "linear-gradient(#8fb7ff, #ff6a4f)",
              }}
            />
            <div
              className="spa-mono"
              style={{ display: "flex", justifyContent: "space-between", color: "#7f877b" }}
            >
              <span>StrayPaw / outcome record</span>
              <span>{o.id}</span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 22,
                alignItems: "center",
                borderTop: "1px solid #2e3b56",
                borderBottom: "1px solid #2e3b56",
                padding: "26px 0",
                margin: "16px 0 20px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 78,
                  height: 78,
                  flexShrink: 0,
                  border: "1px solid #8fb7ff",
                  color: "#8fb7ff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 8,
                  letterSpacing: "0.1em",
                  textAlign: "center",
                  textTransform: "uppercase",
                }}
              >
                <Check size={20} />
                <span>
                  Verified
                  <br />
                  outcome
                </span>
              </div>
              <div style={{ minWidth: 220, flex: 1 }}>
                <h3
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontWeight: 400,
                    fontSize: 27,
                    lineHeight: 1,
                    margin: "0 0 8px",
                  }}
                >
                  {o.title}
                </h3>
                <p style={{ color: "#8a9285", fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
                  {o.body}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {o.metrics.map(([v, l]) => (
                <div key={l}>
                  <b
                    style={{
                      display: "block",
                      fontFamily: "var(--font-display), serif",
                      fontWeight: 400,
                      fontSize: 21,
                      color: "#8fb7ff",
                    }}
                  >
                    {v}
                  </b>
                  <span
                    className="spa-mono"
                    style={{ display: "block", color: "#7f877b", marginTop: 3 }}
                  >
                    {l}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="spa-mono"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                borderTop: "1px solid #2e3b56",
                paddingTop: 13,
                color: "#7f877b",
              }}
            >
              <span>Method / {o.method}</span>
              <span style={{ color: "#8fb7ff", display: "flex", alignItems: "center", gap: 5 }}>
                View provenance <ArrowUpRight size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
