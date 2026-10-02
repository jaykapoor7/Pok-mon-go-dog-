import { AccessCodeRequest } from "@/components/join/AccessCodeRequest";
import "../join/join.css";
import { BackLink } from "@/components/app/BackLink";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  /* This is a code-entry screen somebody lands on from a link or a
     button. It had no way back at all — and a person who opened it
     by mistake, or who does not have a code yet, was stuck. */
  return (
    <main className="sp join-page">
      <BackLink fallback="/" />
      <AccessCodeRequest role={role === "feeder" ? "feeder" : "individual"} />
    </main>
  );
}
