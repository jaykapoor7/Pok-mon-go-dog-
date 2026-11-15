import { Suspense } from "react";
import { PubPage } from "@/sp4/pub/kit";
import { Insights } from "@/sp4/pub/city/Insights";

export const metadata = {
  title: "City insights, StrayPaw",
  description: "Numbered findings about street animals and requests for help in an Indian city, each with its limit, method and gaps.",
};

export default function CityInsightsPage() {
  return <PubPage><Suspense fallback={null}><Insights /></Suspense></PubPage>;
}
