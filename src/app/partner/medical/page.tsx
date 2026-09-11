import { MedicalClient } from "@/components/partner/MedicalClient";
import { RecordsTabs } from "@/components/partner/RecordsTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Medical, StrayPaw Partner" };

export default function PartnerMedicalPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Care records
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          A clear, chronological record of treatment, vaccination and field
          care, always connected to the animal.
        </p>
      </header>
      <RecordsTabs />
      <MedicalClient />
    </div>
  );
}
