import { AppShell } from "@/components/app/AppShell";
import { FollowingClient } from "@/components/app/FollowingClient";
import { getSuggestedDogs } from "@/lib/data";

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
      <div className="spa-head">
        <div>
          <span className="spa-mono">Your follow-up</span>
          <h1>
            Saved animals and <em>your reports.</em>
          </h1>
        </div>
      </div>

      <p className="spa-lede">
        Saved animals stay on this device. When you sign in, reports you filed
        appear here too, with their latest review status.
      </p>

      <FollowingClient suggestions={suggestions} />
    </AppShell>
  );
}
