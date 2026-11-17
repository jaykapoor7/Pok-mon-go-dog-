# StrayPaw on a phone

Phones are their own product, not a narrow desktop. This is the spec every phone change follows. "Phone" means a viewport
640px wide or less (`@media (max-width: 640px)`); test at 360, 390 and 430. Desktop is unchanged by anything here.

## What people do on a phone

| Who | On a phone they mostly | So the phone puts first |
| --- | --- | --- |
| Field worker | record an animal, add a note, check today's round, often offline, one hand, in the sun | Record (one tap from anywhere), today's round, Say it |
| NGO coordinator | triage what came in, see what is late, assign, answer a message, ask Kaju | Today, Cases, messages, Kaju |
| Veterinarian | today's patients, sign off a procedure | Today, Patients, Procedures |
| Clinician / nurse | record a bite, see doses due and who missed one, call | Today, Bites, PEP, Record a bite |
| Laboratory | what arrived, what is waiting, release a result | Work queue, Samples, Results |
| Municipal reviewer / programme lead | glance at the overview, decide what needs a decision, verify evidence | Overview, the decision list, Verification |
| Researcher | read datasets and studies (mostly desktop) | Datasets, Explore, Studies |
| Everyone | ask Kaju, find something, read notifications | Kaju and search in the top bar |

## Frame

- **Top bar (52px).** On a page below a section (a record, a new-record form, a sub-list) the left edge is a back arrow to
  the parent; on a top-level page it is nothing. The page name appears in the bar only after the page's own title has
  scrolled away (the large title stays the one title on screen). Right side: Search, notifications, Kaju. Theme moves to
  the menu.
- **Phone bar (bottom).** Role-aware. Three or four real destinations for the role's daily work, the centre "+" only
  for roles that create records, and Menu last. Never a destination from another workspace.

  | Workspace | Tabs |
  | --- | --- |
  | NGO | Today · Cases · **+** · Animals · Menu |
  | Healthcare (hospital) | Today · Bites · **+** · PEP · Menu |
  | Healthcare (laboratory) | Queue · Samples · Results · Menu |
  | Veterinary | Today · Patients · Procedures · Menu |
  | Government | Overview · Programmes · Verification (offices) or Surveillance · Menu |
  | Research | Datasets · Explore · Studies · Menu |
  | Kaju pages | the person's own workspace tabs |

- **"+" opens one action sheet.** Tell Kaju (type or speak) first, then the role's records: Record an animal, Open a
  case, Field mode (NGO); Record a bite (hospital). One tap to start, never a page of choices.
- **Menu is a full-height sheet.** Every page the sidebar has (nothing is phone-only-missing), messages with unread
  counts (channels and direct messages), Kaju's pages, the organisation switcher, settings, theme and sign out. Large rows
  (at least 48px), grouped, with the current page marked.
- **Sheets, not floating dialogs.** Modals and confirmations rise from the bottom, full width, with a grab bar, safe-area
  padding, and focus kept inside. Escape and a tap outside close them.
- **Safe areas.** Bars respect `env(safe-area-inset-*)`. Content never sits under the phone bar.

## Pages

- **First screen is the work.** One short line under the title at most. Explanations, privacy notes and "how this
  works" text go behind a single "About this" disclosure or move below the list.
- **Lists are lists.** One row: the thing's name (largest), one line of the two facts that matter, one status chip on
  the right. Whole row is the target (at least 56px). Tables become these rows; extra columns go into the record.
- **Views and filters.** View chips scroll sideways with a soft edge fade (never cut mid-word). Selects, download and
  secondary tools collapse into one "Filter" or "More" button that opens a sheet.
- **Records.** Title, one status line, then the facts that matter. Actions live in a bottom action bar (primary action +
  "More" sheet), not a sideways-scrolling row. Tabs scroll with a fade.
- **Forms.** One column, inputs 16px (no zoom on iOS), `inputmode`/`enterkeyhint` set, labels above fields, the submit
  bar sticks to the bottom and stays above the keyboard. Kaju's "Tell Kaju" box first where it exists, the form behind
  "Fill in by hand".
- **No desktop leaks.** No keyboard hints, ⌘ shortcuts, hover-only controls or tooltips on touch screens.
- **States.** Loading shows the shape of the page (skeleton), not "Opening…". Errors say what failed and offer Try again.
  Offline shows the offline bar and keeps capture working.

## Kaju

- Kaju is one tap away in the top bar on every page and first in the "+" sheet. On a phone the compact panel is a
  full-height sheet with the composer at the bottom (thumb reach) and the microphone next to Send.
- @Kaju on a home is one line: the box and Ask, examples as a sideways strip with a fade. Its notes collapse to one line.
- Prepared actions are cards with Confirm as the full-width primary button.

## Type, spacing, touch

- Body 15px, secondary 13px, page title 26px; line-height 1.45 for reading text.
- 16px side gutter; 8-point spacing; sections separated by space, not boxes inside boxes.
- Every target at least 44×44px; primary actions 48px tall, full width where they are the screen's main action.
- Motion: 150–250ms, transform/opacity only, none with reduced motion.

## Checks for every phone change

360, 390 and 430 wide; light and dark; signed in on staging (sample roles) and signed out (sample pages). No sideways
scroll, no target under 44px, nothing hidden under the bars, keyboard does not cover the field or the submit bar, page
errors none, e2e green, desktop screenshots unchanged.
