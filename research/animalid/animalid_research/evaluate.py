"""Baseline evaluation: embed a manifest's evaluable images and report real metrics.

  python -m animalid_research.evaluate --manifest data/manifest.csv --backbone dinov2_vitb14 \\
      --protocol identity_disjoint --out reports/

Refuses to report when the data cannot support a result (too few individuals
with repeat images). Nothing here is ever filled in by hand.
"""
from __future__ import annotations

import argparse
import json
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[3] / "services" / "animalid"))

from animalid import backbones  # noqa: E402
from animalid.preprocess import open_image  # noqa: E402

from . import manifest, metrics, splits  # noqa: E402

MIN_INDIVIDUALS = 20


def embed_rows(model, rows, batch=16) -> tuple[np.ndarray, float]:
    vecs, t0 = [], time.perf_counter()
    for i in range(0, len(rows), batch):
        ims = [open_image(Path(r.image_path).read_bytes()) for r in rows[i:i + batch]]
        vecs.append(model.embed(ims))
    ms = (time.perf_counter() - t0) * 1000 / max(1, len(rows))
    return (np.concatenate(vecs) if vecs else np.zeros((0, model.dim), np.float32)), ms


def run(manifest_path: str, backbone: str, protocol: str, seed: int, out: str, cutoff: str | None = None, cells: str | None = None) -> dict:
    rep = manifest.load(manifest_path, check_files=True)
    rows = rep.evaluable
    if protocol == "identity_disjoint":
        test = splits.identity_disjoint(rows, seed)["test"]
    elif protocol == "temporal":
        test = splits.temporal(rows, datetime.fromisoformat(cutoff or ""))["test"]
    elif protocol == "geographic":
        test = splits.geographic(rows, set((cells or "").split(",")))["test"]
    else:
        raise SystemExit(f"unknown protocol {protocol}")
    gallery, probes, unknown = splits.open_set(test, seed=seed)
    repeat = {r.individual_id for r in probes}
    result: dict = {"protocol": protocol, "seed": seed, "dataset_version": manifest.fingerprint(rows), "manifest_summary": rep.summary(),
                    "generated_at": datetime.now(timezone.utc).isoformat(), "machine": platform.platform()}
    if len(repeat) < MIN_INDIVIDUALS:
        result["status"] = "insufficient_data"
        result["reason"] = f"{len(repeat)} individuals with a repeat image in the test split; at least {MIN_INDIVIDUALS} are needed for a result."
    else:
        model = backbones.load(backbone)
        g, ms_g = embed_rows(model, gallery)
        p, ms_p = embed_rows(model, probes)
        u, _ = embed_rows(model, unknown)
        result |= {"status": "ok", "model_version": model.version, "latency_ms_per_image": round((ms_g + ms_p) / 2, 1),
                   "metrics": metrics.report(p, [r.individual_id for r in probes], g, [r.individual_id for r in gallery], u)}
    Path(out).mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    (Path(out) / f"eval-{protocol}-{stamp}.json").write_text(json.dumps(result, indent=2, default=str))
    return result


def main() -> None:
    a = argparse.ArgumentParser()
    a.add_argument("--manifest", required=True)
    a.add_argument("--backbone", default="dinov2_vitb14")
    a.add_argument("--protocol", default="identity_disjoint", choices=["identity_disjoint", "temporal", "geographic"])
    a.add_argument("--cutoff")
    a.add_argument("--cells")
    a.add_argument("--seed", type=int, default=13)
    a.add_argument("--out", default="reports")
    x = a.parse_args()
    print(json.dumps(run(x.manifest, x.backbone, x.protocol, x.seed, x.out, x.cutoff, x.cells), indent=2, default=str))


if __name__ == "__main__":
    main()
