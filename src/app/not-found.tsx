import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";

export const metadata = { title: "Not found, StrayPaw", robots: { index: false, follow: false } };

/* A record that is not there, said plainly, with the three ways on: home
   as the one primary action, the map and a report beside it. */
export default function NotFound() {
  return (
    <main className="nf" data-not-found-recovery>
      <section className="nf-body">
        <p className="nf-k sys-mono"><b>404</b> · Record not found</p>
        <h1>This trail <em>ends&nbsp;here.</em></h1>
        <p className="nf-lede">
          The page may have moved, the link may be old, or the record may no longer be public. Go back home, open the live map, or report an animal. No account needed.
        </p>
        <div className="nf-go">
          <Link href="/" className="sys-btn"><ArrowLeft size={16} aria-hidden /> Home</Link>
          <Link href="/map" className="sys-btn is-quiet"><MapPin size={16} aria-hidden /> Open the live map</Link>
          <Link href="/report" className="sys-btn is-quiet">Report an animal <ArrowUpRight size={16} aria-hidden /></Link>
        </div>
      </section>
    </main>
  );
}
