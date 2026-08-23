import { MarketingNav } from "@/components/marketing/MarketingNav";
import LandingDeck from "@/components/marketing/LandingDeck";
import { getCityStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — every stray has a name, a story, and people who care",
  description:
    "StrayPaw connects community members, street animals, and welfare organizations on a shared platform — tracking every sighting, feeding, and care event in real time across Delhi NCR.",
};

export default async function LandingPage() {
  const stats = await getCityStats();
  return (
    <>
      <MarketingNav />
      <LandingDeck
        stats={{
          dogsSpotted: stats.dogsSpotted,
          dogsFed: stats.dogsFed,
          dogsSterilised: stats.dogsSterilised,
        }}
      />
    </>
  );
}
