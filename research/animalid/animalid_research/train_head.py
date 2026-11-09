"""Train a metric-learning head on frozen backbone embeddings.

A small projection (768 -> 256, L2-normalised) learned with a supervised
contrastive loss on human-confirmed identities with training rights only.
Fine-tuning a licensed backbone with our own verified data is a valid first
StrayPaw model; training from scratch is not attempted.

  python -m animalid_research.train_head --embeddings cache/train.npz --config configs/head.json --out checkpoints/

The .npz holds `x` (n, d) embeddings and `y` (n,) identity labels, produced by
`cache_embeddings` from the manifest's trainable rows. Training is an explicit
operation run by a person; nothing triggers it from live uploads.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

DEFAULT = {"out_dim": 256, "temperature": 0.1, "lr": 1e-3, "epochs": 30, "batch": 128, "seed": 13, "weight_decay": 1e-4}


def seed_all(seed: int) -> None:
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


def supcon_loss(z, y, temperature: float):
    import torch

    sim = z @ z.T / temperature
    n = z.shape[0]
    eye = torch.eye(n, dtype=torch.bool, device=z.device)
    pos = (y[:, None] == y[None, :]) & ~eye
    sim = sim.masked_fill(eye, -1e9)
    log_prob = sim - torch.logsumexp(sim, dim=1, keepdim=True)
    has = pos.any(dim=1)
    if not has.any():
        return sim.sum() * 0
    return -(log_prob * pos).sum(dim=1)[has].div(pos.sum(dim=1)[has]).mean()


def train(x: np.ndarray, y: np.ndarray, cfg: dict) -> tuple["object", list[float]]:
    import torch

    seed_all(cfg["seed"])
    head = torch.nn.Linear(x.shape[1], cfg["out_dim"], bias=False)
    opt = torch.optim.AdamW(head.parameters(), lr=cfg["lr"], weight_decay=cfg["weight_decay"])
    X, Y = torch.from_numpy(x.astype(np.float32)), torch.from_numpy(y.astype(np.int64))
    g = torch.Generator().manual_seed(cfg["seed"])
    losses = []
    for _ in range(cfg["epochs"]):
        order = torch.randperm(len(X), generator=g)
        total, steps = 0.0, 0
        for i in range(0, len(X), cfg["batch"]):
            idx = order[i:i + cfg["batch"]]
            z = torch.nn.functional.normalize(head(X[idx]), dim=1)
            loss = supcon_loss(z, Y[idx], cfg["temperature"])
            opt.zero_grad()
            loss.backward()
            opt.step()
            total, steps = total + float(loss.detach()), steps + 1
        losses.append(total / max(1, steps))
    return head, losses


def project(head, x: np.ndarray) -> np.ndarray:
    import torch

    with torch.no_grad():
        return torch.nn.functional.normalize(head(torch.from_numpy(x.astype(np.float32))), dim=1).numpy()


def save(head, cfg: dict, losses: list[float], dataset_version: str, backbone_version: str, out: str) -> Path:
    import torch

    Path(out).mkdir(parents=True, exist_ok=True)
    tag = hashlib.sha256(json.dumps([cfg, dataset_version, backbone_version], sort_keys=True).encode()).hexdigest()[:8]
    version = f"{backbone_version.split('@')[0]}+head{cfg['out_dim']}@{tag}"
    path = Path(out) / f"{version}.pt"
    torch.save({"state_dict": head.state_dict(), "config": cfg, "losses": losses, "dataset_version": dataset_version,
                "backbone_version": backbone_version, "model_version": version, "created_at": datetime.now(timezone.utc).isoformat()}, path)
    return path


def main() -> None:
    a = argparse.ArgumentParser()
    a.add_argument("--embeddings", required=True)
    a.add_argument("--config")
    a.add_argument("--dataset-version", required=True)
    a.add_argument("--backbone-version", default="dinov2_vitb14@1")
    a.add_argument("--out", default="checkpoints")
    x = a.parse_args()
    cfg = DEFAULT | (json.loads(Path(x.config).read_text()) if x.config else {})
    data = np.load(x.embeddings)
    head, losses = train(data["x"], data["y"], cfg)
    print(save(head, cfg, losses, x.dataset_version, x.backbone_version, x.out))


if __name__ == "__main__":
    main()
