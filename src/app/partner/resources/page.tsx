import { ResourcesClient } from "@/components/partner/ResourcesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resources, StrayPaw Partner" };

export default function PartnerResourcesPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Resources
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          The original register pages, ledgers and message threads your records
          came from. Attach one to an animal and it appears on that
          animal&rsquo;s record, so a transcribed entry can always be checked
          against the page it came from.
        </p>
      </header>
      <ResourcesClient />
    </div>
  );
}
