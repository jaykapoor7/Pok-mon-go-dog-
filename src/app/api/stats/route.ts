import { getCityStats } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight public count for the top bar (like meowmbai's "253 cats").
export async function GET() {
  const stats = await getCityStats();
  return Response.json({ dogs: stats.dogsSpotted });
}
