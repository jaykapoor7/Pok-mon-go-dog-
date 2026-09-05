# StrayPaw, manual QA before real users

Run `npm run test:e2e` first. It covers route rendering, the reporting flow's
gating, phone layout and blocked-storage resilience, all without credentials.
Everything below needs a real Supabase project, so it cannot be automated in
CI and has to be walked by hand.

Do this on a **real phone on mobile data**, not a desktop browser at 390px.
Camera permission, GPS accuracy and upload behaviour on a slow connection are
the parts that break, and none of them reproduce in a simulator.

---

## 0. Before anything

**Run `supabase/RUN-PILOT-MIGRATIONS.sql`.** Supabase dashboard → SQL Editor
→ New query → paste the whole file → Run. One paste, one run.

- [ ] Done, with no error.

That file is the eight pilot migrations concatenated in dependency order.
Run them individually and you have to get the order right: the access-code
part only adds columns to a table the email-invites part creates, so out of
order it fails with `relation "org_email_invites" does not exist`, and every
function after that point is missing. `Could not find the function
public.admin_list_orgs` and `admin_retire_org` both mean the same thing, a
script that stopped early.

It is idempotent, verified by applying it three times in a row to a fresh
database. Nothing in it deletes data, so a run that failed part way through
is fixed by running the whole file again.

Brand new Supabase project with no StrayPaw tables at all? Run
`supabase/RUN-ALL-MIGRATIONS.sql` first, then the pilot file.

### Settings

- [ ] `RESEND_API_KEY` and `EMAIL_FROM` (for example
      `StrayPaw <hello@straypaw.org>`) are set in Vercel. Without them an
      access code is still minted and shown on the moderation page, but no
      email goes out.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
      `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel.
- [ ] `ADMIN_SECRET` is set, or the moderation page cannot do anything.
- [ ] `NEXT_PUBLIC_SITE_URL` is `https://straypaw.org`, so the link in an
      invitation email points at the right place.
- [ ] **Confirm email is OFF** in Supabase → Authentication → Providers →
      Email. With it on, ordinary signup returns no session and the account
      is unusable until a link is clicked, and Supabase's built-in mailer
      only delivers to addresses on your own project team, capped at two an
      hour, so that link never reaches a Gmail or Outlook address. Code
      sign-in does not depend on this: those accounts are created already
      confirmed, and the code arrives through Resend.
- [ ] Password reset still goes through Supabase Auth's own mailer, so it
      needs custom SMTP under Authentication → Emails and a raised limit
      under Authentication → Rate Limits. `RESEND_API_KEY` does not cover
      it. Nothing in the PAWS pilot depends on password reset.

## 1. The one journey that matters

A person who has never heard of StrayPaw, on their own phone:

- [ ] Lands on `/`, and can say what this is before scrolling.
- [ ] Reaches the reporting flow in one tap from the landing page.
- [ ] **No role picker or tutorial appears over the reporting flow.**
- [ ] Takes a photo with the camera (not the gallery). It appears as a preview.
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
      the old proximity rule is still live, re-run
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

## 5a0. Access codes, end to end

Everything below is a real run, not a read-through.

- [ ] On `/moderate`, Organisations tab, create **PAWS Chennai**.
- [ ] Add the team lead: their full name, their email, **Make team lead**.
      A six-character code appears on the page and is emailed to them.
- [ ] Copy the code. Open `/join` in a private window and type it.
      You land on `/partner` signed in as that person, with no account
      created and no password chosen.
- [ ] The dashboard offers to set a password. Skipping it is fine; the code
      itself no longer works, which is the point.
- [ ] Back on `/moderate`, that person now reads **signed in** and their code
      is gone.
- [ ] Type the same code at `/join` again. It is refused.
- [ ] As the lead, open **Team and codes**. Add a colleague by name and email
      as **Team member**. Their code appears. Redeem it in another private
      window: that person lands on the same organisation's dashboard and sees
      the same animals.
- [ ] Add a field volunteer by name and email as **Volunteer**. Their code
      appears. Type it at `/join`: it does not open the dashboard, it opens
      the reporting page with their name already filled in.
- [ ] A volunteer code keeps working, so the same person can report again
      from a second phone.
- [ ] Back on `/moderate`, every code the lead just cut is listed under the
      organisation, split into **Dashboard access** and **Volunteer reporting
      codes**, with the ones the organisation added marked as such. Turning
      one off from here works.
