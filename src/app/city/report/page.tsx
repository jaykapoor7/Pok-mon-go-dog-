import { Suspense } from "react";
import { PubPage } from "@/sp4/pub/kit";
import { CityReport } from "@/sp4/pub/city/CityReport";

export const metadata = {
  title: "City report, StrayPaw",
  description: "A printable report of what a city's shared street-animal record shows, and the limits of that record.",
};

export default function CityReportPage() {
  return <PubPage><Suspense fallback={null}><CityReport /></Suspense></PubPage>;
}
