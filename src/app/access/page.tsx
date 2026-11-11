import { redirect } from "next/navigation";

export const metadata = { title: "Get started, StrayPaw", robots: { index: false, follow: false } };

/* Asking for a code is the first step of the one sign-in. */
export default async function AccessPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  redirect(role === "feeder" ? "/sign-in?as=feeder" : "/sign-in");
}
