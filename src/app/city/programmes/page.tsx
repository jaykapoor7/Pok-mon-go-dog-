import { getPublicProgrammes } from "@/lib/public-programmes";
import { Body, Empty, Head, PubPage } from "@/sp4/pub/kit";
import { Programmes } from "@/sp4/pub/city/Programmes";

export const revalidate = 300;
export const metadata = { title: "Programmes, StrayPaw", description: "Sterilisation, vaccination, treatment and survey programmes organisations have published, on one time axis, each with its figure in an honest unit." };

export default async function CityProgrammesPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const [{ city }, all] = await Promise.all([searchParams, getPublicProgrammes(250).then((d) => d).catch(() => null)]);
  if (!all) return <PubPage><Head eyebrow="City record" title="Programmes" /><Body><Empty alert title="Not read">The published programmes could not be read just now. That is not the same as there being none; reload to try again.</Empty></Body></PubPage>;
  return <PubPage><Programmes all={all} initialCity={city ?? null} now={Date.now()} /></PubPage>;
}
