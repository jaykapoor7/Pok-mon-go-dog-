# StrayPaw AnimalID: research package

Reproducible dataset handling, evaluation and training for animal re-identification,
kept separate from the StrayPaw application so it can be published independently.

**Status (9 November 2026): infrastructure only.** No model has been trained and no
identity accuracy has been measured, because no labelled dataset with confirmed
identities and training permission exists yet. Nothing here should be quoted as a result.

| Part | Where | State |
|---|---|---|
| Manifest with provenance and usage rights | `animalid_research/manifest.py` | built, tested |
| Leakage-free splits (identity-disjoint, temporal, geographic, open set) | `animalid_research/splits.py` | built, tested |
| Metrics (rank-1/5, mAP, FAR/FRR, threshold at FAR, open-set DIR@FAR) | `animalid_research/metrics.py` | built, tested on synthetic embeddings |
| Baseline evaluation (DINOv2 ViT-B/14) | `animalid_research/evaluate.py` | built; refuses to report on insufficient data |
| Metric-learning head (supervised contrastive) | `animalid_research/train_head.py` | built, tested for determinism on synthetic data |
| Backbone fine-tuning | not yet | planned after a head baseline exists |

## Run

```bash
pip install --index-url https://download.pytorch.org/whl/cpu torch && pip install -r ../../services/animalid/requirements.txt pytest
pytest -q
python -m animalid_research.evaluate --manifest data/manifest.csv --protocol identity_disjoint --out reports/
```

Data, photos and checkpoints live outside the repository (`data/`, `reports/`, `checkpoints/` are git-ignored)
and stay private by default.

## Documents

* [Architecture](docs/architecture.md)
* [Training and evaluation](docs/training-and-evaluation.md)
* [Model card template](docs/model-card-template.md)
* [Dataset card template](docs/dataset-card-template.md)
* [Reproducibility](docs/reproducibility.md)
* [Licences and dependencies](docs/licences.md)
* [Ethics, limits and deployment risks](docs/ethics-and-risks.md)
* [Paper outline](docs/paper-outline.md)
* [API](docs/api.md)
* [Activation checklist](docs/activation.md)
