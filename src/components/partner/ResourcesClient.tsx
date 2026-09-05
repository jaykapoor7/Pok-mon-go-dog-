"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  FileImage,
  Link2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { uploadPhoto } from "@/lib/actions";
import {
  addDocument,
  linkDocument,
  orgDocuments,
  updateDocument,
  DOCUMENT_KINDS,
  type DocumentKind,
  type SourceDocument,
} from "@/lib/documents";
import { getMyAnimals, type AnimalRow } from "@/lib/animal-actions";
import { getPartnerCases } from "@/lib/cases";
import type { Case } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   Resources: the paper an organisation already has, made findable.

   Dog profiles, ABC ledgers, medical notes and WhatsApp threads are where
   the real record lives for most organisations. Import transcribes the few
   fields that matter, which is the useful part, but the page itself used
   to disappear behind that entry: anyone later questioning a transcribed
   date had nothing to check it against.

   Three things make this a workspace rather than a folder. The scan keeps
   its own written context, because a photograph of a ledger is not
   self-explanatory and whoever files it is the only person who knows what
   it is. It attaches to an animal or a case, which is what puts it on that
   record. And all of it is searchable, including the animal it belongs to,
   so a name that only exists in someone's handwriting can still be found.

   Not public. A register page carries other people's handwriting, phone
   numbers and addresses.
   ════════════════════════════════════════════════════════════════════ */

const KIND_LABEL = Object.fromEntries(
  DOCUMENT_KINDS.map((k) => [k.value, k.label])
) as Record<DocumentKind, string>;

const animalLabel = (a: AnimalRow) =>
  a.name?.trim() || a.code || a.zone || a.id.slice(0, 8);

