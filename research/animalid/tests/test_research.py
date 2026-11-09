import csv
from datetime import datetime

import numpy as np

from animalid_research import manifest, metrics, splits, train_head


def write_manifest(path, rows):
    cols = ["image_path", "individual_id", "species", "source", "label_provenance", "usage_rights", "captured_at", "location_cell", "organisation", "camera", "notes"]
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in cols})


def test_manifest_excludes_unconfirmed_labels_and_missing_rights(tmp_path):
    p = tmp_path / "m.csv"
    write_manifest(p, [
        {"image_path": "a.jpg", "individual_id": "d1", "species": "dog", "source": "org", "label_provenance": "human_confirmed", "usage_rights": "training_allowed"},
        {"image_path": "b.jpg", "individual_id": "d1", "species": "dog", "source": "org", "label_provenance": "imported_unverified", "usage_rights": "training_allowed"},
        {"image_path": "c.jpg", "individual_id": "d2", "species": "dog", "source": "org", "label_provenance": "human_confirmed", "usage_rights": "unknown"},
        {"image_path": "d.jpg", "individual_id": "d3", "species": "dog", "source": "org", "label_provenance": "human_confirmed", "usage_rights": "evaluation_only"},
        {"image_path": "e.jpg", "individual_id": "d4", "species": "dog", "source": "org", "label_provenance": "guess", "usage_rights": "training_allowed"},
    ])
    rep = manifest.load(p)
    assert [r.image_path for r in rep.trainable] == ["a.jpg"]
    assert [r.image_path for r in rep.evaluable] == ["a.jpg", "d.jpg"]
    assert len(rep.errors) == 1 and "label_provenance" in rep.errors[0]
    s = rep.summary()
    assert s["excluded_unconfirmed"] == 1 and s["excluded_no_rights"] == 1


def rows(n_ids=30, per=4):
    out = []
    for i in range(n_ids):
        for k in range(per):
            out.append(manifest.Row(f"{i}-{k}.jpg", f"d{i}", "dog", "t", "human_confirmed", "training_allowed", datetime(2026, 1 + k, 1), f"cell{i % 5}"))
    return out


def test_identity_disjoint_split_never_shares_an_animal():
    s = splits.identity_disjoint(rows(), seed=3)
    ids = {k: {r.individual_id for r in v} for k, v in s.items()}
    assert not (ids["train"] & ids["test"]) and not (ids["train"] & ids["val"]) and not (ids["val"] & ids["test"])
    assert splits.identity_disjoint(rows(), seed=3) == s


def test_temporal_and_geographic_holdouts():
    t = splits.temporal(rows(), datetime(2026, 3, 1))
    assert all(r.captured_at < datetime(2026, 3, 1) for r in t["train"]) and all(r.captured_at >= datetime(2026, 3, 1) for r in t["test"])
    g = splits.geographic(rows(), {"cell0"})
    assert {r.location_cell for r in g["test"]} == {"cell0"} and "cell0" not in {r.location_cell for r in g["train"]}


def test_gallery_holds_the_first_encounter_and_open_set_withholds_animals():
    gallery, probes = splits.gallery_probe(rows(5, 3))
    assert len(gallery) == 5 and len(probes) == 10 and all(r.captured_at.month == 1 for r in gallery)
    g, p, u = splits.open_set(rows(10, 3), unknown_share=0.3)
    assert {r.individual_id for r in u}.isdisjoint({r.individual_id for r in g})


def clustered(n_ids, per, noise, seed=0, dim=32):
    rng = np.random.default_rng(seed)
    centres = rng.standard_normal((n_ids, dim))
    x = np.repeat(centres, per, axis=0) + noise * rng.standard_normal((n_ids * per, dim))
    x /= np.linalg.norm(x, axis=1, keepdims=True)
    return x.astype(np.float32), np.repeat(np.arange(n_ids), per)


def test_metrics_are_perfect_on_separable_data_and_near_chance_on_noise():
    x, y = clustered(20, 3, 0.01)
    gi = np.arange(0, 60, 3)
    pi = np.setdiff1d(np.arange(60), gi)
    r = metrics.report(x[pi], list(y[pi]), x[gi], list(y[gi]))
    assert r["rank1"] == 1.0 and r["rank5"] == 1.0 and abs(r["mAP"] - 1) < 1e-9
    assert r["verification"][0]["frr"] == 0.0
    x, y = clustered(50, 3, 50.0, seed=1)
    gi = np.arange(0, 150, 3)
    pi = np.setdiff1d(np.arange(150), gi)
    assert metrics.report(x[pi], list(y[pi]), x[gi], list(y[gi]))["rank1"] < 0.3


def test_threshold_meets_the_target_false_accept_rate():
    imp = np.linspace(-1, 1, 1001)
    t = metrics.threshold_at_far(imp, 0.01)
    assert (imp >= t).mean() <= 0.01


def test_open_set_rejects_unknown_animals_at_the_threshold():
    x, y = clustered(20, 3, 0.05)
    gi = np.arange(0, 30, 3)
    pi = np.setdiff1d(np.arange(30), gi)
    ui = np.arange(30, 60)
    r = metrics.report(x[pi], list(y[pi]), x[gi], list(y[gi]), unknown_emb=x[ui])
    assert r["open_set"][0]["unknown_rejected"] >= 0.9 and r["open_set"][0]["dir"] >= 0.9


def test_head_training_is_deterministic_and_lowers_the_loss():
    x, y = clustered(15, 4, 0.8, dim=64)
    cfg = train_head.DEFAULT | {"epochs": 15, "out_dim": 16, "batch": 60}
    _, l1 = train_head.train(x, y, cfg)
    _, l2 = train_head.train(x, y, cfg)
    assert l1[-1] < l1[0] and np.allclose(l1, l2)
