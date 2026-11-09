"""AnimalID HTTP API, version 1.

POST /v1/embed     multipart image (+ optional crop) -> quality and, if usable, the embedding
POST /v1/quality   multipart image -> quality checks only
GET  /v1/model     the loaded backbone version, dimension and licence
GET  /v1/health    liveness

Every request except /v1/health needs `Authorization: Bearer $ANIMALID_TOKEN`.
The service never stores images and never logs image content.
"""
from __future__ import annotations

import hmac
import logging
import os
import time
from functools import lru_cache

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile

from . import backbones
from .preprocess import ImageError, crop, open_image
from .quality import assess

log = logging.getLogger("animalid.api")
app = FastAPI(title="StrayPaw AnimalID", version="1.0.0")


@lru_cache(maxsize=1)
def model() -> backbones.Backbone:
    return backbones.load(os.environ.get("ANIMALID_BACKBONE", "dinov2_vitb14"))


def authorised(authorization: str | None = Header(default=None)) -> None:
    token = os.environ.get("ANIMALID_TOKEN", "")
    given = (authorization or "").removeprefix("Bearer ").strip()
    if not token or not hmac.compare_digest(given, token):
        raise HTTPException(status_code=401, detail="Not authorised")


def _box(box: str | None) -> tuple[int, int, int, int] | None:
    if not box:
        return None
    try:
        x0, y0, x1, y1 = (int(float(v)) for v in box.split(","))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="crop must be x0,y0,x1,y1") from exc
    return x0, y0, x1, y1


async def _image(file: UploadFile, box: str | None):
    data = await file.read()
    try:
        return crop(open_image(data), _box(box))
    except ImageError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/v1/health")
def health() -> dict:
    return {"ok": True}


@app.get("/v1/model", dependencies=[Depends(authorised)])
def model_info() -> dict:
    m = model()
    return {"version": m.version, "dim": m.dim, "licence": m.licence, "validated_for_identity": False}


@app.post("/v1/quality", dependencies=[Depends(authorised)])
async def quality(file: UploadFile = File(...), crop_box: str | None = Form(default=None)) -> dict:
    return assess(await _image(file, crop_box)).to_dict()


@app.post("/v1/embed", dependencies=[Depends(authorised)])
async def embed(file: UploadFile = File(...), crop_box: str | None = Form(default=None), force: bool = Form(default=False)) -> dict:
    im = await _image(file, crop_box)
    q = assess(im)
    if not q.ok and not force:
        return {"usable": False, "quality": q.to_dict()}
    m = model()
    t0 = time.perf_counter()
    vec = m.embed([im])[0]
    ms = round((time.perf_counter() - t0) * 1000)
    log.info("embedded", extra={"model": m.version, "ms": ms, "w": q.width, "h": q.height})
    return {"usable": True, "quality": q.to_dict(), "model_version": m.version, "dim": m.dim, "embedding": [round(float(x), 6) for x in vec], "ms": ms}
