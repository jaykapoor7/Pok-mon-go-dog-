# Motion in the working app

The working app (`src/nx`) has one motion module: `src/nx/motion/` (code) and `src/nx/css/motion.css` (styles, prefix
`mo-`). The public site's motion system is [docs/MOTION.md](../MOTION.md); this page is its counterpart for the places
people work. The rule is the same: movement only says *this changed*, *this came from there* or *this happened before
that*. Nothing loops, bounces or arrives late for show.

## Tokens (`src/nx/motion/tokens.ts`)

| Spring | stiffness / damping / mass | For |
|---|---|---|
| `press` | 700 / 42 / 0.6 | a control under the finger |
| `morph` | 520 / 30 / 0.7 | a control turning into its result (pin, Saved); the one place a small overshoot is allowed |
| `glide` | 600 / 44 / 1 | the view pill and tab line moving to the chosen item |
| `pop` | 520 / 40 / 0.7 | popovers, the command bar, toasts |
| `panel` | 480 / 40 / 0.8 | the list inspector, outbox rows, panels from an edge |
| `release` | 380 / 22 / 0.6 | a divider let go after a drag (springs back from the rubber band) |

Durations: `touch` 160ms, `state` 220ms, `enter` 280ms; curve `EASE` = `cubic-bezier(.23, 1, .32, 1)`. A result such as
"Saved ✓" holds for `HOLD_RESULT_MS` (1.6s) so it can be read; a hold-to-remove takes `HOLD_MS` (700ms).

Every inline spring that used to be typed by hand in the list, record, tab, toast, command bar and Needs-you code now
reads these.

## Hooks and primitives (`import … from "@/nx/motion"`)

| Piece | What it does | Used in |
|---|---|---|
| `useCalm()`, `useSpring(name)`, `useFade()` | Reduced motion as a boolean; a shared spring, or no travel at all under reduced motion | everywhere below |
| `useResult()` + `ResultButton` | A button that becomes its result: idle → "Saving…" → "Saved ✓" → idle. The three labels share one grid cell, so the width never jumps; the result is announced in a status region. Failures go straight back to idle and keep their existing error (toast or inline). | Field mode saves (record an animal, note, proof, vaccination), Settings › Save the profile, Documents › Save context, ABC evidence › release place |
| `Swap` | Crossfades content when its key changes (label and colour together, 4px rise). Never animates the first render. | task chip Open → Done, field case Open → Started, outbox Waiting → Sending → Sent, Kaju Confirm → receipt |
| `CheckDraw` | A check whose stroke draws once, when something becomes true | upload done, outbox Sent, follow-up Done, Kaju saved receipts, composer attachments |
| `HoldButton` | Hold to remove: the fill shows the hold's progress, letting go early runs it back and says "Hold to delete". Keyboard: Enter or Space arms it ("Press again to delete", announced), a second press within 3s removes. The fill is progress, not decoration, so it is kept under reduced motion. | your own tasks (Undo still follows), your own channel messages (desktop menu and phone sheet) |
| `PinToggle` | Pin to the sidebar as a real toggle (`aria-pressed`): it knows whether the record is pinned, pressing again unpins; the pin drops in with the `morph` spring onto a filled backing | ListPage inspector |
| `Resizer` + `usePanelWidth(key)` | The inspector's divider: drag it (the line bows with the drag's speed and springs straight on release; pulled past a limit it gives, then settles; it snaps to the usual width when passing close), or focus it and use ←/→ (Shift for 64px steps), Home/End, Enter for the usual width. Width remembered per list in `localStorage` (try/catch). | ListPage, RecordList and the setup pages' `Drawer` |
| `Tool`, `Toolbar` | Compact icon actions with their names as tooltips on hover and keyboard focus (desktop, fine pointers only); arrow keys move along the toolbar. The name is always the accessible name. Phones get no tooltips: they use RecordBar's labelled "More" sheet. | inspector headers |
| `DropZone`, `useUploads`, `UploadList` | One upload behaviour: a dotted zone that answers a dragged file (desktop), press to choose or take a photo (phone); then a row per file: Waiting its turn → Uploading (honest indeterminate bar: storage reports no bytes) → Processing (the server writes the record) → drawn check, or what failed with Retry; "Upload more" once everything is settled. One file at a time. | ABC evidence, Documents, channel attachments (compact chips with the same states), register import (its own zone and real row count, same drag reaction) |

## Field mode

- The camera is one large target (the photo tile) for the animal record and for "Photo or proof" on a case, with the
  photo shown once taken.
- Save turns into where the record now is ("Recorded, sending", "Saved on this phone", "Kept on this phone"), holds for
  0.7s, and the screen closes onto the record's row in "On this phone".
- Each row there changes in place: waiting (amber dot) → sending (blue breathing dot, a bar across its photo) → sent
  (the row stays five seconds with a drawn check and the receipt, then joins "Sent from this phone"). A failure stays,
  open, with its reason and Try again.
- Presses on the big actions sink slightly and darken. The field-intake-v1 payload is untouched (checked byte for byte
  against the previous build with every write intercepted).

## Rules

- Only `transform`, `opacity`, `stroke-dashoffset` and colour move. Widths change only under the pointer (the divider).
- Reduced motion: framer-motion runs under `MotionConfig reducedMotion="user"`, every primitive reads `useCalm()`, and
  `motion.css` has a still version of every rule that moves. What remains is the end state, at once; the hold fill and
  the upload bars stay because they are information.
- A toast stays wherever the result carries Undo (task delete, sign-offs, deadlines) or happens away from where the
  person is looking (records sent in the background). Where the button is the focus, the button says it.
- Consequential deletes (cases, records with history, evidence) keep the Confirm dialog. Hold is only for small things a
  person made themselves.
