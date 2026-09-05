import type { Metadata } from "next";
import { JoinClient } from "@/components/join/JoinClient";
import "./join.css";

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
  return <JoinClient initialCode={code?.trim().toUpperCase()} />;
}
