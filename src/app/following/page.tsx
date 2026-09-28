import { AppShell } from "@/components/app/AppShell";
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
      <div className="spa-head follow-head">
        <div>
          <span className="spa-mono">Your follow-up</span>
          <h1>
            Saved animals and <em>your reports.</em>
          </h1>
        </div>
      </div>

      <p className="spa-lede follow-lede">A place to return to the animals you care about and the reports you have made. This device keeps your report trail, whether or not you chose to sign in.</p>

      <FollowingClient suggestions={suggestions} />
    </AppShell>
  );
}
