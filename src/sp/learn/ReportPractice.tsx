"use client";
import { useState } from "react";
import { Exercise } from "./Interactives";
import "./academy-focus.css";

export function ReportPractice() {
  const [done, setDone] = useState(false);
  return <section className="report-practice" aria-labelledby="report-practice-title"><header><h2 id="report-practice-title">Practise a useful report.</h2><p>Describe a place and what you saw. Get feedback before making a real report. Nothing is submitted.</p></header><Exercise id="practice-report" onDone={() => setDone(true)} />{done && <p role="status" className="small">Practice complete. You kept observations separate from assumptions.</p>}</section>;
}
