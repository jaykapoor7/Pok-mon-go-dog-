"""Image preparation shared by the service, the worker and the research code."""
from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageOps

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 40_000_000
SIZE = 224  # DINOv2 ViT-B/14: 16 x 16 patches
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class ImageError(ValueError):
    """The bytes are not a usable photograph."""


def open_image(data: bytes) -> Image.Image:
    if len(data) > MAX_BYTES:
        raise ImageError("Image is over 10 MB")
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception as exc:  # noqa: BLE001 - any decode failure is the same to the caller
        raise ImageError("Not a readable image") from exc
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def crop(im: Image.Image, box: tuple[int, int, int, int] | None) -> Image.Image:
    """Optional crop to the animal (x0, y0, x1, y1), e.g. from a detector or a person's selection."""
    if not box:
        return im
    x0, y0, x1, y1 = box
    w, h = im.size
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
    if x1 - x0 < 32 or y1 - y0 < 32:
        raise ImageError("Crop is too small")
    return im.crop((x0, y0, x1, y1))


def to_tensor_array(im: Image.Image) -> np.ndarray:
    """Resize the short side to 256, centre-crop 224, normalise; CHW float32."""
    w, h = im.size
    scale = 256 / min(w, h)
    im = im.resize((max(SIZE, round(w * scale)), max(SIZE, round(h * scale))), Image.BICUBIC)
    w, h = im.size
    left, top = (w - SIZE) // 2, (h - SIZE) // 2
    im = im.crop((left, top, left + SIZE, top + SIZE))
    arr = (np.asarray(im, dtype=np.float32) / 255.0 - MEAN) / STD
    return arr.transpose(2, 0, 1).copy()
