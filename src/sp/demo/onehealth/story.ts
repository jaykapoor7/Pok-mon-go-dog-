/* The One Health product demo: one dog bite followed through every partner in a city programme, in the order the
   work travels. Everything in it is illustrative: the people, places, numbers and dates are invented, institutions
   are named by their role, and every screen says so. Each thing Kaju does is marked as in StrayPaw today or proposed,
   so the demo never presents a proposal as a working feature. */

import type { KajuState } from "@/kaju/poses";

export type Avail = "today" | "proposed";
export type KajuItem = { t: string; s: Avail };
export type Beat = { say: string; ms: number; pose?: KajuState };
export type ChapterId = "citizen" | "hospital" | "vet-ngo" | "municipality" | "research" | "kaju";

export type Chapter = {
  id: ChapterId;
  /** Short name for the stepper. */
  label: string;
  /** What the role does in this chapter, as a sentence title. */
  title: string;
  /** The place and the person working there. */
  where: string;
  who: string;
  when: string;
  /** The chapter as a whole is a proposal, not something in StrayPaw today. */
  proposed?: boolean;
  beats: Beat[];
  kaju: KajuItem[];
  /** The rule that holds in this chapter, in one sentence. */
  guard: string;
  /** What the work hands on to. */
  next?: string;
  /** The same screen in StrayPaw, with sample data when signed out. */
  real?: { href: string; label: string };
};

/* The one case, the same in every chapter. */
export const CASE = {
  code: "BX-2611-4F2A",
  ref: "OPD-ILL-0412",
  area: "Jayanagar",
  spot: "4th Block bus stop",
  day: "Mon 16 Nov",
  dog: "AN-1188",
  programme: "Bengaluru Rabies Elimination · Illustrative",
  clinic: "Teaching Hospital Anti-Rabies Clinic",
  ngo: "Animal Care Trust",
  office: "Municipal Animal Husbandry & Health Division",
  unit: "Programme Epidemiology Unit",
  clinician: "Dr. Meera N.",
  nurse: "Latha P.",
  coordinator: "Priya M.",
  vet: "Dr. Arun K.",
};

