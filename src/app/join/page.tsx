import type { Metadata } from "next";
import { JoinClient } from "@/components/join/JoinClient";
import "./join.css";
import { EntryFrame } from "@/sp3/entry/EntryFrame";

export const metadata: Metadata = {
  title: "Enter your code, StrayPaw",
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
    <EntryFrame>
      <div className="sp join-shell">
        <div className="join-page">
          <JoinClient initialCode={code?.trim().toUpperCase()} />
        </div>
      </div>
    </EntryFrame>
  );
}
