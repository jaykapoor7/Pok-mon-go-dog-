import { redirect } from "next/navigation";
import { jobTarget } from "@/lib/kaju/jobs";

/* Kaju's work has no list of its own any more: it shows where it was asked, on the record it is about, in Needs you and
   in Today, and finished work in Kaju's History. Old links (notifications carry /kaju/missions?m=<id>) open the same
   work over Kaju's home. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = (await searchParams).m;
  redirect(jobTarget(`/kaju/missions${typeof m === "string" ? `?m=${encodeURIComponent(m)}` : ""}`));
}
