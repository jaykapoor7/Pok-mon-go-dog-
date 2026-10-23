import { Bungee } from "next/font/google";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MissionWall } from "@/components/mission/MissionWall";
import type { Cell } from "@/components/mission/bricks";
import { getNationalCells } from "@/lib/livingmap/server";
import "@/components/site/site.css";

const bungee = Bungee({ subsets: ["latin"], weight: "400", display: "swap", variable: "--mw-font" });

export const revalidate = 300;
export const metadata = { title: "Mission, StrayPaw", description: "Every stray animal on record." };

/* The mission, as one wall: nothing else on the page. The recorded areas
   light the bricks of the map at the end. */
export default async function MissionPage() {
  const national = await getNationalCells().catch(() => null);
  const cells: Cell[] = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n]);
  return (
    <div className={`sp field-site ${bungee.variable}`}>
      <SiteHeader float />
      <main><MissionWall family={bungee.style.fontFamily} cells={cells} /></main>
    </div>
  );
}
