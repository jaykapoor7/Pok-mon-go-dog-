"""AnimalID worker: processes queued jobs from the StrayPaw database.

Runs next to the model, never inside the web app. It holds the Supabase
service key (server-side only), claims one job at a time, reads the photo
from private storage, checks quality, embeds and hands the vector back to the
database, which does the matching inside the organisation. Failed jobs are
retried up to three times by the database's claim function.

Environment:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   the project (staging first)
  ANIMALID_BACKBONE                          dinov2_vitb14 (default)
  ANIMALID_POLL_SECONDS                      idle wait between polls (default 5)
"""
from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Callable

import httpx

from . import backbones
from .preprocess import ImageError, open_image
from .quality import assess

log = logging.getLogger("animalid.worker")


@dataclass
class Db:
    """The few calls the worker makes, over Supabase's REST and storage APIs."""

    url: str
    key: str
    client: httpx.Client

    @classmethod
    def from_env(cls) -> "Db":
        url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        return cls(url, key, httpx.Client(timeout=30, headers={"apikey": key, "Authorization": f"Bearer {key}"}))

    def rpc(self, name: str, args: dict[str, Any]) -> Any:
        r = self.client.post(f"{self.url}/rest/v1/rpc/{name}", json=args)
        r.raise_for_status()
        return r.json() if r.content else None

    def select(self, table: str, query: str) -> list[dict]:
        r = self.client.get(f"{self.url}/rest/v1/{table}?{query}")
        r.raise_for_status()
        return r.json()

    def download(self, uri: str) -> bytes:
        """Only this project's own storage is read: private objects, or its public-bucket URLs."""
        public = f"{self.url}/storage/v1/object/public/"
        if uri.startswith("storage://"):
            bucket, _, path = uri.removeprefix("storage://").partition("/")
            target = f"{self.url}/storage/v1/object/{bucket}/{path}"
        elif uri.startswith(public):
            target = uri
        else:
            raise ImageError("Only photos stored in StrayPaw are processed")
        r = self.client.get(target)
        if r.status_code == 404:
            raise ImageError("Photo not found in storage")
        r.raise_for_status()
        return r.content


def vector_text(v) -> str:
    return "[" + ",".join(f"{float(x):.6f}" for x in v) + "]"


def run_search(db: Db, job: dict, model: backbones.Backbone) -> str:
    try:
        im = open_image(db.download(job["photo_uri"]))
    except ImageError as exc:
        db.rpc("animalid_fail_job", {"p_job": job["id"], "p_status": "failed", "p_error": str(exc)})
        return "failed"
    q = assess(im)
    if not q.ok:
        db.rpc("animalid_fail_job", {"p_job": job["id"], "p_status": "rejected_quality", "p_error": "; ".join(q.reasons), "p_quality": q.to_dict()})
        return "rejected_quality"
    vec = model.embed([im])[0]
    db.rpc("animalid_complete_search", {"p_job": job["id"], "p_embedding": vector_text(vec), "p_quality": q.to_dict(), "p_k": 5})
    return "done"


def profile_photos(db: Db, ngo_id: str) -> list[tuple[str, str]]:
    """(dog_id, storage uri) for the organisation's animals with a stored photo."""
    rows = db.select("dogs", f"select=id,cover_photo&ngo_id=eq.{ngo_id}&cover_photo=not.is.null&limit=5000")
    return [(r["id"], r["cover_photo"]) for r in rows if (r.get("cover_photo") or "").startswith(("storage://", db.url))]


def run_index(db: Db, job: dict, model: backbones.Backbone) -> str:
    indexed = skipped = 0
    for dog_id, uri in profile_photos(db, job["ngo_id"]):
        try:
            im = open_image(db.download(uri))
        except ImageError:
            skipped += 1
            continue
        q = assess(im)
        if not q.ok:
            skipped += 1
            continue
        vec = model.embed([im])[0]
        db.rpc("animalid_store_embedding", {"p_ngo": job["ngo_id"], "p_dog": dog_id, "p_species": job.get("species") or "dog", "p_photo_uri": uri,
                                            "p_source": "profile", "p_model": job["model_version"], "p_embedding": vector_text(vec), "p_quality": q.to_dict()})
        indexed += 1
    db.rpc("animalid_finish_index", {"p_job": job["id"], "p_indexed": indexed, "p_skipped": skipped})
    return "done"


def process_one(db: Db, model: backbones.Backbone) -> str | None:
    job = db.rpc("animalid_claim_job", {})
    if not job or not job.get("id"):
        return None
    if job.get("model_version") and job["model_version"] != model.version:
        db.rpc("animalid_fail_job", {"p_job": job["id"], "p_status": "failed", "p_error": f"Worker runs {model.version}, job needs {job['model_version']}"})
        return "failed"
    t0 = time.perf_counter()
    try:
        status = (run_search if job["kind"] == "search" else run_index)(db, job, model)
    except httpx.HTTPError as exc:
        # Transient: put it back in the queue; the claim function stops after three attempts.
        db.rpc("animalid_fail_job", {"p_job": job["id"], "p_status": "queued", "p_error": f"Network error: {type(exc).__name__}"})
        status = "retry"
    log.info(json.dumps({"event": "job", "id": job["id"], "kind": job["kind"], "status": status, "ms": round((time.perf_counter() - t0) * 1000)}))
    return status


def main(sleep: Callable[[float], None] = time.sleep) -> None:  # pragma: no cover - long-running loop
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    db, model = Db.from_env(), backbones.load(os.environ.get("ANIMALID_BACKBONE", "dinov2_vitb14"))
    idle = float(os.environ.get("ANIMALID_POLL_SECONDS", "5"))
    while True:
        if process_one(db, model) is None:
            sleep(idle)


if __name__ == "__main__":  # pragma: no cover
    main()
