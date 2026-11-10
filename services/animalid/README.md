# StrayPaw AnimalID service

Photo embeddings and quality checks for identity **suggestions** in StrayPaw.
Runs as its own process (never inside the Next.js app on Vercel).

* `animalid.worker` claims queued jobs from the database (`animalid_claim_job`), reads the
  photo from private storage, checks quality, embeds it and calls `animalid_complete_search`.
  Matching (pgvector cosine, same organisation and species only) happens in the database.
* `animalid.api` is a versioned HTTP API (`/v1/embed`, `/v1/quality`, `/v1/model`, `/v1/health`)
  for research tools and future integrations. Bearer token required.

Backbone: DINOv2 ViT-B/14 (`facebook/dinov2-base`, Apache-2.0), CLS embedding, L2-normalised,
768 dimensions. **Not validated for individual dog identity.** See `research/animalid`.

## Run

```bash
pip install --index-url https://download.pytorch.org/whl/cpu torch && pip install -r requirements.txt
export SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…   # staging first; server-side only
python -m animalid.worker
ANIMALID_TOKEN=… uvicorn animalid.api:app --port 8080
pytest -q                                            # uses a hash backbone, no weights needed
```

## What was verified (9 November 2026)

* 10 unit tests: quality checks, preprocessing, API auth, worker job handling with a fake database.
* Real DINOv2 ViT-B/14 weights downloaded and run on CPU (4 threads): 768-d unit vectors,
  about 140 ms per 224×224 image. This was a smoke test on synthetic images only. **No identity
  accuracy has been measured** because no labelled dog dataset with usage rights is available yet.

## Costs and limits

* CPU is enough for a pilot (one search ≈ 0.15 s of model time). Indexing 5,000 profile photos ≈ 12 min on 4 CPU threads.
* Uploads never trigger processing; searches are explicit and capped at 200 per organisation per day in the database.
* Logs carry job ids, status and timings only, never image content or locations.
