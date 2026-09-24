import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ShareBand } from "@/components/system/ShareBand";

/* ════════════════════════════════════════════════════════════════════
   What is not known.

   Most of what anyone would want to know about a street animal has never
   been written down. The register says so in the only honest way: the
   unknown share is drawn, hatched, at its real size — and it is most of
   each bar. A low count of sterilised animals is not a low sterilisation
   rate. It is a question nobody has asked yet.
   ════════════════════════════════════════════════════════════════════ */

type Known = { yes: number; no?: number; unknown: number };

export function TheUnknown({ total, ster, vacc, photo }: { total: number; ster: Known; vacc: Known; photo: Known }) {
  const pct = (n: number) => Math.round((n / Math.max(1, total)) * 100);
  const rows = [
    { key: "abc", title: "Sterilisation (ABC)", yes: "Recorded as sterilised", no: "Recorded as not sterilised", k: ster },
    { key: "arv", title: "Rabies vaccination (ARV)", yes: "Recorded as vaccinated", no: "Recorded as not vaccinated", k: vacc },
    { key: "photo", title: "Photographed", yes: "Has a photograph", no: "", k: photo },
  ];
  return (
    <div className="ld-unknown-rows">
      {rows.map((r) => (
        <div key={r.key} className="ld-unknown-row">
          <div className="ld-unknown-head">
            <b>{r.title}</b>
            <span><em className="ld-unknown-pct">{pct(r.k.unknown)}%</em> not recorded</span>
          </div>
          <ShareBand
            height={30}
            night
            legend={false}
            total={total}
            parts={[
              { key: "yes", n: r.k.yes, color: r.key === "arv" ? "var(--sp-arv-night)" : "var(--sp-nseq-4)", label: r.yes },
              ...(r.k.no ? [{ key: "no", n: r.k.no, color: "rgba(239,231,218,0.55)", label: r.no }] : []),
              { key: "unknown", n: r.k.unknown, hatch: true, label: "Not recorded — unknown, not zero" },
            ]}
          />
        </div>
      ))}
      <p className="ld-unknown-ask">
        <Link href="/report" className="sys-link is-night">Seen a notched ear? Add it to the record <ArrowUpRight size={14} /></Link>
      </p>
    </div>
  );
}
