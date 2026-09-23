import "./atlas.css";
import { LAB } from "../data";
import { Masthead } from "./parts";
import { FieldMapPlate } from "./FieldMapPlate";

export function AtlasMap() {
  return (
    <main className="la night">
      <section className="la-fmap" aria-label="Field map">
        <Masthead over current="/lab/atlas/map" />
        <FieldMapPlate events={LAB.cbe.events} animals={LAB.cbe.animals} localities={LAB.cbe.localities} box={LAB.cbe.box} />
      </section>
    </main>
  );
}
