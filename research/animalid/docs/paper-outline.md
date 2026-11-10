# Paper outline (draft structure, no results yet)

1. **Introduction.** Re-identification of free-roaming dogs for ABC/ARV programme records in Indian cities; why identity matters for claims, coverage and follow-up.
2. **Related work.** Animal re-identification (wildlife, cattle, pets), self-supervised features (DINOv2), metric learning, open-set identification.
3. **Data.** Collection in routine field operations; label provenance (human-confirmed, microchip); rights and consent; dataset card.
4. **Method.** Frozen DINOv2 baseline; projection head with supervised contrastive loss; optional fine-tuning; quality gating.
5. **Protocols.** Identity-disjoint, temporal and geographic holdouts; open set with withheld identities; thresholds at fixed FAR.
6. **Results.** Rank-1/5, mAP, FRR@FAR, DIR@FAR; robustness by lighting, viewpoint, camera, time gap and coat similarity; latency and cost.
7. **Deployment.** Human-in-the-loop decisions, reversals, audit, tenant isolation; what changed in record quality.
8. **Limitations and ethics.** Similar coats, puppies, data rights, misuse risks.
9. **Release.** Code (this package), model and dataset cards; weights and data only with permissions.
