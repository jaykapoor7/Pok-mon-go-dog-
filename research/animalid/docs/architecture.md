# AnimalID architecture

```
 Browser (Identity review → Find by photo, flag animal_id)
   │ 1 upload photo → storage bucket animalid-photos/<ngo>/<file> (private; admin/coordinator/vet of that org)
   │ 2 rpc animalid_request_search(photo)  → animalid_jobs (queued)   [role check, 200/day cap, audit row]
   │ 5 read animalid_jobs / animalid_candidates (RLS: own organisation)
   │ 6 rpc animalid_decide / animalid_reverse                          [audit row; no merge, no history edit]
   ▼
 Postgres (Supabase) ── pgvector ── animalid_embeddings (768-d, never readable by the browser)
   ▲
   │ 3 rpc animalid_claim_job (service role, SKIP LOCKED, retries ≤ 3)
   │ 4 quality → embed → rpc animalid_complete_search (cosine top-k, same organisation + species + model version)
 AnimalID worker (services/animalid, separate host, CPU or GPU)
```

* **No processing in Vercel request handlers.** The web app only queues jobs and reads results.
* **No processing on upload.** A search is an explicit action by an authorised person.
* **Tenant isolation.** Candidates come only from the requesting organisation's own animals.
  Cross-organisation matching does not exist in this version.
* **Model versions.** Every embedding, job and candidate carries `model_version`. A new backbone
  (DINOv3, or a StrayPaw head) is a new row in `animalid_model_versions`; re-indexing creates new
  embeddings alongside the old ones, and the active version is switched only after evaluation.
* **Open set.** Similarity bands (`strong_at`, `possible_at`) are display bands, uncalibrated until an
  evaluation sets them at a stated false-accept rate (`calibrated = true`). The UI says
  "not a probability".
* **Human decisions are the labels.** `animalid_decisions` holds same animal / not this animal / new animal,
  with reversal. A decision is training-eligible only if the organisation has granted training use
  (`animalid_training_consent`) at the time; reversal clears eligibility.
* **Municipal reviewers** have no access to AnimalID tables or the photo bucket.
