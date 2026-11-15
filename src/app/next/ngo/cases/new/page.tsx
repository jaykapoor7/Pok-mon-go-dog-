import type { Metadata } from "next";
import { NewCase } from "@/nx/pages/ngo/NewCase";
export const metadata: Metadata = { title: "New case, StrayPaw", robots: { index: false, follow: false } };
type Q = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.slice(0, 2000) : null);
const num = (v: string | string[] | undefined) => { const s = one(v); const n = s === null ? NaN : Number(s); return Number.isFinite(n) ? n : null; };
export default async function Page({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  return <NewCase pre={{ dog: one(q.dog), lat: num(q.lat), lng: num(q.lng), zone: one(q.zone), title: one(q.title), note: one(q.note) }} />;
}
