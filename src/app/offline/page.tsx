import Link from "next/link";

export const metadata = {
  title: "Offline, StrayPaw",
  description: "You are offline. Pages you have already opened are still available.",
  robots: { index: false, follow: false },
};

/* Served by the service worker when a navigation fails and nothing for that
   URL is cached, so it is kept tiny: no header, no scripts of its own, its
   styles inline. Field teams lose signal constantly, so it says what is still
   usable rather than apologising: an unsent report is kept on the device, and
   anything already opened is still readable. */
const CSS = `
.off{min-height:100dvh;background:#fff;color:#0b1e3d;font-family:var(--s4-inter),Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.off-in{max-width:640px;margin:0 auto;min-height:100dvh;display:grid;align-content:center;gap:16px;padding:48px 16px}
.off-brand{font-size:16px;font-weight:600;letter-spacing:-.02em;color:#2457ce;text-decoration:none;justify-self:start}
.off-k{font-size:14px;font-weight:500;color:#2457ce;margin:16px 0 0}
.off h1{font-size:40px;line-height:1.08;letter-spacing:-.035em;font-weight:500;margin:0}
.off p{font-size:16px;line-height:1.55;color:#4a5568;margin:0;max-width:60ch}
.off dl{margin:8px 0 0;border-top:1px solid #e4e8f0}
.off dl>div{display:grid;grid-template-columns:128px minmax(0,1fr);gap:16px;padding:12px 0;border-bottom:1px solid #e4e8f0;font-size:14px;line-height:1.5}
.off dt{font-weight:600}.off dd{margin:0;color:#4a5568}
.off-a{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.off-a a{display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:999px;font-size:16px;font-weight:500;text-decoration:none}
.off-a a:first-child{background:#c73e25;color:#fff}.off-a a+a{color:#0b1e3d;box-shadow:inset 0 0 0 1px rgba(11,30,61,.28)}
.off a:focus-visible{outline:2px solid #2457ce;outline-offset:3px}
@media(max-width:640px){.off h1{font-size:32px}.off dl>div{grid-template-columns:minmax(0,1fr);gap:4px}}
`;

export default function OfflinePage() {
  return (
    <main className="off" id="main">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="off-in">
        <Link className="off-brand" href="/">StrayPaw</Link>
        <p className="off-k">No connection</p>
        <h1>You are offline.</h1>
        <p>This page has not been opened on this device yet, so there is no copy of it here. Pages you have already visited still work, and anything you were writing has not been lost.</p>
        <dl>
          <div><dt>A report</dt><dd>Your answers stay on this device as a draft. Send it once you are back on a signal; it is not sent until StrayPaw answers.</dd></div>
          <div><dt>The map</dt><dd>Shows the area you last loaded. New tiles need a connection.</dd></div>
        </dl>
        <div className="off-a">
          <Link href="/community/report">Start a report anyway</Link>
          <Link href="/community">Open the map</Link>
        </div>
      </div>
    </main>
  );
}
