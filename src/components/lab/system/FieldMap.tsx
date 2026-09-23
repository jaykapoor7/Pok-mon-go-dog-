import "./sys.css";
import { LAB, daysBetween, zoneAt } from "../data";
import { Band } from "./parts";
import { FieldAtlas, type OpenPin } from "./FieldAtlas";
import { CBE_BOX, NOW_DAY } from "./sdata";

const inBox = (lng: number, lat: number) => lng >= CBE_BOX[0] && lng <= CBE_BOX[2] && lat >= CBE_BOX[1] && lat <= CBE_BOX[3];

export function SystemMap() {
  const open: OpenPin[] = LAB.queue.map((q) => ({ q, z: zoneAt(q.zone) })).filter((x) => x.z && inBox(x.z[0], x.z[1])).map(({ q, z }) => ({ lng: z![0], lat: z![1], cat: q.category, days: daysBetween(q.at), zone: q.zone.replace(/[,(].*$/, "").trim(), unverified: q.status === "unverified" }));
  return (
    <main className="sx night sx-mapscreen">
      <Band current="/lab/system/map" crumbs={["India", "Coimbatore", "Field map"]} />
      <FieldAtlas events={LAB.cbe.events.filter((e) => inBox(e[0], e[1]))} animals={LAB.cbe.animals.filter((a) => inBox(a[0], a[1]))} open={open} localities={LAB.cbe.localities.map((l) => ({ name: l.name, lng: l.lng, lat: l.lat }))} box={CBE_BOX} nowDay={NOW_DAY} />
    </main>
  );
}
