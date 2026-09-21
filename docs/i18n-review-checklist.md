# Translation review checklist

StrayPaw ships in English, Hindi, Tamil, Telugu and Kannada. This file says
what has been translated, what deliberately has not, and what a reviewer has
to sign off before more of it goes live.

**Nothing in this file is signed off yet.** Every non-English string
currently in the product was produced without a native-speaker review and
should be treated as a draft.

---

## 1. What is translated today

Interface chrome only: navigation, control labels, status words, and the few
framing sentences in `src/lib/i18n/dictionaries/`.

A reader sees their language where a translation exists and English where it
does not. That is deliberate. A half-translated sentence is worse than an
English one, because it reads as a defect rather than as a boundary.

## 2. What is deliberately NOT translated, and must not be

| Item | Why |
|---|---|
| **Post-bite first aid** (`/resources`) | Wrong wound-care or vaccination-schedule wording can get somebody killed. English until a medical reviewer signs it off. |
| **Rabies and ABC explainers** (`/learn`) | Same reason, plus the legal framing of the ABC Rules. |
| **Privacy, terms, cookies, community guidelines, data governance** | Legal meaning. A translation is a second legal text, not a convenience. |
| **Record codes** (e.g. `CHN-2841`) | An identifier that changes shape between languages stops being shared. |
| **Organisation, person and locality names** | These are names. They are not translated in any language. |
| **Numerals in data** | Latin numerals are standard in Indian civic documents. Counts, dates and coordinates stay Latin; `Intl` handles grouping and date format per locale. |

## 3. Reviewer sign-off

One reviewer per language, a fluent speaker who has used the product.

- [ ] **Hindi** — reviewer: ______________  date: __________
- [ ] **Tamil** — reviewer: ______________  date: __________
- [ ] **Telugu** — reviewer: ______________  date: __________
- [ ] **Kannada** — reviewer: ______________  date: __________

For each language, confirm:

- [ ] Register is plain and official, the tone of a municipal notice. Not
      marketing, not Hinglish in the chrome.
- [ ] Every control label says what the control does, in a word a
      non-technical reader recognises.
- [ ] Status words (`reported`, `under review`, `verified`, `in care`,
      `resolved`) are distinct from one another and not synonyms.
- [ ] Nothing reads as a machine translation of an English idiom.
- [ ] Text fits: these scripts run longer than English, so check the header,
      buttons and the language menu at 320px for wrapping and truncation.

## 4. Before a safety-critical string is translated

Do not translate anything in section 2 until:

- [ ] A qualified reviewer for that domain (a veterinarian for first aid, a
      lawyer for legal copy) has approved the translated text.
- [ ] The English original stays visible alongside or one tap away, so a
      reader can check the source.
- [ ] The page states who reviewed it and when.

## 5. Adding a language

1. Add an entry to `LOCALES` in `src/lib/i18n/locales.ts` with its native
   name and short label.
2. Add `src/lib/i18n/dictionaries/<code>.ts` typed as `Dictionary`; the type
   will name any key you miss.
3. Register it in `dictionaries/index.ts`.
4. If it needs a script DM Sans lacks, add the Noto face in
   `src/app/layout.tsx` and one `:root[data-locale="<code>"]` rule in
   `src/app/tokens.css`.
5. Add a sign-off row to section 3.

No routing, caching or component changes are required.

## 6. Known limitation

Language is applied on the client after hydration, so the first frame is
English before the chosen language takes over. This keeps every page
statically cacheable and leaves URLs untouched, at the cost of
locale-specific URLs and `hreflang`. If search visibility in these languages
becomes a goal, that is the change to make, and it is a routing change that
should be planned on its own rather than bolted on.
