# Reproducibility

* Every split takes an explicit `--seed` (default 13); `splits.identity_disjoint` is deterministic for a seed and manifest.
* The dataset version is the SHA-256 fingerprint of sorted (image, identity, rights) triples (`manifest.fingerprint`).
* Evaluation JSON records protocol, seed, dataset version, model version, machine, timing and the manifest summary.
* Training sets PyTorch, NumPy and Python seeds and requests deterministic algorithms; checkpoints store the config,
  seed, loss curve, dataset fingerprint and backbone version.
* Preprocessing is fixed in `services/animalid/animalid/preprocess.py` (EXIF orientation, short side 256, centre crop 224,
  ImageNet mean and standard deviation) and shared by the worker and the research code.
* Pin dependency versions in a lock file for any run whose numbers will be reported.
