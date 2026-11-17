# One Health demo: Loom script (about 4½ minutes)

**Open:** https://demo.straypaw.org in Chrome, 1920×1080, 100% zoom. Press **Start Demo** when you start recording.

The guide sits in a column at the right; the product fills the rest. It rings the one thing to look at on each
screen. **Next** does that step for you if you haven't, then moves on. You can also click, type or talk in the
product yourself at any point; the guide notices and follows.

| # | Screen | Press | Say |
|---|---|---|---|
| | **Start** | **Start Demo** | "One dog bite in Bengaluru, followed from the resident who reports it to the city that learns from it." |
| 1 | Citizen · **Tell Kaju what happened** | **Next** (or type anything, or press **Call** and say it) | "She tells Kaju what happened in her own words, by chat or a call. Kaju understands it, writes the report on the right and asks only what's missing: one safety question, then what the dog looked like. Where it happened can be words, her location or a pin." |
| 2 | Citizen · **Send it to the clinic** | **Next** | "Nothing goes until she confirms. Then the nearest clinic knows she's coming, and she knows where to go." |
| 3 | Hospital · **The clinic is ready** | **Next** | "The report is on the clinic's Today before she arrives." |
| 4 | Hospital · **Record the bite** | **Next** | "Kaju prepared the record from her report. The clinician sets the category and saves. No form to fill." |
| 5 | Hospital · **Prescribe the course** | **Next** | "Kaju lays out the clinic's protocol; the clinician ticks and saves. Every dose lands on the clinic's Today, and the NGO for Indiranagar is asked to find the dog, with no patient details." |
| 6 | Animal health · **A request arrives** | **Next** | "The NGO accepts the hospital's request." |
| 7 | Animal health · **Simba's record** | **Next** | "The dog that matches: vaccinated, sterilised, every step signed by a named person." |
| 8 | Animal health · **Link Simba to the bite** | **Next** | "Now the bite and the dog are one record for every partner." |
| 9 | Animal health · **Reports on WhatsApp** | **Next** | "Residents report on WhatsApp too, with photos and location. One tap opens a case." |
| 10 | Kaju · **Tag Kaju in the team chat** | **Next** | "The team talks in #indiranagar. Tag @Kaju and it turns the thread into tasks; one tap adds them to Work." |
| 11 | Kaju · **Ask Kaju** | **Next** | "I ask in plain words what's happening and what's missing." |
| 12 | Kaju · **Approve the next steps** | **Next** | "Kaju says what's missing and who does what, and prepares the work. Nothing is saved until a person confirms." |
| 13 | Municipality · **What needs a decision** | **Next** | "The city sees alerts, coverage and overdue work in one place." |
| 14 | Municipality · **Coverage and gaps** | **Next** | "Vaccination against each area's target, and where it falls short." |
| 15 | One Health · **Where to act** | **Next** | "The same records become surveillance: bites, lab results and vaccination, by area." |
| 16 | One Health · **Research-ready data** | **Finish** | "And privacy-protected data for research: small counts are hidden." |
| | **End** | | "One incident becomes a coordinated response, a verifiable operational record and actionable One Health intelligence." |

**To show the call (adds about 40 seconds):** on step 1 press **Call**, choose English, ಕನ್ನಡ or हिन्दी, press
**Call Kaju**, allow the microphone and talk as you would to a person: say what happened, answer the safety question,
then whatever Kaju still needs, and "Send it".

**If something goes wrong:** **Back** returns a step; **Restart** starts a fresh run; **Exit** folds the guide to a
pill you can resume from. A step that waits for a screen shows **Take me there**.

**Before recording:** ask for the demonstration data to be reset, so the run is the only incident of the day, and
run `scripts/staging/seed-demo-channel.sql` on staging so #indiranagar starts fresh.
