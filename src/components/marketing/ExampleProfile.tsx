import Image from "next/image";
import { Check, MapPin } from "lucide-react";

/** User-requested sample profile. The photo is Pinky; clinical fields are illustrative. */
export function ExampleProfile() {
  return <article className="lw-animal lp-example-profile" aria-label="Pinky example profile, not her medical history">
    <div className="lw-photo"><Image src="/pinky-bengaluru.jpg" alt="Pinky, a white dog with a pink collar, resting on a street." width={750} height={716} sizes="(max-width: 760px) 90vw, 24vw" priority /></div>
    <div className="lw-file"><div className="lp-example-identity"><span className="lw-source">Illustrative profile</span><h2 className="lp-profile-name">Pinky</h2><p><MapPin size={12} aria-hidden /> Bengaluru</p><div className="lp-example-status"><Check size={14} aria-hidden /><b>Sterilised</b><span>Example status</span></div></div>
      <div className="lp-example-history"><h3 className="lp-example-timeline-title">Example timeline</h3><ol className="lp-example-timeline"><li><span aria-hidden /><div><b>Report received</b><small>Observation added</small></div></li><li><span aria-hidden /><div><b>Sterilisation recorded</b><small>Care added to history</small></div></li><li><span aria-hidden /><div><b>Follow-up planned</b><small>The next step stays visible</small></div></li></ol></div>
    </div>
    <p className="lw-animal-note">Pinky’s photo. Status and timeline are illustrative, not her medical history.</p>
  </article>;
}
