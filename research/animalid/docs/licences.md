# Licences and dependencies

| Component | Licence | Use |
|---|---|---|
| DINOv2 code and pretrained weights (facebook/dinov2-base) | Apache-2.0 | backbone; commercial use permitted with notice |
| PyTorch, torchvision | BSD-3-Clause | inference and training |
| Hugging Face transformers | Apache-2.0 | model loading |
| NumPy | BSD-3-Clause | arrays, metrics |
| Pillow | MIT-CMU (HPND) | image decoding |
| FastAPI | MIT | API |
| Uvicorn | BSD-3-Clause | API server |
| httpx | BSD-3-Clause | worker HTTP |
| pgvector | PostgreSQL licence | similarity search |

Before evaluating DINOv3 or any published re-identification baseline, record its weights licence here.
Weights or datasets under non-commercial terms may be used for research comparison only, never in the
product or to train a deployed model, without written permission.

Photos: owned by the contributing organisations. They may be used for training only under a recorded
`animalid_training_consent` grant; evaluation-only rights allow measurement but not training.
