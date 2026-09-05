import { AppShell } from "@/components/app/AppShell";
import { PartnerGate } from "@/components/partner/PartnerGate";

export const dynamic = "force-dynamic";

// The field workspace lives inside the same console as the community surface, // one product, one shell. The gate still limits these records to verified
// organisation members; only the chrome is shared.
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PartnerGate title="Your organisation">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </PartnerGate>
    </AppShell>
  );
}
