import { AppShell } from "@/components/app/AppShell";
import { FollowingClient } from "@/components/app/FollowingClient";
import { getAllDogs } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saved animals, StrayPaw",
  description: "Animals you saved and reports you filed, kept together for follow-up.",
};

export default async function FollowingPage() {
  const dogs = await getAllDogs();

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

      <FollowingClient dogs={dogs} />
    </AppShell>
  );
}