export function ResourcesClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<SourceDocument[] | null>(null);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<DocumentKind>("register_page");
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const [d, a, c] = await Promise.all([
      orgDocuments(),
      getMyAnimals(),
      getPartnerCases().catch(() => [] as Case[]),
    ]);
    setDocs(d);
    setAnimals(a);
    setCases(c);
  }

  useEffect(() => {
    let live = true;
    load().catch(() => live && setDocs([]));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      /* Sequential. These are uploads from a field connection, where a burst
         of parallel writes fails more often than it finishes faster. */
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const url = await uploadPhoto(file);
        await addDocument({ url, kind, title: file.name });
      }
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not file that. Nothing was saved."
      );
    } finally {
      setBusy(false);
    }
  }

  const byId = useMemo(
    () => new Map(animals.map((a) => [a.id, a])),
    [animals]
  );
  const caseById = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);

  const shown = useMemo(() => {
    if (!docs) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return docs;
    return docs.filter((d) => {
      const animal = d.dog_id ? byId.get(d.dog_id) : null;
      const kase = d.case_id ? caseById.get(d.case_id) : null;
      return [
        d.title,
        d.notes,
        KIND_LABEL[d.kind],
        animal ? animalLabel(animal) : null,
        animal?.code,
        kase?.title,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [docs, q, byId, caseById]);

  const unfiled = docs?.filter((d) => !d.dog_id && !d.case_id).length ?? 0;

  return (
    <>
      <div className="imp-drop">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label="Choose scans to file"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <FileImage size={26} strokeWidth={1.3} />
        <div>
          <b>File a scan</b>
          <span>
            A dog profile sheet, an ABC ledger page, a medical note, a
            screenshot of a thread. Add its context and attach it afterwards.
          </span>
        </div>
        <div className="res-controls">
          <label>
            <span className="sr-only">Document type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as DocumentKind)}
              disabled={busy}
            >
              {DOCUMENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="spa-cta"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="imp-spin" /> Filing…
              </>
            ) : (
              <>
                <Plus size={14} /> Choose files
              </>
            )}
          </button>
        </div>
      </div>

      {error && <p className="res-error">{error}</p>}

      <div className="spa-note">
        <ShieldCheck size={16} />
        <span>
          These stay inside your organisation. A register page usually carries
          other people&rsquo;s handwriting and contact details, so it is never
          shown on a public animal page.
        </span>
      </div>

      {docs === null ? (
        <div className="spa-empty">
          <Loader2 size={26} className="imp-spin" />
          <p>Loading…</p>
        </div>
      ) : docs.length === 0 ? (
        <div className="spa-empty">
          <Upload size={40} strokeWidth={1.25} />
          <h2>No scans filed yet</h2>
          <p>
            Bring in the profiles, ledgers and medical notes your team already
            keeps on paper. Each one stays attached to the animal it describes.
          </p>
          <Link href="/partner/import" className="spa-cta">
            Go to Import
          </Link>
        </div>
      ) : (
        <>
          <div className="dir-search res-search">
            <Search size={15} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles, context notes, animals and cases"
              aria-label="Search filed documents"
            />
          </div>
          <p className="spa-mono res-count">
            {shown.length} of {docs.length} filed
            {unfiled > 0 ? ` · ${unfiled} not yet attached` : ""}
          </p>

          <div className="res-grid">
            {shown.map((d) => (
              <DocumentCard
                key={d.id}
                doc={d}
                animals={animals}
                cases={cases}
                animal={d.dog_id ? byId.get(d.dog_id) ?? null : null}
                kase={d.case_id ? caseById.get(d.case_id) ?? null : null}
                open={editing === d.id}
                onToggle={() => setEditing(editing === d.id ? null : d.id)}
                onSaved={load}
                onError={setError}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function DocumentCard({
  doc,
  animals,
  cases,
  animal,
  kase,
  open,
  onToggle,
  onSaved,
  onError,
}: {
  doc: SourceDocument;
  animals: AnimalRow[];
  cases: Case[];
  animal: AnimalRow | null;
  kase: Case | null;
  open: boolean;
  onToggle: () => void;
  onSaved: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState(doc.title ?? "");
  const [notes, setNotes] = useState(doc.notes ?? "");
  const [kind, setKind] = useState<DocumentKind>(doc.kind);
  const [recordedOn, setRecordedOn] = useState(doc.recorded_on ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateDocument(doc.id, {
        title,
        notes,
        kind,
        recordedOn: recordedOn || null,
      });
      await onSaved();
      onToggle();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setSaving(false);
    }
  }

  async function attach(opts: { dogId?: string; caseId?: string; clear?: boolean }) {
    try {
      await linkDocument(doc.id, opts);
      await onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not attach that.");
    }
  }

  return (
    <article className="res-card">
      <a href={doc.url} target="_blank" rel="noreferrer" className="res-thumb">
        <Image
          src={doc.url}
          alt={doc.title ?? "Filed document"}
          fill
          sizes="240px"
          className="res-img"
          unoptimized
        />
      </a>

      <div className="res-body">
        <span className="res-kind">{KIND_LABEL[doc.kind] ?? doc.kind}</span>

        {open ? (
          <div className="res-edit">
            <label>
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ABC ledger, page 14"
              />
            </label>
            <label>
              <span>What this is</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Whose handwriting, which drive, what the entries cover. Anything the next person would need to read it."
              />
            </label>
            <label>
              <span>Type</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as DocumentKind)}
              >
                {DOCUMENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date on the record</span>
              <input
                type="date"
                value={recordedOn}
                onChange={(e) => setRecordedOn(e.target.value)}
              />
            </label>
            <div className="res-edit-actions">
              <button type="button" className="spa-cta" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={13} className="imp-spin" /> : <Check size={13} />}
                Save
              </button>
              <button type="button" className="res-cancel" onClick={onToggle}>
                <X size={13} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <b>{doc.title?.trim() || "Untitled scan"}</b>
            {doc.recorded_on && (
              <span className="res-date">
                Record dated {new Date(doc.recorded_on).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            {doc.notes ? (
              <p>{doc.notes}</p>
            ) : (
              <p className="res-nonote">No context written yet.</p>
            )}

            <div className="res-links">
              {animal && (
                <Link href={`/dog/${animal.id}`} className="res-linked">
                  <Link2 size={12} /> {animalLabel(animal)}
                </Link>
              )}
              {kase && (
                <Link href={`/cases/${kase.id}`} className="res-linked">
                  <Link2 size={12} /> {kase.title}
                </Link>
              )}
            </div>

            {!animal && animals.length > 0 && (
              <label className="res-attach">
                <span className="sr-only">Attach to an animal</span>
                <select
                  defaultValue=""
                  onChange={(e) =>
                    e.target.value && attach({ dogId: e.target.value })
                  }
                >
                  <option value="">Attach to an animal…</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {animalLabel(a)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!kase && cases.length > 0 && (
              <label className="res-attach">
                <span className="sr-only">Attach to a case</span>
                <select
                  defaultValue=""
                  onChange={(e) =>
                    e.target.value && attach({ caseId: e.target.value })
                  }
                >
                  <option value="">Attach to a case…</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="res-card-actions">
              <button type="button" className="res-editbtn" onClick={onToggle}>
                {doc.notes ? "Edit context" : "Add context"}
              </button>
              {(animal || kase) && (
                <button
                  type="button"
                  className="res-editbtn"
                  onClick={() => attach({ clear: true })}
                >
                  Detach
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
