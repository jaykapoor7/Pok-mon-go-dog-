import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SYSTEM, SYSTEM_SCREENS } from "@/components/lab/system";

export function generateStaticParams() {
  return SYSTEM_SCREENS.map((s) => ({ screen: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ screen: string }> }): Promise<Metadata> {
  const { screen } = await params;
  const s = SYSTEM_SCREENS.find((x) => x.id === screen);
  return { title: s ? `${s.name} — StrayPaw system, lab` : "StrayPaw system, lab" };
}

export default async function SystemScreen({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  const Screen = SYSTEM[screen as keyof typeof SYSTEM];
  if (!Screen) notFound();
  return <Screen />;
}
