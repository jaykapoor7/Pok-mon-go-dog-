import Link from "next/link";
import { HeartHandshake, Plus } from "lucide-react";
import { getFundraisers } from "@/lib/fundraisers";
import { FundraiserCard } from "@/components/fundraisers/FundraiserCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppShell } from "@/components/app/AppShell";
import { DeskHeader } from "@/components/app/DeskHeader";

export const metadata = {
  title: "Fundraisers, support rescues | StrayPaw",
  description:
    "Back verified street-dog rescues in India, vet bills, sterilisation drives and emergencies. Donations go directly to each NGO.",
};

export const dynamic = "force-dynamic";

export default async function FundraisersPage() {
  const fundraisers = await getFundraisers();

  return (
    <AppShell>
    <div className="dk-form-page">
      <DeskHeader
        kicker="Community · fundraisers"
        title="Fundraisers"
        lede="Vetted rescues and partner NGOs raising for vet bills, sterilisation and emergencies. Every one links straight to the rescue’s own donation channel; StrayPaw never handles the money."
        figures={[{ label: fundraisers.length === 1 ? "active fundraiser" : "active fundraisers", value: fundraisers.length }]}
      />

      {fundraisers.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="h-7 w-7" />}
          title="No active fundraisers yet"
          description="Vetted rescue campaigns and partner NGO fundraisers will appear here soon."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {fundraisers.map((f) => (
            <FundraiserCard key={f.id} f={f} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-bark-400">
        Are you a verified partner NGO?{" "}
        <Link href="/fundraisers/new" className="inline-flex items-center gap-1 font-semibold text-paw-600">
          <Plus className="h-3.5 w-3.5" /> Start a fundraiser
        </Link>
      </p>
    </div>
    </AppShell>
  );
}
