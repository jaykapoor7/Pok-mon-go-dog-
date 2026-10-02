import { ImportClient } from "@/components/partner/ImportClient";
import { DeskHeader } from "@/components/app/DeskHeader";

export const metadata = { title: "Import records, StrayPaw Partner" };

export default function PartnerImportPage() {
  return (
    <div>
      <DeskHeader
        kicker="Records · import"
        title="Bring in the records you already keep"
        lede="Ward registers, ABC ledgers, spreadsheets and WhatsApp threads, as they are. Attach the original, map the fields that matter, and both are filed together."
      />
      <ImportClient />
    </div>
  );
}
