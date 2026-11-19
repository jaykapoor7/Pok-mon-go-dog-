import { redirect } from "next/navigation";
import { jobTarget } from "@/lib/kaju/jobs";

/* What waits for the person now shows in Needs you, in Today and on Kaju's home. Old links (approval notifications carry
   /kaju/approvals?m=<id>) open that work over Kaju's home, with its approval. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = (await searchParams).m;
  redirect(jobTarget(`/kaju/approvals${typeof m === "string" ? `?m=${encodeURIComponent(m)}` : ""}`));
}
