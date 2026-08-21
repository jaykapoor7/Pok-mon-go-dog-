# StrayPaw fundraising — architecture, compliance & roadmap

This documents how StrayPaw handles fundraising **today** and the deliberate
line we do not cross yet: StrayPaw does **not** collect, hold, or distribute
donor money. Every campaign links out to the NGO's own donation channel.

## Why link-out first (the current model)

Holding other people's money in India triggers a stack of obligations that a
small platform should not take on before it is ready:

- **Payment aggregation** is regulated by the RBI. Routing donations through
  StrayPaw would likely make us a payment aggregator/intermediary, requiring
  authorisation, escrow/nodal accounts, and settlement controls.
- **Donation/tax receipts** (80G/12A), FCRA (for any foreign contributions),
  and per-NGO trust-accounting are the NGO's legal responsibility — not
  something we can paper over.
- **Liability & trust.** If we take money "for" an NGO and anything goes wrong
  (fraud, misuse, a lapsed registration), the platform is on the hook.

By linking out, the donor pays the NGO directly on the NGO's own verified
channel (Milaap/Ketto/GiveIndia/their gateway). StrayPaw's job is discovery,
credibility, and transparency — not custody of funds.

## 1. What can safely be built now (and mostly is)

- Campaign creation by verified partner NGOs (`create_fundraiser`).
- Fundraising **goal** + **self-reported** amount raised (clearly labelled
  unverified).
- Credible campaign pages: story, **use-of-funds budget**, **updates feed**,
  **outcome**, cover photo, deadline, owning-org link + verification badge.
- **External donate button** → the NGO's own channel (`donate_url`, opens in a
  new tab, `rel="noopener nofollow"`).
- A curated/discovered feed of reputable campaigns, gated behind admin review.

None of the above touches money movement, so none of it needs a licence.

## 2. What requires a payment provider

Anything where a donor pays **on StrayPaw**:

- In-app checkout, saved cards/UPI, receipts issued by us.
- Showing a **verified** (not self-reported) "amount raised" — that number is
  only trustworthy if we can read it from a processor/webhook.
- Refunds, chargebacks, payout schedules.

This needs a real integration (see §7) and the compliance in §3.

## 3. What requires legal / compliance review (before touching money)

- RBI payment-aggregator status / use of a licensed PA (Razorpay, Cashfree,
  Stripe) so **we never touch the funds** — the PA settles directly to the NGO.
- Per-NGO KYC and a **payout account owned by the NGO**, so money never rests
  in a StrayPaw account.
- 80G receipt responsibility stays with the NGO; we must not imply we issue
  tax receipts.
- FCRA: foreign donations are restricted — either block non-INR/foreign cards
  or route only to FCRA-registered NGOs.
- Terms/refund/grievance policy naming the NGO as the recipient of record.

## 4. What organization verification is required

Real-money features must be gated on more than the current `verified` flag:

- Registration proof (12A/80G/society/trust deed) collected during onboarding.
- A **named payout account** proven to belong to the NGO (PA-side KYC).
- Only then may a campaign show verified totals or accept on-platform payment.

Today `verified` is set by an admin after due diligence and only ever powers a
badge and curation — never a claim about money.

## 5. Donor information — store vs. never store

- **Never store:** card numbers, CVV, UPI credentials, full bank details.
  These stay with the PCI-compliant processor.
- **Store only if the donor opts in:** name + email for a thank-you/receipt,
  with consent, minimised and deletable (mirrors the existing reporter-email
  opt-in and privacy policy).
- In the current link-out model we store **no donor data at all** — the
  transaction happens entirely on the NGO's channel.

## 6. How external donation links work (today)

- Each campaign carries a `donate_url` validated to be `http(s)`.
- The page's primary CTA links out (`target="_blank"`, `rel="noopener
  noreferrer nofollow"`) with an explicit line: *"StrayPaw doesn't process or
  hold the payment — your money goes directly to them."*
- Progress is the NGO's **self-reported** `raised_reported`, always labelled as
  such.

## 7. How Stripe / a processor could eventually plug in

Preferred shape: **connected accounts, we never hold funds.**

1. NGO completes KYC onboarding with the PA (Stripe Connect / Razorpay Route /
   Cashfree) → a payout account owned by the NGO.
2. StrayPaw creates a Checkout/Payment intent with the NGO's connected account
   as the destination; funds settle to the NGO, StrayPaw is never the merchant
   of record.
3. A signed **webhook** updates a `donations` table → the campaign shows a
   **verified** raised total.
4. Optional platform fee only if/when we choose, disclosed clearly.

Data model when we get there: `donations(id, fundraiser_id, amount, currency,
processor, processor_ref, status, donor_email_opt_in, created_at)` +
`ngo_payout_accounts(ngo_id, processor, account_ref, kyc_status)`.

## 8. What NOT to implement yet

- No in-app card/UPI collection.
- No StrayPaw-held balances, wallets, or escrow.
- No "verified raised" numbers until a processor feeds them.
- No tax-receipt issuance by StrayPaw.
- No foreign-currency donations until FCRA handling exists.

---

**Summary:** ship credibility and transparency now (profiles, budgets,
updates, outcomes, link-out) — add on-platform payments only behind a licensed
aggregator with connected NGO payout accounts, real verification, and the
compliance in §3.
