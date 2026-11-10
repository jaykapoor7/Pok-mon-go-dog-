"""Dataset manifest: one row per image, with provenance and usage rights.

Only rows with a confirmed individual identity AND explicit training rights
are eligible for training. Imported records, medical records and photos with
unclear rights are never treated as confirmed identities.

CSV columns (header required):
  image_path, individual_id, species, source, label_provenance, usage_rights,
  captured_at, location_cell, organisation, camera, notes

  label_provenance: human_confirmed | microchip_verified | imported_unverified | model_suggested
  usage_rights:     training_allowed | evaluation_only | not_allowed | unknown
"""
from __future__ import annotations

import csv
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

PROVENANCE = {"human_confirmed", "microchip_verified", "imported_unverified", "model_suggested"}
RIGHTS = {"training_allowed", "evaluation_only", "not_allowed", "unknown"}
CONFIRMED = {"human_confirmed", "microchip_verified"}
REQUIRED = ["image_path", "individual_id", "species", "source", "label_provenance", "usage_rights"]


@dataclass(frozen=True)
class Row:
    image_path: str
    individual_id: str
    species: str
    source: str
    label_provenance: str
    usage_rights: str
    captured_at: datetime | None = None
    location_cell: str | None = None
    organisation: str | None = None
    camera: str | None = None

    @property
    def confirmed(self) -> bool:
        return self.label_provenance in CONFIRMED

    @property
    def trainable(self) -> bool:
        return self.confirmed and self.usage_rights == "training_allowed"

    @property
    def evaluable(self) -> bool:
        return self.confirmed and self.usage_rights in {"training_allowed", "evaluation_only"}


@dataclass
class Report:
    rows: list[Row]
    errors: list[str] = field(default_factory=list)

    @property
    def trainable(self) -> list[Row]:
        return [r for r in self.rows if r.trainable]

    @property
    def evaluable(self) -> list[Row]:
        return [r for r in self.rows if r.evaluable]

    def summary(self) -> dict:
        ev = self.evaluable
        per: dict[str, int] = {}
        for r in ev:
            per[r.individual_id] = per.get(r.individual_id, 0) + 1
        return {
            "rows": len(self.rows), "errors": len(self.errors),
            "evaluable_images": len(ev), "trainable_images": len(self.trainable),
            "individuals": len(per), "individuals_with_2plus_images": sum(1 for n in per.values() if n >= 2),
            "excluded_unconfirmed": sum(1 for r in self.rows if not r.confirmed),
            "excluded_no_rights": sum(1 for r in self.rows if r.confirmed and not r.evaluable),
            "species": sorted({r.species for r in self.rows}),
        }


def _time(v: str) -> datetime | None:
    v = (v or "").strip()
    if not v:
        return None
    return datetime.fromisoformat(v.replace("Z", "+00:00"))


def load(path: str | Path, check_files: bool = False) -> Report:
    rep = Report(rows=[])
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = [c for c in REQUIRED if c not in (reader.fieldnames or [])]
        if missing:
            rep.errors.append(f"missing columns: {', '.join(missing)}")
            return rep
        seen: set[str] = set()
        for i, raw in enumerate(reader, start=2):
            r = {k: (v or "").strip() for k, v in raw.items() if k}
            problems = [c for c in REQUIRED if not r.get(c)]
            if r.get("label_provenance") and r["label_provenance"] not in PROVENANCE:
                problems.append(f"label_provenance={r['label_provenance']!r}")
            if r.get("usage_rights") and r["usage_rights"] not in RIGHTS:
                problems.append(f"usage_rights={r['usage_rights']!r}")
            if r.get("image_path") in seen:
                problems.append("duplicate image_path")
            try:
                when = _time(r.get("captured_at", ""))
            except ValueError:
                problems.append("captured_at is not ISO 8601")
                when = None
            if check_files and r.get("image_path") and not Path(r["image_path"]).exists():
                problems.append("image file not found")
            if problems:
                rep.errors.append(f"line {i}: {'; '.join(problems)}")
                continue
            seen.add(r["image_path"])
            rep.rows.append(Row(r["image_path"], r["individual_id"], r["species"], r["source"], r["label_provenance"], r["usage_rights"],
                                when, r.get("location_cell") or None, r.get("organisation") or None, r.get("camera") or None))
    return rep


def fingerprint(rows: list[Row]) -> str:
    """A stable dataset version: the hash of the sorted (image, identity, rights) triples."""
    h = hashlib.sha256()
    for r in sorted(rows, key=lambda x: x.image_path):
        h.update(f"{r.image_path}|{r.individual_id}|{r.usage_rights}\n".encode())
    return h.hexdigest()[:16]
