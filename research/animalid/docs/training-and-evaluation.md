# Training and evaluation

## 1. Build a manifest
Export human-confirmed identities from StrayPaw (`animalid_decisions` with `training_eligible`, or
`microchip_verified` labels from scanned identifiers) into `data/manifest.csv`. One row per image:
`image_path, individual_id, species, source, label_provenance, usage_rights, captured_at, location_cell, organisation, camera`.

Rows with `imported_unverified` or `model_suggested` labels, or without `training_allowed` /
`evaluation_only` rights, are excluded automatically. Imported registers and medical records are never
treated as confirmed identities.

## 2. Evaluate the baseline
```bash
python -m animalid_research.evaluate --manifest data/manifest.csv --protocol identity_disjoint
python -m animalid_research.evaluate --manifest data/manifest.csv --protocol temporal --cutoff 2027-01-01
python -m animalid_research.evaluate --manifest data/manifest.csv --protocol geographic --cells <h3 cells>
```
Reports: rank-1, rank-5, mAP, FAR/FRR at thresholds meeting FAR 1% and 0.1%, open-set DIR@FAR with
30% of identities withheld as unknowns, and latency per image. With fewer than 20 individuals that have a
repeat image in the test split, the script writes `insufficient_data` instead of numbers.

Robustness slices (lighting, camera, viewpoint, similar coats, time gaps) are produced by filtering the
manifest by `camera`, `captured_at` gap and annotation tags, then re-running the same command.

## 3. Train a head
Cache embeddings for trainable rows, then:
```bash
python -m animalid_research.train_head --embeddings cache/train.npz --config configs/head.json --dataset-version <fingerprint>
```
The checkpoint records config, seed, loss curve, dataset fingerprint and backbone version. Evaluate it with
the same protocols before it can become a model version. Training is run by a person; it is never triggered
by uploads.

## 4. Register a model version
Insert a row into `animalid_model_versions` with the evaluation's thresholds and `calibrated = true`, store the
evaluation in `animalid_evaluations`, re-index, then switch `active`. Keep the previous version until the new one
has run on real searches.
