"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Tent, Check } from "lucide-react";
import { getMyCamps, createVetCamp, setVetCampStatus } from "@/lib/camp-actions";
import { formatDate } from "@/lib/utils";
import type { VetCamp } from "@/lib/types";
import "./field.css";

export function CampsSection() {
  const [camps, setCamps] = useState<VetCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () => getMyCamps().then(setCamps).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <section className="fw-sec" aria-labelledby="fw-camps-h">
      <header className="fw-head">
        <h2 id="fw-camps-h">Veterinary camps{camps.length ? <span className="sys-mono">{camps.length}</span> : null}</h2>
        <button type="button" className="fw-act" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>
          <Plus size={15} aria-hidden /> {adding ? "Close" : "Plan a camp"}
        </button>
      </header>

      {adding && <AddCamp onDone={() => { setAdding(false); load(); }} />}

      {loading ? (
        <p className="fw-wait" role="status"><Loader2 size={16} className="fw-spin" aria-hidden /> Reading camps…</p>
      ) : camps.length === 0 ? (
        <p className="fw-empty">No camps planned yet. Plan one to put a sterilisation or vaccination day on the team&apos;s calendar.</p>
      ) : (
        <ul className="fw-list">
          {camps.map((c) => (
            <li key={c.id}>
              <Tent size={16} aria-hidden className="fw-ico" />
              <span className="fw-what">
                <b>{c.name}</b>
                <small>{[c.village, c.district].filter(Boolean).join(", ") || "Place not set"}{c.camp_date ? ` · ${formatDate(c.camp_date)}` : ""}</small>
              </span>
              <button type="button" className={`fw-state ${c.status === "done" ? "is-done" : ""}`}
                onClick={() => setVetCampStatus(c.id, c.status === "done" ? "planned" : "done").then(load)}
                aria-label={c.status === "done" ? `${c.name}: done. Mark as planned` : `${c.name}: planned. Mark as done`}>
                {c.status === "done" ? <><Check size={13} aria-hidden /> Done</> : "Planned"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddCamp({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createVetCamp({ name: name.trim(), village: village.trim() || undefined, district: district.trim() || undefined, campDate: date || null });
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="fw-add">
      <label className="is-wide"><span>Camp</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ward 12 sterilisation camp" /></label>
      <label><span>Village or area</span><input value={village} onChange={(e) => setVillage(e.target.value)} /></label>
      <label><span>District</span><input value={district} onChange={(e) => setDistrict(e.target.value)} /></label>
      <label><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <button type="button" className="sys-btn is-sm" onClick={submit} disabled={busy || !name.trim()}>
        {busy ? <Loader2 size={15} className="fw-spin" aria-hidden /> : <Check size={15} aria-hidden />} Save camp
      </button>
    </div>
  );
}
