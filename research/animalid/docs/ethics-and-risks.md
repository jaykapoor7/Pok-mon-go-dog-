# Ethics, limits and deployment risks

* **A wrong match can harm an animal's record.** A false match could attach one dog's sterilisation or vaccination
  status to another. Mitigation: suggestions only, a person decides, nothing merges, decisions are reversible and audited,
  and the similarity is never presented as a probability.
* **Claims and payments.** AnimalID must not be used to approve or reject an ABC claim. Municipal reviewers do not
  see AnimalID output.
* **Unvalidated features.** Pretrained DINOv2 features were not trained for individual dog identity. Until an
  evaluation on StrayPaw data reports error rates, the feature stays on staging and behind a flag.
* **Similar animals.** Street dogs share coat patterns within an area. Expect false candidates among littermates.
* **Data rights.** Hosting photos does not grant training rights. Training uses only images whose organisation has
  granted it, recorded per organisation with the terms version.
* **Privacy.** Photos can include people, homes and vehicles. Search photos stay in a private bucket readable only by
  the organisation; the worker does not log image content.
* **Cross-organisation search** is not built. It would need explicit agreements between organisations.
* **Other species** are out of scope until dogs are validated.
