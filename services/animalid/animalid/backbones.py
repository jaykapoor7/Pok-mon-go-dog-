"""Embedding backbones behind one interface.

The application never depends on a particular model: it stores the model
version with every embedding, so DINOv3 or a fine-tuned StrayPaw head can be
evaluated and switched in without changing the integration.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Protocol

import numpy as np
from PIL import Image

from .preprocess import to_tensor_array


class Backbone(Protocol):
    version: str
    dim: int
    licence: str

    def embed(self, images: list[Image.Image]) -> np.ndarray:
        """Return an (n, dim) float32 array of L2-normalised embeddings."""
        ...


def l2_normalise(x: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(x, axis=1, keepdims=True)
    return (x / np.clip(norm, 1e-12, None)).astype(np.float32)


@dataclass
class HashBackbone:
    """Deterministic stand-in for tests: the same pixels give the same vector.

    It has no notion of identity and must never be used for real searches.
    """

    version: str = "test_hash@0"
    dim: int = 768
    licence: str = "n/a (test only)"

    def embed(self, images: list[Image.Image]) -> np.ndarray:
        out = []
        for im in images:
            digest = hashlib.sha256(np.asarray(im.convert("RGB").resize((32, 32))).tobytes()).digest()
            rng = np.random.default_rng(int.from_bytes(digest[:8], "little"))
            out.append(rng.standard_normal(self.dim))
        return l2_normalise(np.array(out))


class DinoV2:
    """DINOv2 ViT-B/14 (facebook/dinov2-base, Apache-2.0). CLS token, L2-normalised.

    Pretrained features only: not validated for individual dog identity until an
    evaluation on labelled data says otherwise.
    """

    version = "dinov2_vitb14@1"
    dim = 768
    licence = "Apache-2.0"

    def __init__(self, model_id: str = "facebook/dinov2-base", device: str | None = None):
        import torch
        from transformers import AutoModel

        self._torch = torch
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = AutoModel.from_pretrained(model_id).to(self.device).eval()

    def embed(self, images: list[Image.Image]) -> np.ndarray:
        torch = self._torch
        batch = torch.from_numpy(np.stack([to_tensor_array(im) for im in images])).to(self.device)
        with torch.inference_mode():
            out = self.model(pixel_values=batch)
            cls = out.last_hidden_state[:, 0, :]
        return l2_normalise(cls.float().cpu().numpy())


def load(name: str) -> Backbone:
    if name == "dinov2_vitb14":
        return DinoV2()
    if name == "test_hash":
        return HashBackbone()
    raise ValueError(f"Unknown backbone {name!r}")
