import { KajuPresence } from "@/kaju/Presence";
import "./app-loading.css";

/* While a section of the app is on its way: Kaju trots along a line and the
   page's shape waits underneath, so the layout does not jump when it lands.
   Shown by each section's loading.tsx. Under reduced motion Kaju stands and
   the shapes do not shimmer. */
export function AppLoading({ label = "Fetching your records" }: { label?: string }) {
  return (
    <div className="apl" role="status" aria-live="polite" aria-label={label}>
      <div className="apl-kaju" aria-hidden>
        <span className="apl-run"><KajuPresence state="trotting" size={84} /></span>
        <i className="apl-track"><b /></i>
        <small>{label}</small>
      </div>
      <div className="apl-shape" aria-hidden>
        <span className="apl-line is-title" />
        <span className="apl-line is-sub" />
        <div className="apl-cards">{[0, 1, 2, 3].map((i) => <span key={i} className="apl-card" style={{ ["--i" as string]: i }} />)}</div>
        {[0, 1, 2].map((i) => <span key={i} className="apl-row" style={{ ["--i" as string]: i }}><i /><span><b /><em /></span></span>)}
      </div>
    </div>
  );
}
