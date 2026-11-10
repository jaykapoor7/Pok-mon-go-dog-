# Municipal pilot: pricing and deployment framework (internal)

**Status: internal working document. Nothing here is a published price. Do not quote a figure from this
file to a customer until the owner has approved it.** Every number below is an assumption to be replaced
with a measured one; the structure is what is meant to be reused.

## 1. What a pilot is

One municipal office (the reviewer) and one ABC/ARV operator it already funds, on one contract, for a
fixed period, with success criteria agreed in writing before it starts.

| Parameter | Default | Why |
| --- | --- | --- |
| Length | 3 months | Three full monthly claim cycles: the first is learning, the second and third are the evidence. |
| Scope | 1 operator, 1 reviewing office, 1 contract | Smallest unit in which a claim is prepared, reviewed and decided inside StrayPaw. |
| Users | Operator: unlimited. Office: up to 5 reviewers | Per-seat pricing would discourage field staff from recording. |
| Data | Operator's current register imported, labelled historical | Day-one value without passing old rows off as verified. |

## 2. What the customer is buying

The unit of value is a **claimed procedure that survives review**: one animal, one procedure, complete
evidence, a veterinarian's sign-off, a coordinator's review, the contract rate in force on that date.
Pricing should scale with that unit, not with seats or storage.

## 3. Cost to serve (replace assumptions with measurements)

| Item | Assumption | How to measure |
| --- | --- | --- |
| Hosting and database | Marginal cost per operator is small at pilot scale | Supabase and Vercel invoices ÷ active organisations |
| Storage | ~3 photos per procedure | Bucket size ÷ recorded procedures |
| Email | One sign-in code per member, plus notices | Resend usage |
| Kaju model inference | Zero today (tools only). If switched on: a per-organisation monthly ceiling | Inference ledger (`recordInferenceUsage`) |
| Onboarding | Register import, team set-up, two training sessions | Hours logged per pilot |
| Support | Highest in month 1 | Hours logged per pilot |

The dominant pilot cost is **people time** (onboarding and support), not infrastructure. Price the pilot so
that it covers that time; treat infrastructure as a rounding item until measured otherwise.

## 4. Pricing structures to choose between

| Model | How it works | Good for | Risk |
| --- | --- | --- | --- |
| A. Fixed pilot fee | One fee for the period, covering onboarding, support and the platform | Procurement that needs a single number below a tender threshold | Under-priced if volume is high |
| B. Per verified procedure | A small fee per procedure accepted by the office | Aligning cost with the contract's own unit; easy to justify against the per-animal ABC rate | Revenue depends on the office's review speed |
| C. Platform fee + per-procedure | Low fixed fee plus a per-procedure component | Converting a pilot to an annual contract | Two numbers to explain |

**Recommended for a first pilot: A**, sized from section 3, with the conversion price (B or C) written into
the pilot agreement so the pilot is not an open-ended free trial.

Anchor for any per-procedure number: it must be a small fraction of the contract's per-animal ABC rate, and
defensible as "the cost of making this claim auditable". State the fraction, not just the rupee figure.

## 5. What stays free

- Reporting an animal and the public map.
- Personal accounts (feeders, residents).
- An organisation's own workspace when it registers itself: cases, register, field mode, import.

Paid: funded programmes, i.e. anything involving a contract, a reviewing office and report packages.

## 6. Deployment plan (per pilot)

| Week | Work | Owner |
| --- | --- | --- |
| 0 | Agreement signed: scope, success criteria, data-processing terms, price for conversion | StrayPaw + office |
| 1 | Operator workspace created and verified; register imported; contract and rates entered; team added | StrayPaw + operator |
| 1 | Reviewing office created; reviewers added | StrayPaw + office |
| 2 | Field and vet training (one session each, on phones); first live captures | StrayPaw |
| 4 | First package submitted and reviewed inside StrayPaw | Operator + office |
| 8, 12 | Second and third packages | Operator + office |
| 12 | Pilot review against the criteria; convert or close; export handed over either way | All |

## 7. Success criteria (agree numbers before starting)

- Share of the month's claimed procedures submitted through StrayPaw.
- Share of submitted claims with complete evidence at first submission.
- Number of claim lines queried or returned by the office, and time to resolve them.
- Time from month end to package submission, and from submission to decision.
- Field staff and vets actually recording on their own accounts (not one shared login).

These are measured from the records; none may be reported as achieved until a pilot has run.

## 8. Dependencies that are commercial, not engineering

- A signed pilot agreement with a named office and operator.
- The owner's approval of any price.
- Legal review of the pilot agreement, the terms, the privacy policy and the data-processing terms.
- A decision on India data residency if the office requires it (a hosting change with its own cost).
- Permission in writing before any customer name, quote or outcome is published.
