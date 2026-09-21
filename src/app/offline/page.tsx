import Link from "next/link";

export const metadata = {
  title: "Offline, StrayPaw",
  description: "You are offline. Pages you have already opened are still available.",
};

/* Served by the service worker when a navigation fails and nothing for that
   URL is cached. Field teams lose signal constantly, so this says what is
   still usable rather than apologising: an unsent report is kept on the
   device, and anything already opened is still readable. */
export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#0b1e3d]">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
        <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#2457ce]">
          No connection
        </p>
        <h1 className="mt-3 text-[clamp(2rem,7vw,3.2rem)] font-semibold leading-[.95] tracking-[-.05em]">
          You are offline.
        </h1>
        <p className="mt-4 text-sm leading-6 opacity-60">
          This page has not been opened on this device yet, so there is no copy of
          it here. Pages you have already visited still work, and anything you
          were writing has not been lost.
        </p>

        <dl className="mt-8 divide-y divide-[#0b1e3d]/10 border-y border-[#0b1e3d]/10 text-sm">
          <div className="flex gap-4 py-3">
            <dt className="w-32 shrink-0 font-semibold">A report</dt>
            <dd className="opacity-60">
              Stays on this device and sends itself once you are back on a signal.
            </dd>
          </div>
          <div className="flex gap-4 py-3">
            <dt className="w-32 shrink-0 font-semibold">The map</dt>
            <dd className="opacity-60">
              Shows the area you last loaded. New tiles need a connection.
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/report"
            className="inline-flex h-11 items-center rounded-full bg-[#f05b40] px-5 text-sm font-semibold text-white"
          >
            Start a report anyway
          </Link>
          <Link
            href="/map"
            className="inline-flex h-11 items-center rounded-full border border-[#0b1e3d]/15 px-5 text-sm font-semibold"
          >
            Open the map
          </Link>
        </div>
      </div>
    </main>
  );
}
