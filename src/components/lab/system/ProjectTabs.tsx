"use client";

/* A project is a workflow with its own variables. The same page frame
   holds every kind — ABC, ARV, TVT, census, medical, education, horse
   welfare, surveys, custom — and each declares what it collects, what
   unit of place it is measured on, what counts as progress, and what
   counts as an outcome. Projects with records show their records; the
   rest show their template, labelled as a template. */

import { useState } from "react";

export type Template = { id: string; name: string; real: boolean; unit: string; progress: string; outcome: string; vars: string[]; evidence: string };

export function ProjectTabs({ templates, panels }: { templates: Template[]; panels: Record<string, React.ReactNode> }) {
  const [id, setId] = useState(templates[0].id);
  const T = templates.find((t) => t.id === id)!;
  return (
    <div className="sx-proj">
      <div className="sx-proj-tabs" role="tablist" aria-label="Project types">
        {templates.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={id === t.id} onClick={() => setId(t.id)}>
            {t.name}{t.real ? <i className="live" title="Has records" /> : null}
          </button>
        ))}
      </div>
      <div className="sx-proj-def">
        <div><span className="lbl">Measured on</span><b>{T.unit}</b></div>
        <div><span className="lbl">Progress</span><b>{T.progress}</b></div>
        <div><span className="lbl">Outcome</span><b>{T.outcome}</b></div>
        <div><span className="lbl">Evidence</span><b>{T.evidence}</b></div>
      </div>
      {panels[id] ?? (
        <div className="sx-proj-tpl">
          <span className="tag">Template · no records yet</span>
          <h3>{T.name}</h3>
          <p>An organisation starts this project by choosing a geography and a target. Every record it adds carries these variables, so progress and gaps are drawn the moment the first entry arrives.</p>
          <ol>{T.vars.map((v, i) => <li key={v}><span className="m dim">{String(i + 1).padStart(2, "0")}</span><b>{v}</b><span className="hatch" /></li>)}</ol>
        </div>
      )}
    </div>
  );
}
