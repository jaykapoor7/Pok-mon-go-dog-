import { redirect } from "next/navigation";
import { jobTarget } from "@/lib/kaju/jobs";

/* One piece of Kaju's work used to have a page here. An old link opens the same work over Kaju's home instead. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(jobTarget(`/kaju/missions/${encodeURIComponent(id)}`));
}
