/* One request, followed through the record. A real case from the sample
   city with every step written down: the report, the field team's first
   action, the care given to that animal, and the close. Dates are the
   record's own. Nothing names the caller, the animal or the organisation. */

type Journey = {
  condition: string; locality: string;
  reported: string; acted: string; actedAfter: number; closed: string; days: number;
  closure: string;
  care: { count: number; kinds: string[]; first: string | null };
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const careWord = (k: string) => k.replace(/_/g, " ");

export function Journey({ j, city }: { j: Journey; city: string }) {
  const steps = [
    { at: j.reported, what: "Reported", detail: `${j.condition}, ${j.locality}`, gap: null as string | null },
    { at: j.acted, what: "Field team on site", detail: j.actedAfter === 0 ? "The same day" : `${plural(j.actedAfter, "day")} after the report`, gap: null },
    ...(j.care.count && j.care.first ? [{ at: j.care.first, what: "Care recorded", detail: `${j.care.kinds.map(careWord).join(", ").replace(/^./, (c) => c.toUpperCase())} · ${plural(j.care.count, "entry").replace("entrys", "entries")}`, gap: null }] : []),
    { at: j.closed, what: j.closure === "recovered" ? "Recovered, case closed" : "Closed after field work", detail: `${plural(j.days, "day")} from the first report`, gap: null },
  ];
  return (
    <ol className="ld-trip" aria-label={`One request in ${city}, from report to outcome`}>
      {steps.map((s, i) => (
        <li key={s.what} style={{ ["--i" as string]: i }} className={i === steps.length - 1 ? "is-end" : undefined}>
          <i className="ld-trip-dot" aria-hidden />
          <time className="sys-mono" dateTime={s.at}>{when(s.at)}</time>
          <b>{s.what}</b>
          <span>{s.detail}</span>
        </li>
      ))}
    </ol>
  );
}
