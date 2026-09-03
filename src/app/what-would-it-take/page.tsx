import { AppShell } from "@/components/app/AppShell";
import { WWITClient } from "@/components/app/WWITClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "What would it take? StrayPaw",
  description:
    "Turn a geographic problem into a costed, scheduled intervention: how many animals, what it costs, how long it takes, and who can execute it.",
};

export default function WhatWouldItTakePage() {
  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Planning / scoping tool</span>
          <h1>
            What would it <em>take?</em>
          </h1>
        </div>
      </div>

      <p className="spa-lede">
        Pick a geography and an objective. This turns it into the numbers a funder
        and an executing partner both need: how many animals, what it costs, how
        long it runs.
      </p>

      <WWITClient />
    </AppShell>
  );
}
