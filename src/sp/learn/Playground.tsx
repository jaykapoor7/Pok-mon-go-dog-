"use client";

/* Education · Playground: the Academy's two models on their own, for
   classrooms and curious officials. Illustrative only; nothing here is
   data about a real place. */

import { useState } from "react";
import { Exercise } from "./Interactives";
import "./learn.css";

export function Playground() {
  const [, set] = useState(0);
  return (
    <div className="ac">
      <header className="ac-cover is-slim">
        <div className="ac-title">
          <p className="k">Education · playground</p>
          <h1 className="display">Neighbourhood playground</h1>
          <p className="lede">Two teaching models to explore freely. They use invented numbers and are never a forecast for a real street, ward or city.</p>
        </div>
      </header>
      <div className="lp-grid">
        <section className="ls-do"><p className="ls-do-k"><span>A model street</span></p><Exercise id="simulation" onDone={() => set((x) => x + 1)} /></section>
        <section className="ls-do"><p className="ls-do-k"><span>The precision lens</span></p><Exercise id="precision" onDone={() => set((x) => x + 1)} /></section>
      </div>
    </div>
  );
}
