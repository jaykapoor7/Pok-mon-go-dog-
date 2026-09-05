import { DrivesClient } from "@/components/partner/DrivesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Drives, StrayPaw Partner" };

export default function PartnerDrivesPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Drives
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          A census, a sterilisation round, a rabies drive. Each one carries its
          own coverage figure, counted over the animals in it rather than the
          observations, so two sightings of one dog on one day stay one
          sterilisation.
        </p>
      </header>
      <DrivesClient />
    </div>
  );
}
