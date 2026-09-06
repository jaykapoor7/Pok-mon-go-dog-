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
  // No ?city means the whole country: districts, not one pilot's wards.
  const city = (await searchParams)?.city ?? null;
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ConsoleHeader
          kicker="Data and evidence"
          title="Density across India"
          description={
            <>
              Animals on record counted inside published boundaries: all 641
              districts of India, and every ward of a city once its pilot
              starts. Coverage first, because an area with no records is one
              nobody has surveyed, which is a different finding from an area
              with no animals, and this page never merges the two.
            </>
          }
        />
        <WardDensityClient city={city} />
      </div>
    </AppShell>
  );
}
