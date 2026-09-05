import { IncomingClient } from "@/components/partner/IncomingClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Incoming, StrayPaw Partner" };

export default function PartnerIncomingPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Incoming
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          Nothing counts towards your programme until you file it. What your
          volunteers send in waits here for you to say which drive it belongs
          to; community sightings wait to be claimed.
        </p>
      </header>
      <IncomingClient />
    </div>
  );
}
