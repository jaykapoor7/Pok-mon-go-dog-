import { A, AF, A_STRIDE, type SpatialDataset } from "@/lib/spatial/types";
import type { SpatialCity } from "./data";
import { CityEvidence } from "./AtlasRegister";

export function LensReadout({ city, ds, lens, municipal }: { city: SpatialCity; ds: SpatialDataset; lens: string; municipal: boolean }) {
  const sample = ds.animals.length / A_STRIDE;
  let photos = 0, exact = 0;
  for (let i = A.flags; i < ds.animals.length; i += A_STRIDE) { photos += Number(Boolean(ds.animals[i] & AF.photo)); exact += Number(Boolean(ds.animals[i] & AF.exact)); }
  const rows = lens === "care" ? [
    { label: "Sterilisation recorded", value: city.sterilised }, { label: "Vaccination recorded", value: city.vaccinated }, { label: "Care events", value: city.care_events },
  ] : lens === "cases" ? [
    { label: "Cases in the register", value: city.cases }, { label: "Currently open", value: city.open_cases },
  ] : lens === "evidence" ? [
    { label: "Cells with records", value: city.cells }, { label: "Detailed profiles loaded", value: sample }, { label: "Source GPS in loaded detail", value: exact },
  ] : [{ label: "Animal profiles recorded", value: city.animals }, { label: "Cells with records", value: city.cells }];
  return <section className="atlas-readout" aria-label={`${lens} intelligence for ${city.city}`}>
    <p className="atlas-readout-kicker">{municipal ? "Geographic evidence" : "Inside the city record"} / {lens}</p>
    <dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value == null ? "Not recorded" : row.value.toLocaleString("en-IN")}</dd></div>)}</dl>
    {lens === "animals" && <p>{photos.toLocaleString("en-IN")} of {sample.toLocaleString("en-IN")} loaded profiles have a photograph. Select a cell to meet the animals recorded there.</p>}
    {lens === "care" && <p>Recorded statuses can overlap on the same animal. These counts are not programme coverage percentages.</p>}
    {lens === "cases" && <p>Case patterns below describe loaded detail. Imported classifications do not establish verified intervention gaps.</p>}
    {lens === "evidence" && <p>GPS and photograph availability describe the loaded sample, not the full city register. Public locations remain generalized.</p>}
    <CityEvidence city={city.city} cells={city.cells} municipal={municipal} />
  </section>;
}
