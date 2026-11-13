"use client";

/* Education · Playground: the Academy's two models on their own, for
   classrooms and curious officials. Illustrative only; nothing here is
   data about a real place. */

import { useState } from "react";
import { Head, Page, Section } from "@/ws/kit";
import { Exercise } from "./Interactives";
import "./learn.css";

export function Playground() {
  const [, set] = useState(0);
  return (
    <Page>
      <Head title="Playground" sum="Two teaching models to explore freely. They use invented numbers and are never a forecast for a real street, ward or city." />
      <div className="lrn-two">
        <Section title="A model street"><div className="lrn-do"><Exercise id="simulation" onDone={() => set((x) => x + 1)} /></div></Section>
        <Section title="The precision lens"><div className="lrn-do"><Exercise id="precision" onDone={() => set((x) => x + 1)} /></div></Section>
      </div>
    </Page>
  );
}
