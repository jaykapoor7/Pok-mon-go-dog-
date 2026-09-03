import Link from "next/link";
import { ArrowUpRight, ChevronRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Console, StrayPaw" };

/* Illustrative until the data layer is wired — the shape is the point. */
const KPIS = [
  { label: "Live sightings", value: "65", sub: "+8 in the last 24 hours" },
  { label: "Active cases", value: "12", sub: "4 need a volunteer today" },
  { label: "Data gaps", value: "07", sub: "across 3 local clusters", alert: true },
];

const NEARBY = [
  {
    title: "Injured dog near Masjid Moth",
    time: "09:43",
    pct: 78,
    tone: "",
    note: "Volunteer needed / 1.2 km away",
    href: "/map",
  },
  {
    title: "18 unsterilised animals, Rohini",
    time: "09:38",
    pct: 48,
    tone: "field",
    note: "Study signal / validating",
    href: "/studies",
  },
  {
    title: "SP-1039 · vet confirmed",
    time: "09:31",
    pct: 100,
    tone: "done",
    note: "Case update / resolved",
    href: "/outcomes",
  },
];

export default function ConsoleHome() {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">{today} / Delhi NCR</span>
          <h1>
            Good morning, <em>neighbour.</em>
          </h1>
        </div>
        <Link href="/report" className="spa-cta">
          + Report an animal
        </Link>
      </div>

      <div className="spa-kpis">
        {KPIS.map((k) => (
          <div className={`spa-kpi ${k.alert ? "alert" : ""}`} key={k.label}>
            <span>{k.label}</span>
            <b>{k.value}</b>
            <small>{k.sub}</small>
          </div>
        ))}
      </div>

      <div className="spa-grid">
        <div className="spa-panel">
          <div className="spa-panel-head">
            <b>What&apos;s happening nearby</b>
            <Link href="/map">
              Open map <ChevronRight size={12} />
            </Link>
          </div>
          {NEARBY.map((r) => (
            <div className="spa-row" key={r.title}>
              <Link href={r.href}>{r.title}</Link>
              <b>{r.time}</b>
              <div className="bar">
                <i className={r.tone} style={{ width: `${r.pct}%` }} />
              </div>
              <small>{r.note}</small>
            </div>
          ))}
        </div>

        <div className="spa-panel">
          <div className="spa-panel-head">
            <b>Take action</b>
            <span className="spa-chip">4 nearby</span>
          </div>
          <div className="spa-mini">
            <ShieldCheck size={20} />
            <h4>Help close a local gap</h4>
            <p>
              Choose a field action, contribute an observation, or join an active
              study.
            </p>
            <Link href="/get-involved">
              Find an action <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      <div className="spa-strip">
        <div>
          <span className="spa-mono">Living map / Delhi NCR</span>
          <h4>Signals, studies, needs and outcomes in one place.</h4>
        </div>
        <div className="spa-minimap">
          <span />
          <span />
          <span />
          <i />
          <b>65 signals</b>
        </div>
        <Link href="/map">
          Open map <ArrowUpRight size={14} />
        </Link>
      </div>
    </AppShell>
  );
}
