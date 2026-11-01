# Kaju product demo for the YC application

## What YC asks for

- **Founder video (1 minute):** only the founders, talking. YC says it is not the place for a product demo ([YC](https://www.ycombinator.com/video/)).
- **Product demo (separate field):** show the product doing the core job, fast. Third-party guides agree: real product over slides, the main workflow end to end, roughly 1–3 minutes, and rough edges are fine ([Startup Grind](https://www.startupgrind.com/blog/y-combinator-application-video-tutorial/), [Pilot](https://pilot.com/blog/how-prepare-yc-application-video), [Wavect](https://wavect.io/blog/yc-application-technical-readiness-checklist/)).

## The workflow the demo shows (about 2 minutes)

1. **Field intake.** At 7:42 am a field worker sends a photo and a Hindi voice note on WhatsApp. Kaju reads the photo, transcribes and translates the voice note, checks the animal register and prepares a new ABC record. The coordinator confirms it.
2. **Month-end check.** The coordinator asks Kaju, "What's blocking the October package?" Kaju reads 146 procedures and finds the 4 problems: 2 missing release photos, 1 vet sign-off pending and 1 duplicate. It cites each record and prepares the fixes. The coordinator confirms them.
3. **Billing package.** Coordinator Anjali Rao prepares the October package: 142 verified procedures, 710 evidence items and every vet sign-off. The 4 unready records stay out. She submits it to the municipal veterinary office.
4. **Government side.** Dr. Kavitha Iyer opens the package and asks Kaju to check it. Kaju checks for missing evidence, animals billed twice (including earlier months) and release locations. She accepts the package and sanctions ₹2,34,300 for payment.

Arc: from a voice note on the street to a sanctioned payment.

## What is live and what is a walkthrough

| Step | Status today |
|---|---|
| App shell, Verification, Report packages, reviewer acceptance, audit thread | Live product screens and database workflow (shown here on illustrative records) |
| Kaju panel: tool runs, sources, prepared changes, Confirm | Live UI; answers in the recording are scripted |
| WhatsApp intake | Not connected yet (waiting for Meta verification) |
| Hindi voice-note transcription | Not connected yet (needs a speech-to-text key) |
| Payment sanction | Walkthrough only; no table in the database yet |
| SMS to field staff | Built; waiting for MSG91 DLT approval |

All people, organisations, records and amounts in the recording are illustrative. The title card says so.

**Recommendation for the application:** say it plainly, for example: "Demo uses sample data. WhatsApp intake and voice transcription are being connected now; verification, packages and reviewer acceptance are live." YC reads honesty about stage as a strength.

## Re-recording

The walkthrough runs only in a local build with `NEXT_PUBLIC_DEMO_RECORDING=true`. Production never loads it.

```bash
NEXT_PUBLIC_DEMO_RECORDING=true npx next build
```

```bash
npx next start -p 3101 -H 127.0.0.1
```

```bash
Xvfb :99 -screen 0 1920x1400x24 -nolisten tcp &
```

```bash
DISPLAY=:99 node scripts/record-yc-demo.cjs
```

The output goes to `demo-footage/kaju-walkthrough-raw.mp4`.

## Removing it later

Delete `src/lib/demo/`, `src/sp/ngo/WhatsAppIntake.tsx`, `src/sp/ngo/whatsapp.css` and `scripts/record-yc-demo.cjs`. Then remove the `isRecordingDemo` branches in:

- `src/lib/abc.ts`
- `src/sp3/ai/AiPanel.tsx`
- `src/sp/ngo/Inbox.tsx`
- `src/sp/abc/PackageView.tsx`
- `src/lib/actions.ts` (`getMyRole` and `getMyNgo`)
