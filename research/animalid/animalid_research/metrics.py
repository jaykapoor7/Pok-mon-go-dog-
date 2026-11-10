"""Re-identification metrics on L2-normalised embeddings (cosine similarity).

closed set: rank-k accuracy (CMC) and mean average precision.
verification: false accept (FAR) and false reject (FRR) at a threshold,
  and the threshold that meets a target FAR.
open set: detection-and-identification rate (DIR) at a FAR on unknown probes.
"""
from __future__ import annotations

import numpy as np


def similarity(probes: np.ndarray, gallery: np.ndarray) -> np.ndarray:
    return probes @ gallery.T


def cmc(sim: np.ndarray, probe_ids: list, gallery_ids: list, ranks=(1, 5)) -> dict[str, float]:
    g = np.array(gallery_ids)
    order = np.argsort(-sim, axis=1)
    hits = g[order] == np.array(probe_ids)[:, None]
    has = hits.any(axis=1)
    first = np.where(has, hits.argmax(axis=1), np.inf)
    n = len(probe_ids)
    return {f"rank{k}": float((first < k).sum() / n) if n else float("nan") for k in ranks}


def mean_average_precision(sim: np.ndarray, probe_ids: list, gallery_ids: list) -> float:
    g = np.array(gallery_ids)
    aps = []
    for i, pid in enumerate(probe_ids):
        rel = (g[np.argsort(-sim[i])] == pid).astype(float)
        if rel.sum() == 0:
            continue
        prec = np.cumsum(rel) / np.arange(1, len(rel) + 1)
        aps.append(float((prec * rel).sum() / rel.sum()))
    return float(np.mean(aps)) if aps else float("nan")


def pairs(sim: np.ndarray, probe_ids: list, gallery_ids: list) -> tuple[np.ndarray, np.ndarray]:
    same = np.array(probe_ids)[:, None] == np.array(gallery_ids)[None, :]
    return sim[same], sim[~same]


def far_frr(genuine: np.ndarray, impostor: np.ndarray, threshold: float) -> dict[str, float]:
    return {"threshold": float(threshold),
            "far": float((impostor >= threshold).mean()) if impostor.size else float("nan"),
            "frr": float((genuine < threshold).mean()) if genuine.size else float("nan")}


def threshold_at_far(impostor: np.ndarray, target: float) -> float:
    """Smallest threshold whose false-accept rate is at most `target`."""
    if impostor.size == 0:
        return float("nan")
    s = np.sort(impostor)[::-1]
    k = int(np.floor(target * len(s)))
    return float(s[k] + 1e-6) if k < len(s) else float(s[-1])


def open_set_dir(sim_known: np.ndarray, known_ids: list, gallery_ids: list, sim_unknown: np.ndarray, far: float) -> dict[str, float]:
    """DIR@FAR: share of known probes ranked first correctly AND above the threshold
    at which only `far` of unknown probes would be (wrongly) accepted."""
    top_unknown = sim_unknown.max(axis=1) if sim_unknown.size else np.array([])
    t = threshold_at_far(top_unknown, far)
    g = np.array(gallery_ids)
    best = sim_known.argmax(axis=1)
    correct = (g[best] == np.array(known_ids)) & (sim_known.max(axis=1) >= t)
    return {"far": far, "threshold": t, "dir": float(correct.mean()) if len(known_ids) else float("nan"),
            "unknown_rejected": float((top_unknown < t).mean()) if top_unknown.size else float("nan")}


def report(probe_emb, probe_ids, gallery_emb, gallery_ids, unknown_emb=None, fars=(0.01, 0.001)) -> dict:
    sim = similarity(probe_emb, gallery_emb)
    gen, imp = pairs(sim, probe_ids, gallery_ids)
    out = {"probes": len(probe_ids), "gallery": len(gallery_ids), "individuals": len(set(gallery_ids)),
           **cmc(sim, probe_ids, gallery_ids), "mAP": mean_average_precision(sim, probe_ids, gallery_ids),
           "verification": [far_frr(gen, imp, threshold_at_far(imp, f)) | {"target_far": f} for f in fars]}
    if unknown_emb is not None and len(unknown_emb):
        su = similarity(unknown_emb, gallery_emb)
        out["open_set"] = [open_set_dir(sim, probe_ids, gallery_ids, su, f) for f in fars]
    return out
