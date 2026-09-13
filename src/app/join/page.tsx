import type { Metadata } from "next";
import { JoinClient } from "@/components/join/JoinClient";
import "./join.css";
import { BackLink } from "@/components/app/BackLink";

export const metadata: Metadata = {
  title: "Enter your code",
  description:
    "Sign in to a StrayPaw organisation with the six-character code you were given.",
  robots: { index: false, follow: false },
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  /* This is a code-entry screen somebody lands on from a link or a
     button. It had no way back at all — and a person who opened it
     by mistake, or who does not have a code yet, was stuck. */
  return (
    <div className="sp mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">
      <BackLink fallback="/" />
      <JoinClient initialCode={code?.trim().toUpperCase()} />
    </div>
  );
}
