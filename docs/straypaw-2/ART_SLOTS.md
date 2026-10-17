# Commissioned art — slot register

Folk art is StrayPaw 2.0's dominant identity, and it must come from named,
paid, credited artists (Folk Art Direction Appendix v1.0). Each slot below is
already in the layout and renders an original two-ink geometric plate marked
**"Artwork to be commissioned"** until a commission is signed. No traditional
motif has been drawn, traced or generated.

To fill a slot: add the files, set `commission` in `src/sp/ui/slots.ts`
(artist, work, licence scope, credit line, agreement reference, src). The
`ArtSlot` component then shows the work with its credit, and /art-credits
should list it.

Rules for every slot: never inside a chart, queue row, form field, clinical
record or map mark; never a stand-in for an animal's photograph; colour meaning
stays in standard symbols, never in the art.

| Slot | Surface | What | Appears on | Ratio | Brief | Guidance | Motion | Status |
|---|---|---|---|---|---|---|---|---|
| `atlas-city` | Atlas | City introduction plate | /community (city panel), /city/report cover | 3 | A wide plate that opens a city on the map: its streets, animals and people in the artist's idiom, with no claim about where any recorded animal is. | Commission artists connected to the region where possible; no idiom presented as belonging to every resident. | gentle reveal | open |
| `atlas-legend` | Atlas | Legend chapter heads | /community legend, /city legend | 1 | Small heads beside each legend group, always next to a plain standard symbol. | Colour meaning stays in the symbol, never in the art. | none | open |
| `animal-chapter` | Animal record | Chapter marker | /animal/[id] | 1 | A recurring mark that opens each chapter of an animal's history. | Must never read as a portrait of the animal. | none | open |
| `animal-no-photo` | Animal record | No-photograph vignette | /animal/[id] without photo | 0.8 | A generic illustrated street animal (not this one) framing the words "No photograph recorded". | Always labelled as an illustration; a real photograph always replaces it. | none | open |
| `report-receipt` | Report | Receipt scene | /community/report receipt | 1.33 | A calm scene for the moment a report reaches StrayPaw, without implying a rescue is on its way. | No ambulance, no hands lifting an injured animal: received is not rescued. | gentle reveal | open |
| `activity-empty` | My Activity | "No history yet" scene | /community/activity empty | 1.33 | A quiet first-run scene before any report or saved animal. | Warm, small, no text inside the art. | none | open |
| `academy-cover` | Academy | Course covers | /learn, /learn/courses/[course] | 1.33 | One cover per course: observing, staying safe, reading records, care in a neighbourhood, acting together. | Children never shown approaching, touching or feeding an unfamiliar or distressed animal. | gentle reveal | open |
| `academy-panels` | Academy | Lesson sequential panels | /learn/courses/[course]/[lesson] | 1.78 | Narrative panels that unfold a care process step by step, read beside an interactive diagram. | Scroll-like narrative structure; no sacred or ritual imagery, no copied compositions. | sequenced panels | open |
| `city-report-cover` | Municipality | City report cover and dividers | /city/report | 0.77 | A limited-ink broadsheet cover and fine-line dividers for the printable city report. | Ornament on cover and dividers only; nothing inside charts or near figures. | none | open |
| `ngo-empty` | NGO | Workspace empty states | /ngo empty, /ngo/animals empty | 1.33 | Sparse illustrations for a queue with nothing waiting, a register with no animals yet, a map with no open work. | Never on queue rows, statuses, inputs or the inspector. | none | open |
| `workshop-scenes` | Workshops | Workshop scenes | /learn/workshops | 1.5 | Small human-and-animal scenes for facilitator plans and printed handouts. | Safe distances between people and animals in every scene. | none | open |
