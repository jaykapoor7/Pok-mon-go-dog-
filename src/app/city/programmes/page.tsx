import { Programmes } from "@/sp/city/Programmes";
import { getPublicProgrammes } from "@/lib/public-programmes";

export const revalidate = 300;
export const metadata = { title: "Programmes, StrayPaw", description: "Sterilisation, vaccination, treatment and survey programmes organisations have published, on one time axis, each with its figure in an honest unit." };
export default async function CityProgrammesPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const [{ city }, all] = await Promise.all([searchParams, getPublicProgrammes(250).catch(() => [])]);
  return <Programmes all={all} initialCity={city ?? null} now={Date.now()} />;
}
