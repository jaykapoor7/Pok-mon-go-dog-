"use client";
import { useState } from "react";
import { Section } from "@/ws/kit";
import { Exercise } from "./Interactives";
import "./learn.css";

export function ReportPractice() {
  const [done, setDone] = useState(false);
  return (
    <Section title="Practise a useful report" note="Nothing is submitted.">
      <p className="lrn-fine">Describe a place and what you saw. Get feedback before making a real report.</p>
      <div className="lrn-do"><Exercise id="practice-report" onDone={() => setDone(true)} /></div>
      {done && <p role="status" className="lrn-fine">Practice complete. You kept observations separate from assumptions.</p>}
    </Section>
  );
}
