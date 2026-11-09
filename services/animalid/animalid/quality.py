"""Is this photo good enough to search with?

Simple, explainable checks that run before any model: resolution, blur
(variance of a Laplacian), exposure and how much of the frame is flat. A
failed check is returned with a reason a field worker can act on.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np
from PIL import Image

MIN_SIDE = 160
BLUR_MIN = 60.0          # Laplacian variance on a 512px greyscale copy
DARK_MAX = 0.12          # mean brightness below this is too dark
BRIGHT_MIN = 0.92        # mean brightness above this is washed out
FLAT_MAX = 0.9           # share of near-uniform 16px blocks: likely obstructed or blank


@dataclass
class Quality:
    ok: bool
    width: int
    height: int
    blur: float
    brightness: float
    flat: float
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def _laplacian_var(g: np.ndarray) -> float:
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    return float(lap.var())


def assess(im: Image.Image) -> Quality:
    w, h = im.size
    g = im.convert("L")
    scale = 512 / max(w, h)
    if scale < 1:
        g = g.resize((max(1, round(w * scale)), max(1, round(h * scale))))
    a = np.asarray(g, dtype=np.float32)
    blur = _laplacian_var(a) if min(a.shape) >= 3 else 0.0
    brightness = float(a.mean() / 255.0)
    hb, wb = a.shape[0] // 16, a.shape[1] // 16
    blocks = a[: hb * 16, : wb * 16].reshape(hb, 16, wb, 16).std(axis=(1, 3)) if hb and wb else np.zeros((1, 1))
    flat = float((blocks < 3).mean())
    reasons: list[str] = []
    if min(w, h) < MIN_SIDE:
        reasons.append(f"Too small: {w}x{h}. Use a photo at least {MIN_SIDE} pixels on the short side.")
    if blur < BLUR_MIN:
        reasons.append("Blurred. Hold the phone still and tap to focus on the animal.")
    if brightness < DARK_MAX:
        reasons.append("Too dark. Take the photo in better light.")
    if brightness > BRIGHT_MIN:
        reasons.append("Washed out. Avoid pointing into the sun.")
    if flat > FLAT_MAX:
        reasons.append("Mostly blank or covered. Make sure the animal fills the frame.")
    return Quality(ok=not reasons, width=w, height=h, blur=round(blur, 1), brightness=round(brightness, 3), flat=round(flat, 3), reasons=reasons)
