/* Checks the bounded public spatial contract. It must never assemble the
   public register in a probe, either. */
import { getPublicSpatialCities, getPublicSpatialCityCells } from "../src/lib/spatial/server";
(async () => {
  const t0 = Date.now();
  const cities = await getPublicSpatialCities();
  const cells = cities[0] ? await getPublicSpatialCityCells(cities[0].city) : [];
  console.log({ read_ms: Date.now() - t0, cities: cities.length, first_city: cities[0]?.city ?? null, first_city_cells: cells.length, city_limit: 200, cell_limit: 4000 });
})();
