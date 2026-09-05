import { AppShell } from "@/components/app/AppShell";
import { AdoptClient } from "@/components/app/AdoptClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Adoption listings, StrayPaw",
  description:
    "Animals listed for adoption by verified organisations, each one already on the map with its record and the organisation that knows it.",
};

export default function AdoptPage() {
  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Network / adoption</span>
          <h1>
            Animals looking for <em>a home.</em>
          </h1>
        </div>
      </div>

      <p className="spa-lede">
        Each listing is an animal that already has a record here, opened by the
        organisation caring for it. Its history stays attached after placement,
        so a later vet or a later reporter can still find it.
      </p>

      <AdoptClient />
    </AppShell>
  );
}
