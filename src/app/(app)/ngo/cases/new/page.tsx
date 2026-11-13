import { NewCase } from "@/sp/ngo/NewCase";

export const dynamic = "force-dynamic";
export const metadata = { title: "New case, StrayPaw NGO", robots: { index: false, follow: false } };
type Q = { dog?: string; lat?: string; lng?: string; zone?: string; title?: string; note?: string };
const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : null);
export default async function NgoNewCasePage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  return <NewCase pre={{ dog: q.dog ?? null, lat: num(q.lat), lng: num(q.lng), zone: q.zone ?? null, title: q.title?.slice(0, 140) ?? null, note: q.note?.slice(0, 1000) ?? null }} />;
}
