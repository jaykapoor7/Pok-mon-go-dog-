import Link from "next/link";
import { Plus } from "lucide-react";
import { getCases } from "@/lib/cases";
import { CasesTable } from "@/components/cases/CasesTable";
import { PartnerGate } from "@/components/partner/PartnerGate";
import { ConsoleHeader } from "@/components/app/ConsoleHeader";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cases, StrayPaw" };

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <PartnerGate title="Cases">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ConsoleHeader
          kicker="Your organisation"
          title="Cases"
          description="Everything your team has claimed, is working, or has resolved. One row per animal in trouble."
          actions={
            <Button asChild className="spa-cta">
              <Link href="/cases/new">
                <Plus className="h-4 w-4" /> New case
              </Link>
            </Button>
          }
        />

        <CasesTable cases={cases} />
      </div>
    </PartnerGate>
  );
}
