import { NgoGate } from "@/sp/ngo/Gate";
import { MODULES, STATUS_ORDER, countBy, type Area } from "@/lib/readiness";
import { FLAGS, enabledFlags } from "@/lib/flags";
import "./readiness.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Readiness, StrayPaw", robots: { index: false, follow: false } };

const AREAS: Area[] = ["Kaju", "Field & NGO", "Veterinary", "Government", "Research", "Training", "Citizens", "Identity", "Integrations", "Platform"];
const LABEL = { LIVE: "Live", STAGING: "Staging", BLOCKED: "Blocked", PLANNED: "Planned" } as const;

export default function ReadinessPage() {
  const on = enabledFlags();
  const counts = countBy(MODULES);
  const pilot = MODULES.filter((m) => m.december);
  const pilotLive = pilot.filter((m) => m.status === "LIVE").length;
  return (
    <NgoGate title="Readiness" lede="What is live, under test, blocked or planned across StrayPaw.">
      <div className="rd">
        <header className="rd-head">
          <p className="rd-k">Platform readiness</p>
          <h1>What works today, and what the pilot still needs</h1>
          <p className="rd-lede">Live means it runs in production for its users and its checks pass. The Bengaluru pilot is under discussion and is not signed.</p>
          <ul className="rd-counts">
            {STATUS_ORDER.map((s) => <li key={s} className={`is-${s.toLowerCase()}`}><b>{counts[s]}</b>{LABEL[s]}</li>)}
            <li className="is-pilot"><b>{pilotLive}/{pilot.length}</b>December modules live</li>
          </ul>
        </header>
        {AREAS.map((area) => {
          const mods = MODULES.filter((m) => m.area === area);
          if (!mods.length) return null;
          return (
            <section key={area} className="rd-area" aria-labelledby={`rd-${area}`}>
              <h2 id={`rd-${area}`}>{area}</h2>
              <ul>
                {mods.map((m) => (
                  <li key={m.id} className="rd-row">
                    <div className="rd-name">
                      <b>{m.name}</b>
                      <span className={`rd-chip is-${m.status.toLowerCase()}`}>{LABEL[m.status]}</span>
                      {m.december && <span className="rd-chip is-dec">December pilot</span>}
                      {m.flag && <span className={`rd-chip is-flag${on.has(m.flag) ? " is-on" : ""}`} title={FLAGS[m.flag]}>{on.has(m.flag) ? "Flag on" : "Flag off"}</span>}
                    </div>
                    <p>{m.evidence}</p>
                    {m.waitsOn && <p className="rd-wait"><b>Waits on:</b> {m.waitsOn}</p>}
                    {m.next && <p className="rd-next"><b>Next:</b> {m.next}</p>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </NgoGate>
  );
}
