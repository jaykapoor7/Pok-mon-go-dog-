import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";

export const metadata = { title: "Not found, StrayPaw", robots: { index: false, follow: false } };

/* A record that is not there, said plainly, with the three ways on: home
   as the one primary action, the map and a report beside it.
   Plain links, not next/link: this file is part of every page's server tree, and a next/link here made each app page
   (whose own code never imports next/link) download the landing page's scripts, about 144 KB, to resolve it. */
export default function NotFound() {
  return (
    <main className="nf" data-not-found-recovery>
      <section className="nf-body">
        <p className="nf-k"><b>404</b> · Not found</p>
        <h1>This record isn&rsquo;t here.</h1>
        <p className="nf-lede">
          The page may have moved, the link may be old, or the record may no longer be public. Go back home, open the live map, or report an animal. No account needed.
        </p>
        <div className="nf-go">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load is intended; see the note above */}
          <a href="/" className="sys-btn"><ArrowLeft size={16} aria-hidden /> Home</a>
          <a href="/community" className="sys-btn is-quiet"><MapPin size={16} aria-hidden /> Open the live map</a>
          <a href="/community/report" className="sys-btn is-quiet">Report an animal <ArrowUpRight size={16} aria-hidden /></a>
        </div>
        <p className="nf-lede">Looking for your organisation&apos;s workspace? <a href="/sign-in?next=/app">Sign in with your email and access code.</a></p>
      </section>
    </main>
  );
}
