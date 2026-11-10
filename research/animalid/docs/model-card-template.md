# Model card: <model_version>

* **Backbone:** <e.g. DINOv2 ViT-B/14, facebook/dinov2-base> · licence <Apache-2.0>
* **Head:** <none | linear 768→256, supervised contrastive> · checkpoint <path, sha256>
* **Training data:** dataset version <fingerprint> · <n images, n individuals> · organisations <n> · rights: training_allowed only
* **Intended use:** suggesting candidate identities for a person to confirm, within one organisation's register, dogs only.
* **Not for:** automatic identification, merging records, clinical or legal decisions, other species, cross-organisation search.

## Evaluation (real runs only)
| Protocol | Rank-1 | Rank-5 | mAP | FRR @ FAR 1% | DIR @ FAR 1% | Report |
|---|---|---|---|---|---|---|
| identity-disjoint | | | | | | |
| temporal | | | | | | |
| geographic | | | | | | |

## Thresholds
`strong_at` = <value> chosen for FAR <x>% on <protocol>; `possible_at` = <value>.

## Known limits
<lighting, viewpoint, similar coat patterns, puppies growing, injuries, collars, crowded frames>

## Ethical considerations
See `ethics-and-risks.md`. Record who approved deployment and when.
