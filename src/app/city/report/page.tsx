import { Suspense } from "react";
import { CityReport } from "@/sp/city/CityReport";

export const metadata = {
  title: "City report, StrayPaw",
  description: "A printable report of what a city's shared street-animal record shows, and the limits of that record.",
};
export default function CityReportPage() { return <Suspense fallback={null}><CityReport /></Suspense>; }
