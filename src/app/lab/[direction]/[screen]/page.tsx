import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ATLAS } from "@/components/lab/atlas";
import { CIVIC } from "@/components/lab/civic";
import { JOURNAL } from "@/components/lab/journal";
import { DIRECTIONS, SCREENS, type DirectionId, type ScreenId } from "@/components/lab/screens";

const BUILT: Record<DirectionId, Record<ScreenId, () => React.ReactNode>> = { atlas: ATLAS, civic: CIVIC, journal: JOURNAL };

export function generateStaticParams() {
  return DIRECTIONS.flatMap((d) => SCREENS.map((s) => ({ direction: d.id, screen: s.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ direction: string; screen: string }> }): Promise<Metadata> {
  const { direction, screen } = await params;
  const d = DIRECTIONS.find((x) => x.id === direction), s = SCREENS.find((x) => x.id === screen);
  return { title: d && s ? `${d.letter}. ${d.name} — ${s.name}, StrayPaw lab` : "StrayPaw lab" };
}

export default async function LabScreen({ params }: { params: Promise<{ direction: string; screen: string }> }) {
  const { direction, screen } = await params;
  const Screen = BUILT[direction as DirectionId]?.[screen as ScreenId];
  if (!Screen) notFound();
  return <Screen />;
}
