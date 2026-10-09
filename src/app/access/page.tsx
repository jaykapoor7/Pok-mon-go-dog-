import { AccessCodeRequest } from "@/components/join/AccessCodeRequest";
import "../join/join.css";
import { AppShell } from "@/components/app/AppShell";

export const metadata = {
  title: "Get your StrayPaw code",
  description: "Request a six-character code by email to sign in to the community or feeder workspace. No password.",
  alternates: { canonical: "/access" },
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  /* This is a code-entry screen somebody lands on from a link or a
     button. It had no way back at all — and a person who opened it
     by mistake, or who does not have a code yet, was stuck. */
  return (
    <AppShell>
      <main className="sp join-page join-inapp">
        <AccessCodeRequest role={role === "feeder" ? "feeder" : "individual"} />
      </main>
    </AppShell>
  );
}
