import "../sys.css";
import "./sp.css";
import raw from "../../data/spatial.json";
import { Band } from "../parts";
import { Spatial } from "./Spatial";
import type { Data } from "./engine";

export function SystemSpatial({ animal, view, mode }: { animal?: string; view?: string; mode?: string }) {
  return (
    <main className="sx night sx-spatial">
      <Band current="/lab/system/spatial" crumbs={["India", "Spatial intelligence"]} />
      <Spatial data={raw as unknown as Data} initial={{ animal, view, mode }} />
    </main>
  );
}
