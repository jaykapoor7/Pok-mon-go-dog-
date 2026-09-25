import assert from "node:assert/strict";
import { selectDominantPublicMapCluster } from "../src/lib/public-map-footprint";

const coimbatore = [
  { lat: 10.98, lng: 76.94, records: 120 },
  { lat: 11.01, lng: 76.96, records: 85 },
  { lat: 10.95, lng: 76.99, records: 60 },
  { lat: 11.06, lng: 76.91, records: 40 },
];
const importedOutliers = [
  { lat: 13.05, lng: 80.22, records: 6 },
  { lat: 12.98, lng: 80.15, records: 4 },
  { lat: 8.8, lng: 76.73, records: 1 },
];

const cluster = selectDominantPublicMapCluster([...coimbatore, ...importedOutliers]);
assert.deepEqual(cluster, coimbatore, "the dominant local footprint excludes distant imported outliers");
assert.deepEqual(selectDominantPublicMapCluster(coimbatore.slice(0, 2)), [], "insufficient cells omit the map");

console.log("Public NGO map footprint regression passed.");
