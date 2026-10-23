import { Bungee } from "next/font/google";
import { SiteHeader } from "@/components/site/SiteHeader";
import { MissionWall } from "@/components/mission/MissionWall";
import "@/components/site/site.css";

const bungee = Bungee({ subsets: ["latin"], weight: "400", display: "swap", variable: "--mw-font" });

export const metadata = { title: "Mission, StrayPaw", description: "Every stray animal on record." };

/* The mission, as one wall: nothing else on the page. */
export default function MissionPage() {
  return (
    <div className={`sp field-site ${bungee.variable}`}>
      <SiteHeader float />
      <main><MissionWall family={bungee.style.fontFamily} /></main>
    </div>
  );
}
