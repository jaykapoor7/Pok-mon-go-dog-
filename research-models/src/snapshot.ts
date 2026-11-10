// Public-facing aggregates only. Reproduce these fields with data/snapshot.sql.
export const snapshot = {
  date: "2026-11-10",
  spatial: { recordedVaccinations: 6462, eligibleCells: 72, vaccinationsInEligibleCells: 6172, topCells: 15, vaccinationsInTopCells: 2633 },
  surveillance: { years: [2024, 2025], biteCaseCounts: [60, 34], months: 24 },
  composition: { years: [2024, 2025], roadAccident: [278, 133], tvt: [105, 83] },
  sterilization: { activeMonths: 42, medianFemaleSurgeries: 278 },
  prevention: { censusRegisterSize: 424 },
};
