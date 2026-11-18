# Intent: every control on every page has a job there

The owner asked that each button, link, note and block on each app page be intentional: if a control is not needed
where it sits, move it to where the job happens or remove it. This is the audit and what was decided. No capability
was removed; where a control went, the line says where the job is done now.

## What the frame already gives (so a page does not repeat it)

| Frame control | Where | Job |
|---|---|---|
| Sidebar, every page of the workspace, the current one marked | desktop | going to a list |
| Breadcrumb: on a record its first part is the record's section (Cases, Animals, Facilities…) | desktop | back to the list a record sits in |
| Back arrow in the top bar | phone | back to the list a record sits in |
| "+" in the bottom bar: the records the role makes (NGO: record an animal, open a case, field mode; clinic: record a bite; vet: record clinical care) | phone | making a record from any page |
| Search (⌘K): pages, records, and the same record actions as the phone's "+" | desktop and phone | making a record from any page on a computer |
| Bell, Kaju button (⌘J), Menu sheet | both | what waits on you, Kaju, everything else |
| Record bar (main action at the thumb, the rest under More) | phone records | acting on the open record |

Rule used: a page keeps a control when it is that page's own job (a list's "add" button, a record's actions), and drops
it when it is a shortcut to a job another place owns and the frame already reaches.

## Changes

### NGO · Today (`/ngo/today`, signed in)
| Control | Decision | Reason |
|---|---|---|
| "Record an animal" in the header | **Removed** | Today is what needs the person, not a launcher. Recording an animal is the Animals page's main action (header button), the phone's "+" (it was already hidden on phones), and "Record an animal" in search (⌘K). On a computer it is now two clicks (Animals → Record an animal) or ⌘K and Enter, instead of one. |
| "Operations" link at the foot of Needs attention | **Removed** | The "Visits overdue" figure directly above opens the same page, and Operations is in the sidebar. |
| "Critical and high cases (n)" at the foot of Needs attention | Keep | Opens the filtered Cases view the list is drawn from; nothing else links there. |
| @Kaju line, four figures, Needs attention (with a per-row "Ask @Kaju"), Your tasks | Keep | The page's job: what needs attention, each figure opening the list it counts. |
| "Kaju is waiting on you" strip | Not changed | Part of missions, which another change is replacing. |
| Note on imported visits under the page | Keep | Says once why the visits figure differs from a raw count. |

### NGO · Today (signed out sample)
| Control | Decision | Reason |
|---|---|---|
| "New case" (opened the live demo) | **Removed** | The sample Today now matches the signed-in page, which has no record buttons. New case is on Cases. |
| "Capture a field update" (opened the live demo) | **Removed** | Same: recording is the phone's "+" and the Animals page. The sidebar foot still offers sign-in, and each sample row still opens the demo where it acts. |

### NGO · Operations (`/ngo/operations`, every tab)
| Control | Decision | Reason |
|---|---|---|
| "Open field mode" | Keep, made the page's one primary button (desktop only) | Field mode is where this page's round is walked. On a phone it is in "+", so it stays hidden there. |
| "Record an animal" | **Removed** | Two primary actions competed. Recording one animal is the Animals page's job, the phone's "+", and ⌘K. |

### Healthcare · clinic Today (`/health/today`)
| Control | Decision | Reason |
|---|---|---|
| "Record a bite" in the header | **Removed** | As on the NGO Today. Recording a bite is the Bite cases page's header button, the phone's "+", "Record a bite" in ⌘K (new), "Patient came in" on each public notice, and the "Register a bite" suggestion in the @Kaju line. |
| Foot note "… Kaju reads these records only for someone who can open them here, and never makes a clinical decision." | **Shortened** to who sees patient details | The @Kaju line directly under the title already says "Kaju reads only what you can open. Clinical decisions stay with you." |

### Healthcare · Bite cases (`/health/bites`)
| Control | Decision | Reason |
|---|---|---|
| "Record a bite" | Keep on a computer, **hidden on a phone** | The list's own add action; on a phone "+" offers exactly this from every page. |

### Laboratory · Work queue (`/health/today`, lab)
| Control | Decision | Reason |
|---|---|---|
| Foot note sentence "Kaju never interprets or releases a result." | **Removed** | Said already by the @Kaju line ("Results are released by laboratory staff, never by Kaju"). The rest of the note (days from collection, named staff) stays. |

### Healthcare · Our services (`/health/facilities/ours`)
| Control | Decision | Reason |
|---|---|---|
| "All facilities" | **Removed** | The breadcrumb's "Facilities", the marked sidebar item and the phone's back arrow all go there. |

### Government · Programmes (`/gov/programmes`)
| Control | Decision | Reason |
|---|---|---|
| "Record an estimate" | **Shown only to someone who manages the programme**; others see "Open the programme" (same link) | A viewer ("changes are made by its coordinators") was offered an action they cannot take. |

