"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Survey } from "@/lib/types";
import { useRead } from "@/oh/data";
import { read } from "../../../data/ngo-setup";
import { fieldsOf, isProject, newProject, newSurvey, purposeOf, readSurveys } from "../../../data/ngo-programmes";
import { Failed, Field, Modal, Skeleton, day, errText, useAct } from "../../../kit";
import { Chip } from "../../../ui";
import { Grid, Tools, TryLink, Views, type GCol, type Who } from "../frame";
import { S_SURVEYS } from "../sample";

/* Surveys and projects. A survey is a structured dog count across wards or villages, collected in the field on its
   own page, offline if need be. A project is a register for work that is not a census, with its own fields; it is a
   survey carrying a field marker, as classic keeps it (create_survey, submit_survey_response). */

export const surveyHref = (id: string) => `/ngo/programmes/surveys/${id}`;
export function SurveysTab({ who }: { who: Who }) {
  const r = useRead<Survey[]>(() => read(readSurveys), "ns:surveys", !who.sample && !!who.ngo);
  const [view, setView] = useState<"surveys" | "projects">("surveys");
  const [making, setMaking] = useState<"survey" | "project" | null>(null);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading your surveys" />;
  if (!who.sample && r.error && !r.data) return <Failed error={`${errText(r.error)} Nothing is shown as none.`} retry={r.reload} />;
  const all = who.sample ? S_SURVEYS : r.data!;
  const surveys = all.filter((s) => !isProject(s)), projects = all.filter(isProject);
  const cols: GCol<Survey>[] = view === "surveys" ? [
    { label: "Survey", width: "minmax(0, 1.4fr)", render: (s) => <span className="nx-cell-main"><span><b>{s.title}</b><small>Dog census{s.description ? ` · ${s.description.slice(0, 120)}` : ""}</small></span></span> },
    { label: "Created", width: "120px", render: (s) => <span className="nx-t3">{day(s.created_at)}</span> },
    { label: "Status", width: "100px", keep: true, render: (s) => <Chip tone={s.status === "active" ? "ok" : "plain"}>{s.status.replace(/^./, (c) => c.toUpperCase())}</Chip> },
  ] : [
    { label: "Project", width: "minmax(0, 1.4fr)", render: (s) => <span className="nx-cell-main"><span><b>{s.title}</b><small>{purposeOf(s.description) || "Register"}</small></span></span> },
    { label: "Fields", width: "minmax(0, 1.2fr)", render: (s) => <span className="nx-t2 ns-cell">{fieldsOf(s.description).join(", ")}</span> },
    { label: "Since", width: "120px", keep: true, render: (s) => <span className="nx-t3">{day(s.created_at)}</span> },
  ];
  return (
    <>
      <Tools end={who.sample ? <><TryLink quiet small><Plus size={13} />New project</TryLink><TryLink small><Plus size={13} />New survey</TryLink></> : <><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setMaking("project")}><Plus size={13} />New project</button><button type="button" className="nx-btn is-sm" onClick={() => setMaking("survey")}><Plus size={13} />New survey</button></>}>
        <span className="ns-sum"><b>{surveys.length}</b> {surveys.length === 1 ? "survey" : "surveys"} and <b>{projects.length}</b> {projects.length === 1 ? "project" : "projects"}. Counts are collected in the field, offline if need be.{all.length >= 200 ? " Showing the 200 most recent." : ""}</span>
      </Tools>
      <Views id="sv" value={view} onChange={setView} views={[{ id: "surveys", label: "Surveys and census", count: surveys.length }, { id: "projects", label: "Projects", count: projects.length }]} />
      <Grid label={view === "surveys" ? "Surveys" : "Projects"} cols={cols} rows={view === "surveys" ? surveys : projects} rowKey={(s) => s.id} rowLabel={(s) => s.title} href={(s) => surveyHref(s.id)}
        empty={view === "surveys" ? <><b>No surveys yet</b><p>Create one, add the areas your team will cover, then collect counts on a phone.</p></> : <><b>No projects yet</b><p>A rabies drive, an ABC drive, a school round: name the fields once and every entry fills them in.</p></>} />
      {making === "survey" ? <NewSurvey onClose={() => setMaking(null)} onDone={() => { setMaking(null); r.reload(); }} /> : null}
      {making === "project" ? <NewProject onClose={() => setMaking(null)} onDone={() => { setMaking(null); r.reload(); setView("projects"); }} /> : null}
    </>
  );
}

function NewSurvey({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const save = () => void run("survey", () => newSurvey(title.trim(), desc.trim()), { ok: "Survey created. Add the areas your team will cover." }).then((x) => { if (x.ok && x.result) { onDone(); router.push(surveyHref(x.result)); } });
  return (
    <Modal title="New survey" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!title.trim() || !!busy} onClick={save}>{busy ? "Creating…" : "Create the survey"}</button></>}>
      <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bengaluru stray dog census 2026" autoFocus /></Field>
      <Field label="What is counted, and how (optional)"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></Field>
      <p className="nx-sub">StrayPaw records dogs only. After creating it, add the wards or villages your team will cover.</p>
    </Modal>
  );
}

const splitFields = (t: string) => [...new Set(t.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))];
function NewProject({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [fieldText, setFieldText] = useState("");
  const fields = splitFields(fieldText);
  const save = () => void run("project", () => newProject(name.trim(), fields, purpose.trim()), { ok: "Project created." }).then((x) => { if (x.ok) onDone(); });
  return (
    <Modal title="New project" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!name.trim() || !fields.length || !!busy} onClick={save}>{busy ? "Creating…" : "Create the project"}</button></>}>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="ABC drive, R.S. Puram" autoFocus /></Field>
      <Field label="What it is for"><input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="One line on why this is being recorded" /></Field>
      <Field label="What each entry records" hint="Separate fields with commas."><textarea rows={2} value={fieldText} onChange={(e) => setFieldText(e.target.value)} placeholder="Sterilised, vaccinated, treatment, next review" /></Field>
      {fields.length ? <p className="ns-row-acts" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>{fields.map((f) => <Chip key={f} bare>{f}</Chip>)}</p> : null}
    </Modal>
  );
}
