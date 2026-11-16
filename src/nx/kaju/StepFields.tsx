"use client";

import { FIELDS, type FieldSpec } from "@/lib/kaju/capabilities";
import type { ToolName } from "@/lib/kaju/registry";
import type { Vocab } from "./intent";

/* The words of one step a person may change before it starts, or before they approve it. Choices come from names this
   person can already see (places, channels, colleagues); the tool itself never changes here. */

const WHEN = [["any", "Any date"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["this week", "This week"], ["next week", "Next week"]] as const;

export function StepFields({ tool, value, onChange, vocab, idBase }: { tool: string; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; vocab: Vocab; idBase: string }) {
  const spec = FIELDS[tool as ToolName] ?? [];
  if (!spec.length) return <p className="kj-quiet">Nothing to change in this step.</p>;
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  const str = (k: string) => (typeof value[k] === "string" ? (value[k] as string) : "");
  const field = (f: FieldSpec) => {
    const id = `${idBase}-${f.key}`;
    const wide = f.kind === "long" || f.kind === "people";
    let control: React.ReactNode;
    switch (f.kind) {
      case "long": control = <textarea id={id} rows={3} value={str(f.key)} maxLength={4000} onChange={(e) => set(f.key, e.target.value)} />; break;
      case "date": control = <input id={id} type="date" value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} />; break;
      case "when": control = <select id={id} value={str(f.key) || "any"} onChange={(e) => set(f.key, e.target.value)}>{WHEN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>; break;
      case "place": { const cur = str(f.key); const opts = cur && !vocab.places.includes(cur) ? [cur, ...vocab.places] : vocab.places;
        control = <select id={id} value={cur} onChange={(e) => set(f.key, e.target.value)}><option value="">Every place</option>{opts.map((p) => <option key={p} value={p}>{p}</option>)}</select>; break; }
      case "channel": { const cur = str(f.key); const opts = cur && !vocab.channels.includes(cur) ? [cur, ...vocab.channels] : vocab.channels;
        control = <select id={id} value={cur} onChange={(e) => set(f.key, e.target.value)}><option value="" disabled>Choose a channel</option>{opts.map((c) => <option key={c} value={c}>#{c}</option>)}</select>; break; }
      case "outside": { const cur = str(f.key) || "email";
        control = <select id={id} value={cur} onChange={(e) => set(f.key, e.target.value)}><option value="email">Email</option>{cur !== "email" ? <option value={cur}>{cur === "sms" ? "Text message (not connected)" : "WhatsApp (not connected)"}</option> : null}</select>; break; }
      case "person": {
        const cur = str("assignee_id"), byName = str("assignee_name");
        control = <select id={id} value={cur || (byName ? `name:${byName}` : "")} onChange={(e) => { const v = e.target.value; const next = { ...value }; delete next.assignee_id; delete next.assignee_name; if (v.startsWith("name:")) next.assignee_name = v.slice(5); else if (v) next.assignee_id = v; onChange(next); }}>
          <option value="">Not assigned</option>
          {byName && !cur ? <option value={`name:${byName}`}>{byName}</option> : null}
          {vocab.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>; break; }
      case "people": {
        const ids = Array.isArray(value[f.key]) ? (value[f.key] as unknown[]).map(String) : [];
        control = <div className="kj-pick" role="group" aria-labelledby={`${id}-l`}>{vocab.people.length ? vocab.people.map((p) => { const on = ids.includes(p.id); return <button key={p.id} type="button" aria-pressed={on} className={on ? "is-on" : ""} onClick={() => set(f.key, on ? ids.filter((x) => x !== p.id) : [...ids, p.id])}>{p.name}</button>; }) : <span className="kj-quiet">No colleagues to choose from.</span>}</div>;
        return <div key={f.key} className="kj-field is-wide"><span id={`${id}-l`}>{f.label}</span>{control}</div>;
      }
      default: control = <input id={id} type={f.key === "to" ? "email" : "text"} value={str(f.key)} maxLength={f.key === "to" ? 200 : 240} onChange={(e) => set(f.key, e.target.value)} />;
    }
    return <label key={f.key} htmlFor={id} className={`kj-field ${wide ? "is-wide" : ""}`}><span>{f.label}</span>{control}</label>;
  };
  return <div className="kj-fields">{spec.map(field)}</div>;
}