### NGO · Drive record (`/ngo/programmes/[id]`)
| Control | Decision | Reason |
|---|---|---|
| "All drives" | **Removed** | Breadcrumb "Programmes" (Drives is its first tab), sidebar, phone back arrow. |

### NGO · Case record, sample (`/ngo/cases/[id]`, signed out)
| Control | Decision | Reason |
|---|---|---|
| "All cases" | **Removed** | Breadcrumb "Cases", sidebar, phone back arrow. |

### Frame
| Control | Decision | Reason |
|---|---|---|
| Breadcrumb's first part on a record page | **Now links to the record's section** (it went to the home page) | "Cases / SPC-…" took you to Today. It now goes to Cases, as the phone's back arrow does, which is what lets records drop their own "All …" links. |
| Search (⌘K) actions | **Added** "Open a case" (NGO), "Record a bite" (clinic), "Record clinical care" (vet) beside "Record an animal" and "Field mode" | The desktop equivalent of the phone's "+", so a home page does not need record buttons. |

## Kept as they are (checked, with the job they serve)

- **NGO Cases**: "New case" (desktop; the list's add action, hidden on a phone where "+" has it), views, search. Sample "New case" opens the demo for visitors only.
- **NGO Animals**: List/Map switch, "Scan a tag" (when tags are on), "Record an animal" (the register's add action; hidden on a phone), views, place filter, Download. Sample "Scan a tag" is visitors only.
- **NGO Inbox**: Reports/WhatsApp, per-report "Open a case from it" and "Choose for a drive", bulk "File into the drive" once reports are ticked, WhatsApp Take it / Open a case / Dismiss. Each is a decision about an arrival; none exists elsewhere.
- **NGO New case**: "Fill in by hand", "Unlink", submit, "Cancel" (desktop; a form needs a way out, the phone has back).
- **NGO Case record (signed in)**: Next step, Follow-ups, Story, Photos, Related, Care events "Record care by hand", Delete. **Not changed here: "All cases" in the header**, because it shares lines with the "Hand to Kaju" entry point that another change is rewriting; it is now redundant with the breadcrumb and should go when that lands.
- **NGO Animal record**: Open its case / Start a case, Flag as needing help, Identifiers "Add", Care "Record by hand". "Hand to Kaju" and workrooms not touched (another change).
- **NGO Submissions & Reports**: six tabs, each with its own add action (A package for another period, New contract version, File scans) and the prepare button. **Not changed here: "All packages" in the package record header**, next to the "Hand to Kaju" lines; redundant with the breadcrumb now.
- **NGO Survey record**: "All surveys" kept: it opens Programmes on its Surveys tab, which the breadcrumb (Programmes, Drives tab) does not.
- **NGO Programmes, Team, Training, Import, Settings, Connections, Requests to join**: each control is the tab's own job (Start a drive, Add someone per tab, New course, Import, Save, Connect/Disconnect).
- **Personal settings, Notifications**: the link to NGO settings stays (the rail's Settings goes to NGO settings, so someone on `/settings` needs the way back).
- **Channels**: composer, threads, new channel/message in the sidebar.
- **Kaju Automations, Insights, Rules & memory**: Turn on per rule, Run the checks now, Write one down. Missions, Approvals, History and the Kaju page are being replaced by another change and were not audited.
- **Government Overview, Partners ("Open the network": the network is a programme tab with no sidebar item), Surveillance, Reports, Verification, package review (downloads), Programme record (tabs, Print, Add a partner/pathway, Record a session for those allowed), Data requests.**
- **Healthcare PEP, Referrals (per-row outcome buttons), Facilities ("Confirm our services"), Surveillance, bite record (Refer, dose dates), Record a bite form.**
- **Laboratory Samples, Testing, Results, Quality, sample record (Receive, Start testing, Record the result, Reject, Add a note: in the action bar on a phone, inline on a computer).**
- **Veterinary Today, Patients, Appointments ("Book"), Clinical care, Procedures, Follow-ups; clinic "Add a patient", "Add a clinical record", "Sign".**
- **Research Datasets ("Explore" per dataset), Explore (CSV), Maps, Studies ("New study"), Reports.**
- **Sample pages (signed out)**: buttons that open the live demo appear only when no organisation is signed in (`sample` is `!live.org` everywhere), so a member never sees them.

## For the owners of shared files (not changed here)

- `ListPage.tsx` / `RecordList.tsx`: the keyboard hint row ("j k move · Enter open · o full record · Esc close") under every list repeats on each list page; it could show once, or only after a key is pressed.
- `CaseRecord.tsx` "All cases" and `PackageRecord.tsx` "All packages" header links: remove once the "Hand to Kaju" change has merged (the breadcrumb now does their job).
- `AtKaju`'s "Open in Kaju" link: review with the Kaju page change (the top bar's Kaju button opens the panel from every page).