- [ ] As a **Team member**, the Team lead and Team member buttons are
      disabled. Only a lead hands out dashboard access.
- [ ] The lead removes the colleague. That person reloads `/partner` and the
      organisation's records are gone.
- [ ] Make up a six-character code and try it at `/join` a dozen times. You
      are rate limited before you get anywhere.

## 5a. PAWS pilot: the field workflow

**Setting the organisation up** (moderation console → Organisations):

- [ ] Create "PAWS Chennai". It appears in the list as verified.
- [ ] Give admin access to a PAWS email address that has **no account yet**.
      It shows as "waiting for first sign-in", and they receive an email.
- [ ] That person creates an account with the same address and lands in the
      PAWS dashboard with no further step. This is the one to check: access
      is granted to the address, so signup order must not matter.
- [ ] Add a second PAWS email the same way.

**Volunteer codes** (dashboard → Volunteer codes):

- [ ] Create a code. It reads like `PAWS-7K2M`.
- [ ] On a phone, open Report, tap "Reporting for an NGO?", enter the code.
      It names PAWS Chennai back before anything is submitted.
- [ ] Enter a volunteer name once. File a report.
- [ ] **File a second report. It must not ask for the code or name again.**
- [ ] A wrong code is refused and does not file anything to PAWS.
- [ ] Turn the code off. It stops working immediately.

**Sterilisation and rabies:**

- [ ] The details step shows both questions as three buttons each, with
      "Not sure" selected by default.
- [ ] Report one animal sterilised + vaccinated, one not sterilised, one
      left as not sure.
- [ ] Approve all three in moderation.
- [ ] The PAWS dashboard totals match what you entered, and the three
      sterilisation buckets add up to the total.
- [ ] Click each figure. The filtered list contains exactly those animals.
- [ ] **Filter "Not sterilised" and confirm no sterilised animal appears.**
- [ ] The two percentages differ when there are unknowns, and the page says
      why. Unknowns must never be counted as "not sterilised".
- [ ] Filter by location and by date. Combine with a status filter.
- [ ] Each row shows who recorded it. The volunteer's name is on the report.
- [ ] Export CSV. It includes sterilisation, vaccination and recorded_by.

**Two people, one organisation:**

- [ ] Both PAWS accounts see the same animals and the same totals.
- [ ] One registers an animal. The other sees it on refresh.
- [ ] A different organisation's account sees **none** of it, and its own
      programme totals read zero.

## 5b. Adoption and resources

- [ ] `supabase/adoption-and-documents.sql` has been run.
- [ ] `/adopt` shows an empty state when nothing is listed. It must not
      invent listings.
- [ ] An organisation lists one of its animals, and it appears on `/adopt`
      with the organisation named and a working phone or email link.
- [ ] Closing the listing as placed removes it from `/adopt` immediately.
- [ ] Only one open listing can exist per animal.
- [ ] File a scan under Resources. Add a title, a context note and a date,
      and confirm they persist after a refresh.
- [ ] Attach it to an animal. It appears under "Source records" on that
      animal's page.
- [ ] Sign out, or view that animal as another organisation. **The scan must
      not be visible.** This is the one to be strict about: register pages
      carry other people's handwriting and phone numbers.
- [ ] Search Resources by an animal's name and by text that only appears in a
      context note.

## 6. Analytics

After a few real sessions, in the Supabase SQL editor:

- [ ] `select * from analytics_overview;`, people, observations, unique
      animals, and animals with more than one observation.
- [ ] `select * from analytics_report_funnel;`, where people drop out.
- [ ] `select * from analytics_returning;`
- [ ] `select * from analytics_locations;`
- [ ] `select * from events limit 5;` **as the anon key** → must return
      nothing. If rows come back, the read policy is wrong.

## 7. The public site

- [ ] Paste `https://straypaw.org` into WhatsApp, X and LinkedIn, the preview
      card shows a title, description and image.
- [ ] `https://straypaw.org/robots.txt` and `/sitemap.xml` resolve and name
      straypaw.org.
- [ ] Safari on iOS: the landing page, the chip section and the map all render.
      Safari is the one to check. It is the majority of Indian iOS traffic and
      the browser most likely to differ.
- [ ] No console errors on `/`, `/report`, `/map`, `/app`.

## 8. Do not ship without

- [ ] A named person watching the moderation queue. Observations sit as
      `pending` until approved, so an unwatched queue means nothing reaches
      the map and every reporter's first experience is silence.
