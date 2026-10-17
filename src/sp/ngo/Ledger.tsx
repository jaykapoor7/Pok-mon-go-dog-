/* A printed partition strip: recorded yes, recorded no, and not recorded
   (hatched), always of the same whole. Unknown is never folded into no. */
export function Partition({ yes, no, unknown, yesLabel, noLabel = "recorded not", compact }: { yes: number; no: number; unknown: number; yesLabel: string; noLabel?: string; compact?: boolean }) {
  const all = yes + no + unknown;
  const w = (v: number) => (all ? `${(v / all) * 100}%` : "0%");
  return (
    <div className={`part${compact ? " is-compact" : ""}`}>
      <div className="part-bar" role="img" aria-label={`${yes} ${yesLabel}, ${no} ${noLabel}, ${unknown} not recorded, of ${all}`}>
        <span className="is-yes" style={{ width: w(yes) }} /><span className="is-no" style={{ width: w(no) }} /><span className="is-unk" style={{ width: w(unknown) }} />
      </div>
      {!compact && <p className="part-key"><span><i className="is-yes" />{yes.toLocaleString("en-IN")} {yesLabel}</span><span><i className="is-no" />{no.toLocaleString("en-IN")} {noLabel}</span><span><i className="is-unk" />{unknown.toLocaleString("en-IN")} not recorded</span></p>}
    </div>
  );
}