export const CHAPTERS: Chapter[] = [
  {
    id: "citizen", label: "Citizen", title: "Reports a dog bite in Kannada",
    where: "Kaju Voice, in Kannada", who: "A resident of Jayanagar", when: "Mon 16 Nov · 08:14", proposed: true,
    beats: [
      { say: "She tells Kaju what happened, in Kannada, in her own words.", ms: 7000, pose: "listening" },
      { say: "Kaju gives the fixed first-aid steps and asks about danger signs.", ms: 7500, pose: "explaining" },
      { say: "A bite on the hand is a danger sign. Kaju sends her to the nearest centre that confirmed vaccine and immunoglobulin today.", ms: 8500, pose: "concerned" },
      { say: "With her consent, the report goes to the clinic before she arrives.", ms: 8000, pose: "listening" },
      { say: "Kaju turns the call into an intake the clinic can read, and lists what the call did not cover.", ms: 8000, pose: "success" },
    ],
    kaju: [
      { t: "Talks with her in Kannada, and follows if she switches to English or Hindi.", s: "today" },
      { t: "Takes the bite report by voice or chat and sends it to the clinic, with her consent.", s: "proposed" },
      { t: "Writes the intake in English and Kannada, with what was not asked.", s: "proposed" },
    ],
    guard: "First aid and danger signs are fixed steps reviewed by clinicians. Kaju does not assess the wound or suggest a treatment.",
    next: "The clinic sees her report before she walks in.",
  },
  {
    id: "hospital", label: "Hospital", title: "Reviews clinical urgency and manages the PEP pathway",
    where: CASE.clinic, who: "Duty clinician and nurse", when: "Mon 16 Nov · 08:52",
    beats: [
      { say: "Her report is waiting in the bite register, with what she said: a bite on the hand, bleeding.", ms: 6500, pose: "sitting" },
      { say: "The clinician opens it. Kaju's intake sits beside the record, with the questions still to ask.", ms: 7000, pose: "explaining" },
      { say: "The clinician examines the wound and records Category III, signed in their own name.", ms: 7000, pose: "sitting" },
      { say: "The clinician prescribes immunoglobulin and the vaccine course, and enters every dose date.", ms: 7500, pose: "sitting" },
      { say: "The nurse gives dose 1. The area's animal team is asked to find the dog, with no patient details.", ms: 7500, pose: "success" },
    ],
    kaju: [
      { t: "Puts the caller's report on the clinic's register before she arrives.", s: "proposed" },
      { t: "Lists what the call did not cover, for the clinician to ask.", s: "proposed" },
      { t: "Stays out of the clinical record: it never reads the category, the course or the doses.", s: "today" },
    ],
    guard: "StrayPaw records clinical decisions and never makes them. It does not calculate a schedule: every dose date is entered by the clinician.",
    next: "The NGO is asked to find the dog: the place and the animal, nothing about her.",
    real: { href: "/health/bites", label: "The bite register" },
  },
  {
    id: "vet-ngo", label: "Vet & NGO", title: "Investigates the animal and checks its vaccination record",
    where: CASE.ngo, who: "NGO coordinator and field veterinarian", when: "16 Nov to 26 Nov",
    beats: [
      { say: "The hospital's request arrives in the NGO's inbox: the place and the dog's description, nothing more.", ms: 6500, pose: "listening" },
      { say: "Kaju suggests a registered dog seen 140 m away. It stays a suggestion until the team confirms it.", ms: 7000, pose: "thinking" },
      { say: "The dog's record shows its anti-rabies vaccination in March, from the ward drive.", ms: 7000, pose: "explaining" },
      { say: "The field vet finds the dog and knows it by its ear notch. Kaju prepares the day 3, 7 and 10 checks; the coordinator approves them.", ms: 8000, pose: "thinking" },
      { say: "Day 10: the dog is alive and well. The outcome goes back to the hospital, where the clinician decides about the course.", ms: 7500, pose: "success" },
    ],
    kaju: [
      { t: "Suggests the likely dog from the register; a person confirms it.", s: "today" },
      { t: "Brings up the dog's vaccination and sterilisation history.", s: "today" },
      { t: "Prepares the observation visits and waits for approval.", s: "today" },
      { t: "Notices a visit saved without a photo.", s: "today" },
    ],
    guard: "The dog's history informs the clinician; it never changes the course by itself. Had the dog fallen ill, the team would send a sample to the laboratory.",
    next: "The municipality sees the follow-up closed, and what is still open across the city.",
    real: { href: "/ngo/inbox", label: "The NGO inbox" },
  },
  {
    id: "municipality", label: "Municipality", title: "Tracks assigned actions, coverage and unresolved cases",
    where: CASE.office, who: "Programme officer", when: "Fri 27 Nov · weekly review",
    beats: [
      { say: "Every action assigned between partners, with its owner and due date. The Jayanagar follow-up is closed.", ms: 7000, pose: "sitting" },
      { say: "Dog vaccination coverage by area, against the 70% target. Jayanagar is above it; two areas are not.", ms: 7000, pose: "explaining" },
      { say: "Kaju flags that Jayanagar's dog population estimate is 22 months old, so its coverage may read too high.", ms: 7500, pose: "insight" },
      { say: "What is still unresolved: an overdue follow-up, a centre without vaccine, and overdue doses, as counts only.", ms: 7500, pose: "concerned" },
      { say: "Kaju drafts the weekly brief and suggests an owner for the open task. The officer confirms before anything is sent.", ms: 7500, pose: "success" },
    ],
    kaju: [
      { t: "Lists follow-ups between partners that are waiting or overdue.", s: "today" },
      { t: "Flags figures that rest on old or missing data.", s: "proposed" },
      { t: "Drafts the weekly brief and suggests owners; the officer confirms.", s: "proposed" },
    ],
    guard: "Coverage counts verified vaccinations against a dated estimate; an area without one shows no figure. Human counts below 5 stay hidden outside the treating facility.",
    next: "Researchers evaluate the programme on approved, aggregated data.",
    real: { href: "/gov/overview", label: "The programme overview" },
  },
  {
    id: "research", label: "Researchers", title: "Evaluate interventions on approved, privacy-protected data",
    where: CASE.unit, who: "Researcher", when: "Quarterly · approved access",
    beats: [
      { say: "The researcher sees only the datasets the programme's data steward approved, each with a version and an end date.", ms: 7000, pose: "sitting" },
      { say: "Bite exposures by month, in an area with a vaccination drive and one without.", ms: 7000, pose: "explaining" },
      { say: "Vaccination coverage sits on the same timeline, so an intervention can be evaluated against it.", ms: 7000, pose: "explaining" },
      { say: "This morning's bite is one count in Jayanagar's week. Counts below 5 are hidden and never added into a total.", ms: 7500, pose: "sitting" },
      { say: "Kaju drafts a request for one more dataset. The steward decides.", ms: 7000, pose: "success" },
    ],
    kaju: [
      { t: "Explains how each figure is counted and what is hidden.", s: "today" },
      { t: "Drafts data requests for the steward to approve or refuse.", s: "proposed" },
    ],
    guard: "Researchers never see a patient-level record. Access is approved by the programme's steward, versioned, and can be withdrawn.",
    next: "Kaju, across the whole case.",
    real: { href: "/research/datasets", label: "Research datasets" },
  },
  {
    id: "kaju", label: "Kaju", title: "Supports coordination from the first call to the evaluation",
    where: "Kaju, StrayPaw's assistant", who: "With every partner", when: "Throughout",
    beats: [
      { say: "Every step Kaju took on this case, in order, and who confirmed it.", ms: 8000, pose: "explaining" },
      { say: "What Kaju never does, whoever asks.", ms: 7000, pose: "sitting" },
      { say: "What runs in StrayPaw today, what this application proposes, and what must be approved before real use.", ms: 9000, pose: "success" },
    ],
    kaju: [
      { t: "Prepares records, flags missing information and drafts the next task.", s: "today" },
      { t: "Saves every change through the normal records, in the name of the person who confirmed it.", s: "today" },
    ],
    guard: "Kaju prepares; people decide. Nothing clinical, no data access and no payment is ever decided by Kaju.",
  },
];

export const TOTAL_MS = CHAPTERS.reduce((t, c) => t + c.beats.reduce((s, b) => s + b.ms, 0), 0);
