import { AccessCodeRequest } from "@/components/join/AccessCodeRequest";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <AccessCodeRequest role={role === "feeder" ? "feeder" : "individual"} />;
}
