import { AppShell } from "@/components/app/AppShell";
import { DeskHeader } from "@/components/app/DeskHeader";
import { FollowingClient } from "@/components/app/FollowingClient";
import { getSuggestedDogs } from "@/lib/data";
import "./following.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saved animals, StrayPaw",
  description: "Animals you saved and reports you filed, kept together for follow-up.",
};

export default async function FollowingPage() {
  /* Suggestions only; the animals someone follows are fetched by id on
     their device, where the follows are kept. */
  const suggestions = await getSuggestedDogs();

  return (
    <AppShell>
      <DeskHeader
        kicker="Your follow-up"
        title={<>Saved animals and <em>your reports</em></>}
        lede="The animals you care about and the reports you have made, kept on this device whether or not you sign in."
      />

      <FollowingClient suggestions={suggestions} />
    </AppShell>
  );
}
