import assert from "node:assert/strict";
import { nearestCity } from "../src/lib/delhi";
// Real coordinates: a Coimbatore report previously received the Kochi label
// when reverse geocoding was unavailable. Distant places must remain unknown.
assert.equal(nearestCity(11.0168, 76.9558), "Coimbatore");
assert.equal(nearestCity(28.6139, 77.209), "Delhi");
assert.equal(nearestCity(34.1526, 77.5771), "Location name unavailable");
assert.equal(nearestCity(Number.NaN, 77), "Location name unavailable");
console.log("Geographic fallback never labels a distant metro as the report's place.");
