# StrayPaw — manual QA before real users

Run `npm run test:e2e` first. It covers route rendering, the reporting flow's
gating, phone layout and blocked-storage resilience, all without credentials.
Everything below needs a real Supabase project, so it cannot be automated in
CI and has to be walked by hand.

Do this on a **real phone on mobile data**, not a desktop browser at 390px.
Camera permission, GPS accuracy and upload behaviour on a slow connection are
the parts that break, and none of them reproduce in a simulator.

---

## 0. Before anything

- [ ] `supabase/observation-identity.sql` has been run.
- [ ] `supabase/analytics.sql` has been run.
- [ ] **Confirm email is OFF** in Supabase → Authentication → Providers →
      Email. With it on, signup returns no session and new accounts are
      unusable until a link is clicked.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
      `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel.
- [ ] `NEXT_PUBLIC_SITE_URL` is `https://straypaw.org`.

## 1. The one journey that matters

A person who has never heard of StrayPaw, on their own phone:

- [ ] Lands on `/`, and can say what this is before scrolling.
- [ ] Reaches the reporting flow in one tap from the landing page.
- [ ] **No role picker or tutorial appears over the reporting flow.**
- [ ] Takes a photo with the camera (not the gallery) — it appears as a preview.
- [ ] If the photo carries GPS, the location step opens on that point already.
- [ ] If it does not, "use my current location" sets a point.
- [ ] Denying location permission does not dead-end: search still sets a point.
- [ ] The "have you seen this one before?" list appears, showing real animals
      recorded nearby with distances.
- [ ] "None of these" is the default. Nothing is pre-selected.
- [ ] Submits. A clear confirmation appears saying what happens next.
- [ ] **Kill the app, reopen it. The observation is still there.**

## 2. The claim that the product rests on

This is the one to be strict about. It is what makes an observation worth more
than a photo.

- [ ] Report animal A at a location. Approve it. It becomes an animal record.
- [ ] Report animal B **20 m away**, choosing "none of these".
- [ ] After approval, **A and B are two separate animals.** If they merged,
      the old proximity rule is still live — re-run
      `supabase/observation-identity.sql`.
- [ ] Report A again from a different device, this time picking A from the
      nearby list.
- [ ] After approval, A has **two observations on one timeline**, in date
      order, and `sightings_count` reads 2.
- [ ] The second observation records `identity_method = 'reporter_selected'`.
- [ ] A reviewer approving with an explicit animal records
      `reviewer_confirmed`.

## 3. Failure states

Each of these must fail *visibly*. Silence is the bug.

- [ ] Submit with airplane mode on → a clear error, and the form keeps what
      was typed.
- [ ] Submit a 15 MB photo → rejected with a reason, not a hang.
- [ ] Submit a non-image file → rejected with a reason.
- [ ] Double-tap submit → one observation, not two.
- [ ] Throttle to Slow 3G and submit → a visible in-progress state throughout.
- [ ] Unset the Supabase env vars locally and submit → an explicit failure
      saying nothing was saved. It must never report success.

## 4. Accounts

- [ ] Sign up with a new email → signed in immediately, no inbox trip.
- [ ] Sign out, sign back in with the same password.
- [ ] Observations made while signed in are still attached after signing out
      and back in on **another device**.
- [ ] Password reset email arrives and the link works in a different browser.

## 5. Organisations

- [ ] A verified NGO account sees its own cases in the console.
- [ ] A second NGO account **cannot** see the first one's cases.
- [ ] A signed-out visitor sees the console shell with an empty state and a
      sign-in prompt, not an error.

## 6. Analytics

After a few real sessions, in the Supabase SQL editor:

- [ ] `select * from analytics_overview;` — people, observations, unique
      animals, and animals with more than one observation.
- [ ] `select * from analytics_report_funnel;` — where people drop out.
- [ ] `select * from analytics_returning;`
- [ ] `select * from analytics_locations;`
- [ ] `select * from events limit 5;` **as the anon key** → must return
      nothing. If rows come back, the read policy is wrong.

## 7. The public site

- [ ] Paste `https://straypaw.org` into WhatsApp, X and LinkedIn — the preview
      card shows a title, description and image.
- [ ] `https://straypaw.org/robots.txt` and `/sitemap.xml` resolve and name
      straypaw.org.
- [ ] Safari on iOS: the landing page, the chip section and the map all render.
      Safari is the one to check — it is the majority of Indian iOS traffic and
      the browser most likely to differ.
- [ ] No console errors on `/`, `/report`, `/map`, `/app`.

## 8. Do not ship without

- [ ] A named person watching the moderation queue. Observations sit as
      `pending` until approved, so an unwatched queue means nothing reaches
      the map and every reporter's first experience is silence.
