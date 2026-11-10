"""Leakage-free partitions.

identity_disjoint: no individual appears in more than one split (the standard
  re-identification protocol: the test animals were never seen in training).
temporal: train on earlier encounters, test on later ones (time gaps).
geographic: hold out whole location cells (new places, new cameras).
Within an evaluation split, each individual's images are divided into a
gallery (first encounter) and probes (later encounters).
"""
from __future__ import annotations

import random
from collections import defaultdict
from datetime import datetime

from .manifest import Row


def identity_disjoint(rows: list[Row], seed: int = 13, val: float = 0.15, test: float = 0.2) -> dict[str, list[Row]]:
    ids = sorted({r.individual_id for r in rows})
    rnd = random.Random(seed)
    rnd.shuffle(ids)
    n_test, n_val = round(len(ids) * test), round(len(ids) * val)
    group = {i: "test" for i in ids[:n_test]} | {i: "val" for i in ids[n_test:n_test + n_val]} | {i: "train" for i in ids[n_test + n_val:]}
    out: dict[str, list[Row]] = {"train": [], "val": [], "test": []}
    for r in rows:
        out[group[r.individual_id]].append(r)
    return out


def temporal(rows: list[Row], cutoff: datetime) -> dict[str, list[Row]]:
    dated = [r for r in rows if r.captured_at]
    return {"train": [r for r in dated if r.captured_at < cutoff], "test": [r for r in dated if r.captured_at >= cutoff]}


def geographic(rows: list[Row], held_out_cells: set[str]) -> dict[str, list[Row]]:
    return {"train": [r for r in rows if r.location_cell not in held_out_cells], "test": [r for r in rows if r.location_cell in held_out_cells]}


def gallery_probe(rows: list[Row], seed: int = 13) -> tuple[list[Row], list[Row]]:
    """One gallery image per individual (earliest, else random); the rest are probes.
    Individuals with a single image stay in the gallery as distractors."""
    rnd = random.Random(seed)
    by: dict[str, list[Row]] = defaultdict(list)
    for r in rows:
        by[r.individual_id].append(r)
    gallery, probes = [], []
    for ident in sorted(by):
        imgs = by[ident]
        imgs = sorted(imgs, key=lambda r: (r.captured_at or datetime.max, r.image_path)) if any(r.captured_at for r in imgs) else rnd.sample(imgs, len(imgs))
        gallery.append(imgs[0])
        probes.extend(imgs[1:])
    return gallery, probes


def open_set(rows: list[Row], unknown_share: float = 0.3, seed: int = 13) -> tuple[list[Row], list[Row], list[Row]]:
    """Gallery, known probes and unknown probes (individuals withheld from the gallery)."""
    ids = sorted({r.individual_id for r in rows})
    rnd = random.Random(seed)
    rnd.shuffle(ids)
    unknown = set(ids[: round(len(ids) * unknown_share)])
    known_rows = [r for r in rows if r.individual_id not in unknown]
    gallery, probes = gallery_probe(known_rows, seed)
    return gallery, probes, [r for r in rows if r.individual_id in unknown]
