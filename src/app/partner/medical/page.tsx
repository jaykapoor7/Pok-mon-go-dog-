import { MedicalClient } from "@/components/partner/MedicalClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Medical, StrayPaw Partner" };

export default function PartnerMedicalPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Medical
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          Treatment, vaccination and sterilisation your organisation has
          recorded, newest first.
        </p>
      </header>
      <MedicalClient />
    </div>
  );
}
