import Link from "next/link";
import { ArrowLeft, HeartHandshake, Plus } from "lucide-react";
import { getFundraisers } from "@/lib/fundraisers";
import { FundraiserCard } from "@/components/fundraisers/FundraiserCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Fundraisers — support rescues | StrayPaw",
  description:
    "Back verified street-dog rescues in India — vet bills, sterilisation drives and emergencies. Donations go directly to each NGO.",
};

export const dynamic = "force-dynamic";

export default async function FundraisersPage() {
  const fundraisers = await getFundraisers();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <header className="mb-5">
        <h1 className="font-display text-3xl font-extrabold tracking-tightest">Fundraisers</h1>
        <p className="mt-1 text-sm text-bark-500">
          Help verified rescues cover vet bills, sterilisation and emergencies. Every
          campaign links straight to the NGO&apos;s own donation channel — StrayPaw
          never handles the money.
        </p>
      </header>

      {fundraisers.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="h-7 w-7" />}
          title="No active fundraisers"
          description="When a verified partner NGO starts a campaign, it'll appear here."
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
  );
}
