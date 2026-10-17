import { notFound } from "next/navigation";
import { Programme } from "@/sp/city/Programme";
import { getPublicProgramme, getPublicProgrammes } from "@/lib/public-programmes";

export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await getPublicProgramme((await params).id).catch(() => null);
  return p ? { title: `${p.name}, ${p.ngo_name}, StrayPaw`, description: p.public_summary?.slice(0, 150) ?? `A programme by ${p.ngo_name}.` } : { title: "Programme not found, StrayPaw" };
}
export default async function CityProgrammePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPublicProgramme(id).catch(() => null);
  if (!p) notFound();
  const all = await getPublicProgrammes(250).catch(() => []);
  return <Programme p={p} siblings={all.filter((x) => x.ngo_slug === p.ngo_slug && x.id !== p.id)} />;
}
