import { AppShell } from "@/components/app/AppShell";
import { ConsoleHeader } from "@/components/app/ConsoleHeader";
import { WardDensityClient } from "@/components/data/WardDensityClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ward density, StrayPaw",
  description:
    "Street-animal records counted inside published municipal ward boundaries: how many, over what area, and how much of the city anybody has actually surveyed.",
};

// Next 15 hands searchParams as a promise.
export default async function WardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ city?: string }>;
}) {
  const city = (await searchParams)?.city || "Chennai";
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ConsoleHeader
          kicker="Data and evidence"
          title="Ward density"
          description={
            <>
              Animals on record counted inside published municipal ward
              boundaries. Coverage first: a ward with no records is a ward
              nobody has surveyed, which is a different finding from a ward
              with no animals, and this page never merges the two.
            </>
          }
        />
        <WardDensityClient city={city} />
      </div>
    </AppShell>
  );
}
