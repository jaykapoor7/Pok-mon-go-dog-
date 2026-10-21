import { cellToLatLng } from "h3-js";
import type { LandingStory } from "@/lib/landing/story";

/** Coarse public area centers, projected from the same bounded city record as the page. */
export function RecordMap({ story }: { story: LandingStory | null }) {
  if (!story?.desk.cells.length) return <div className="rq-map-empty"><span>Living Map</span><small>Public geography unavailable</small></div>;
  const [west, south, east, north] = story.hero.box;
  const width = Math.max(east - west, .0001);
  const height = Math.max(north - south, .0001);
  const cos = Math.cos(((south + north) / 2) * Math.PI / 180);
  const scale = Math.min(220 / (width * cos), 100 / height);
  const xOffset = (250 - width * cos * scale) / 2;
  const yOffset = (128 - height * scale) / 2;
  return <figure className="rq-real-map"><svg viewBox="0 0 250 128" role="img" aria-label={`Recorded areas in ${story.hero.city}. Coarse public geography, not the example report.`}>
    {story.desk.cells.slice(0, 300).map((cell) => {
      const [lat, lng] = cellToLatLng(cell.key);
      return <circle key={cell.key} cx={((lng - west) * cos * scale + xOffset).toFixed(2)} cy={((north - lat) * scale + yOffset).toFixed(2)} r="2" />;
    })}
  </svg><figcaption>Living Map · {story.hero.city} · area sample</figcaption></figure>;
}
