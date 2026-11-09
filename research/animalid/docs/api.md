# AnimalID API, v1

Base URL: the deployed service. All endpoints except health need `Authorization: Bearer <ANIMALID_TOKEN>`.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/v1/health` | | `{ok: true}` |
| GET | `/v1/model` | | `{version, dim, licence, validated_for_identity: false}` |
| POST | `/v1/quality` | multipart `file`, optional `crop_box=x0,y0,x1,y1` | `{ok, width, height, blur, brightness, flat, reasons[]}` |
| POST | `/v1/embed` | multipart `file`, optional `crop_box`, `force` | `{usable, quality, model_version, dim, embedding[], ms}`; `usable:false` and no embedding when quality fails |

Errors: 401 without a valid token; 422 for unreadable images, images over 10 MB or a crop under 32 px.

Database functions used by the app (all under row-level security and role checks):
`animalid_request_search(photo_uri, species)`, `animalid_request_index()`, `animalid_decide(job, decision, dog, reason)`,
`animalid_reverse(decision, reason)`, `animalid_dataset_summary()`. Worker-only (service role):
`animalid_claim_job()`, `animalid_complete_search(job, embedding, quality, k)`, `animalid_store_embedding(...)`,
`animalid_fail_job(...)`, `animalid_finish_index(...)`.
