import io
import os

import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageFilter

os.environ.setdefault("ANIMALID_BACKBONE", "test_hash")
os.environ.setdefault("ANIMALID_TOKEN", "test-token")

from animalid import backbones, worker  # noqa: E402
from animalid.preprocess import ImageError, crop, open_image, to_tensor_array  # noqa: E402
from animalid.quality import assess  # noqa: E402


def photo(seed=1, size=(640, 480), blur=0):
    rng = np.random.default_rng(seed)
    im = Image.new("RGB", size, (120, 110, 100))
    d = ImageDraw.Draw(im)
    for _ in range(80):
        x, y = rng.integers(0, size[0]), rng.integers(0, size[1])
        r = int(rng.integers(5, 40))
        d.ellipse((x, y, x + r, y + r), fill=tuple(int(c) for c in rng.integers(0, 255, 3)))
    noise = rng.normal(0, 12, (size[1], size[0], 3))
    im = Image.fromarray(np.clip(np.asarray(im, dtype=np.float32) + noise, 0, 255).astype(np.uint8))
    return im.filter(ImageFilter.GaussianBlur(blur)) if blur else im


def jpeg(im):
    b = io.BytesIO()
    im.save(b, "JPEG", quality=90)
    return b.getvalue()


def test_sharp_photo_passes_and_blurred_photo_is_rejected_with_a_reason():
    assert assess(photo()).ok
    q = assess(photo(blur=8))
    assert not q.ok and any("Blurred" in r for r in q.reasons)


def test_small_dark_and_blank_photos_are_rejected():
    assert any("Too small" in r for r in assess(photo(size=(120, 90))).reasons)
    assert any("Too dark" in r for r in assess(Image.new("RGB", (400, 400), (5, 5, 5))).reasons)
    assert any("blank" in r for r in assess(Image.new("RGB", (400, 400), (128, 128, 128))).reasons)


def test_preprocess_gives_224_square_normalised_tensor():
    arr = to_tensor_array(photo(size=(1000, 300)))
    assert arr.shape == (3, 224, 224) and arr.dtype == np.float32
    assert abs(float(arr.mean())) < 3


def test_unreadable_and_oversize_bytes_are_refused():
    with pytest.raises(ImageError):
        open_image(b"not an image")
    with pytest.raises(ImageError):
        open_image(b"0" * (10 * 1024 * 1024 + 1))
    with pytest.raises(ImageError):
        crop(photo(), (0, 0, 10, 10))


def test_embeddings_are_unit_length_and_deterministic():
    m = backbones.HashBackbone()
    a, b = m.embed([photo(1), photo(1)]), m.embed([photo(2)])
    assert a.shape == (2, 768)
    assert np.allclose(np.linalg.norm(a, axis=1), 1, atol=1e-5)
    assert np.allclose(a[0], a[1]) and not np.allclose(a[0], b[0])


def test_api_needs_the_token_and_returns_quality_then_embedding():
    from fastapi.testclient import TestClient

    from animalid.api import app

    c = TestClient(app)
    assert c.get("/v1/health").json() == {"ok": True}
    assert c.get("/v1/model").status_code == 401
    h = {"Authorization": "Bearer test-token"}
    info = c.get("/v1/model", headers=h).json()
    assert info["validated_for_identity"] is False
    good = c.post("/v1/embed", headers=h, files={"file": ("a.jpg", jpeg(photo()), "image/jpeg")}).json()
    assert good["usable"] and len(good["embedding"]) == 768
    bad = c.post("/v1/embed", headers=h, files={"file": ("b.jpg", jpeg(photo(blur=8)), "image/jpeg")}).json()
    assert bad["usable"] is False and "embedding" not in bad
    assert c.post("/v1/embed", headers=h, files={"file": ("c.jpg", b"xx", "image/jpeg")}).status_code == 422


class FakeDb:
    """Records RPC calls; serves photos from a dict."""

    url = "https://example.supabase.co"

    def __init__(self, jobs, files):
        self.jobs, self.files, self.calls = list(jobs), files, []

    def rpc(self, name, args):
        self.calls.append((name, args))
        if name == "animalid_claim_job":
            return self.jobs.pop(0) if self.jobs else None
        return None

    def select(self, table, query):
        return [{"id": "dog-1", "cover_photo": "storage://animal-photos/org/dog-1.jpg"}, {"id": "dog-2", "cover_photo": "https://elsewhere.example/x.jpg"}]

    def download(self, uri):
        if uri not in self.files:
            raise ImageError("Photo not found in storage")
        return self.files[uri]


def test_worker_completes_a_search_with_an_embedding_and_never_matches_itself():
    job = {"id": "j1", "kind": "search", "ngo_id": "org", "photo_uri": "storage://animalid-photos/org/a.jpg", "model_version": "test_hash@0", "species": "dog"}
    db = FakeDb([job], {job["photo_uri"]: jpeg(photo())})
    assert worker.process_one(db, backbones.HashBackbone()) == "done"
    name, args = db.calls[-1]
    assert name == "animalid_complete_search" and args["p_job"] == "j1" and args["p_embedding"].startswith("[")
    assert len(args["p_embedding"].strip("[]").split(",")) == 768


def test_worker_rejects_a_poor_photo_without_embedding_it():
    job = {"id": "j2", "kind": "search", "ngo_id": "org", "photo_uri": "storage://animalid-photos/org/b.jpg", "model_version": "test_hash@0"}
    db = FakeDb([job], {job["photo_uri"]: jpeg(photo(blur=8))})
    assert worker.process_one(db, backbones.HashBackbone()) == "rejected_quality"
    assert all(c[0] != "animalid_complete_search" for c in db.calls)


def test_worker_refuses_a_job_for_another_model_version_and_skips_foreign_photos():
    db = FakeDb([{"id": "j3", "kind": "search", "ngo_id": "org", "photo_uri": "storage://x/y.jpg", "model_version": "other@9"}], {})
    assert worker.process_one(db, backbones.HashBackbone()) == "failed"
    db = FakeDb([{"id": "j4", "kind": "index", "ngo_id": "org", "model_version": "test_hash@0"}], {"storage://animal-photos/org/dog-1.jpg": jpeg(photo())})
    assert worker.process_one(db, backbones.HashBackbone()) == "done"
    stored = [c for c in db.calls if c[0] == "animalid_store_embedding"]
    assert [c[1]["p_dog"] for c in stored] == ["dog-1"]
    assert db.calls[-1] == ("animalid_finish_index", {"p_job": "j4", "p_indexed": 1, "p_skipped": 0})


def test_idle_queue_returns_none():
    assert worker.process_one(FakeDb([], {}), backbones.HashBackbone()) is None
