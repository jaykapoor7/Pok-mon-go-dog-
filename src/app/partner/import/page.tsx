import { ImportClient } from "@/components/partner/ImportClient";

export const metadata = { title: "Import records, StrayPaw Partner" };

export default function PartnerImportPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Import existing records
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          Most organisations do not start digital. Bring your ward registers,
          ABC ledger pages and WhatsApp threads in as they are, attach the
          original, transcribe the few fields that matter, and both get filed
          together.
        </p>
      </header>
      <ImportClient />
    </div>
  );
}
