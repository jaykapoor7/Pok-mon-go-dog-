# Field team: before and after

Authentic screenshots of the StrayPaw app, captured from a local production build pointed at the staging database
(`straypaw-staging`), signed in as the sample field worker "Manjunath K" (Bengaluru Animal Care Trust, a fictional
sample organisation). Phone shots are 390×844 at 2× (Chromium, iPhone user agent, en-IN, Asia/Kolkata, reduced motion);
desktop shots are 1440×900. Each was taken by opening `/home`, where StrayPaw sends a person to their home.

| File | What it shows |
| --- | --- |
| `field-team-before.png` | BEFORE, unmodified code (d6cdd97): the field worker lands on the organisation's dashboard, `/ngo/today`. Checksums in `.before.sha256`. |
| `field-team-before-full.png`, `field-team-before-desktop.png` | The same page at full length, and on a desktop. |
| `field-team-before-field-mode.png` | The earlier field mode (`/ngo/field`, "Your round"), one menu tap away, for reference. |
| `field-team-after.png` | AFTER: the same person lands on My day (`/ngo/field`), Kaju first. |
| `field-team-after-full.png`, `field-team-after-desktop.png` | The same page at full length, and on a desktop. |
| `field-team-after-kaju.png` | Kaju's answer to "I'm about to start vaccinations", read from this worker's records. |
| `field-team-comparison.png` | BEFORE and AFTER side by side, each screenshot placed pixel for pixel, unscaled and unedited. |

The data is the same in both: one sterilisation case (Bindu, Malleshwaram) assigned to the worker; no vaccination drive
was scheduled on staging, so Kaju says so rather than showing one.
