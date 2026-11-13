import { Suspense } from "react";
import { Insights } from "@/sp/city/Insights";

export const metadata = {
  title: "City insights, StrayPaw",
  description: "Numbered findings about street animals and requests for help in an Indian city, each with its limit, method and gaps.",
};
export default function CityInsightsPage() { return <Suspense fallback={null}><Insights /></Suspense>; }
