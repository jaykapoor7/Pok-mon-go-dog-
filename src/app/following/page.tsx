import { AppShell } from "@/components/app/AppShell";
import { FollowingClient } from "@/components/app/FollowingClient";
import { getAllDogs } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Following, StrayPaw",
  description: "The animals you follow, kept on this device.",
};

export default async function FollowingPage() {
  const dogs = await getAllDogs();

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Your area / following</span>
          <h1>
            Animals you&apos;re <em>following.</em>
          </h1>
        </div>
      </div>

      <p className="spa-lede">
        Kept on this device, so it works without an account. Clearing site data
        clears the list.
      </p>

      <FollowingClient dogs={dogs} />
    </AppShell>
  );
}
