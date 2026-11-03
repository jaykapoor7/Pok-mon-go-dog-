import type { ReactNode } from "react";
import {
  BookOpen, Building2, ClipboardCheck, FlaskConical, GraduationCap, HeartHandshake,
  Landmark, Map as MapIcon, MessageCircle, Plug, ShieldCheck, Sparkles, Stethoscope, Syringe, Users,
} from "lucide-react";

/* The site's navigation data (StrayPaw 4, operator-first). A plain module,
   not "use client", so server pages render the same lists the header shows.
   `tone` colours the module square, as modules are coloured in the app. */
export type Tone = "blue" | "flame" | "teal" | "green" | "amber" | "violet" | "ink";
export type Item = { href: string; label: string; hint: string; icon: ReactNode; tone?: Tone };

export const PLATFORM: Item[] = [
  { href: "/abc-operations", label: "ABC Operations & Verification", hint: "Capture, treatment, evidence, review and the report package", icon: <ClipboardCheck size={16} />, tone: "blue" },
  { href: "/ai", label: "Kaju", hint: "Finds gaps, prepares records, cites its sources", icon: <Sparkles size={16} />, tone: "violet" },
  { href: "/whatsapp", label: "WhatsApp field intake", hint: "Field messages become draft records for review", icon: <MessageCircle size={16} />, tone: "green" },
  { href: "/platform#integrations", label: "Integrations", hint: "Register imports, exports, email and map embeds", icon: <Plug size={16} />, tone: "amber" },
  { href: "/security", label: "Security", hint: "Permissions, isolation, provenance and audit", icon: <ShieldCheck size={16} />, tone: "ink" },
];
export const SOLUTIONS: Item[] = [
  { href: "/for-ngos", label: "ABC operators & NGOs", hint: "Run funded programmes and prove the work", icon: <Building2 size={16} />, tone: "blue" },
  { href: "/solutions/abc-arv", label: "ABC / ARV programmes", hint: "Sterilisation and vaccination, end to end", icon: <Syringe size={16} />, tone: "teal" },
  { href: "/solutions/rescue-care", label: "Rescue & care", hint: "Requests, treatment and follow-ups", icon: <Stethoscope size={16} />, tone: "flame" },
  { href: "/for-governments", label: "Government oversight", hint: "Review operator evidence and reports", icon: <Landmark size={16} />, tone: "ink" },
  { href: "/for-community", label: "Community & welfare groups", hint: "Report animals and follow outcomes", icon: <HeartHandshake size={16} />, tone: "green" },
];
export const RESOURCES: Item[] = [
  { href: "/docs", label: "Documentation", hint: "How the product works, step by step", icon: <BookOpen size={16} />, tone: "blue" },
  { href: "/research", label: "Research", hint: "Datasets, methods and data access", icon: <FlaskConical size={16} />, tone: "teal" },
  { href: "/explore", label: "Public map", hint: "Recorded animals and care by place", icon: <MapIcon size={16} />, tone: "green" },
  { href: "/learn", label: "Academy", hint: "Courses and teaching materials", icon: <GraduationCap size={16} />, tone: "amber" },
  { href: "/for-community", label: "Report an animal", hint: "No account needed", icon: <Users size={16} />, tone: "flame" },
];
/** Kept for pages that still list audiences. */
export const AUDIENCES = [
  { label: "ABC operators & NGOs", href: "/for-ngos", hint: "Run programmes. Prove the work." },
  { label: "Government", href: "/for-governments", hint: "Review evidence. Accept reports." },
  { label: "Rescue & care", href: "/solutions/rescue-care", hint: "Requests, treatment, follow-ups." },
  { label: "Community", href: "/for-community", hint: "Report animals. Follow updates." },
  { label: "Feeders", href: "/for-feeders", hint: "Know your animals. Record care." },
  { label: "Education", href: "/education", hint: "Learn, teach and share." },
];

/* ── StrayPaw 4 mega menus: three columns, title + one line, no icons ── */
export type MegaLink = { href: string; label: string; hint?: string };
export type MegaCol = { title: string; links: MegaLink[] };
export const MEGA: Record<"platform" | "solutions" | "resources" | "proof" | "community", MegaCol[]> = {
  platform: [
    { title: "Products", links: [
      { href: "/abc-operations", label: "ABC Operations & Verification", hint: "From capture to an accepted report" },
      { href: "/ai", label: "Kaju", hint: "Finds gaps and prepares records" },
      { href: "/whatsapp", label: "WhatsApp field intake", hint: "Field messages become drafts" },
      { href: "/solutions/rescue-care", label: "Rescue & care", hint: "Requests, treatment and follow-ups" },
      { href: "/abc-operations#report", label: "Report packages", hint: "Evidence the office can check" },
      { href: "/pricing", label: "Pricing", hint: "Plans for operators and offices" },
    ] },
    { title: "Platform", links: [
      { href: "/platform", label: "Platform overview" },
      { href: "/platform#integrations", label: "Integrations" },
      { href: "/security", label: "Security" },
      { href: "/data-governance", label: "Data governance" },
    ] },
  ],
  solutions: [
    { title: "By organisation", links: [
      { href: "/for-ngos", label: "ABC operators & NGOs", hint: "Run funded programmes and prove the work" },
      { href: "/for-governments", label: "Government oversight", hint: "Review operator evidence and reports" },
      { href: "/solutions/rescue-care", label: "Rescue groups", hint: "Requests, treatment and outcomes" },
      { href: "/for-community", label: "Community & welfare groups", hint: "Report animals and follow outcomes" },
    ] },
    { title: "By programme", links: [
      { href: "/abc-operations", label: "Animal birth control", hint: "Capture, surgery and release" },
      { href: "/solutions/abc-arv", label: "Anti-rabies vaccination", hint: "Doses recorded animal by animal" },
      { href: "/solutions/rescue-care", label: "Rescue & treatment", hint: "Every case closed with an outcome" },
    ] },
    { title: "By team", links: [
      { href: "/abc-operations#capture", label: "Field teams" },
      { href: "/abc-operations#treatment", label: "Veterinarians" },
      { href: "/abc-operations#review", label: "Coordinators" },
      { href: "/for-governments", label: "Government reviewers" },
    ] },
  ],
  resources: [
    { title: "Learn", links: [
      { href: "/docs", label: "Documentation", hint: "How the product works" },
      { href: "/learn", label: "Academy", hint: "Courses and teaching materials" },
      { href: "/faq", label: "FAQ", hint: "Common questions, plainly answered" },
    ] },
    { title: "Evidence", links: [
      { href: "/customers", label: "Customer stories", hint: "What partners record, and what we have not measured" },
      { href: "/research", label: "Research", hint: "Datasets, methods and data access" },
      { href: "/explore", label: "Public map", hint: "Recorded animals and care by place" },
    ] },
    { title: "Company", links: [
      { href: "/our-story", label: "Our story" },
      { href: "/contact", label: "Contact" },
      { href: "/partner-apply", label: "Partner with us" },
      { href: "/for-community", label: "Report an animal" },
    ] },
  ],
  /* Proof: what partners record, the public record itself, and who we are. */
  proof: [
    { title: "Evidence", links: [
      { href: "/customers", label: "Customer stories", hint: "What partners record, and what we have not measured" },
      { href: "/explore", label: "Public map", hint: "Recorded animals and care by place" },
      { href: "/city/insights", label: "City insights", hint: "Numbered findings, each with its limits" },
    ] },
    { title: "Trust", links: [
      { href: "/security", label: "Security", hint: "How records and access are protected" },
      { href: "/data-governance", label: "Data governance", hint: "Who sees what, and why" },
      { href: "/research-standards", label: "Research standards", hint: "How a finding is allowed to be stated" },
    ] },
    { title: "Company", links: [
      { href: "/our-story", label: "Our story" },
      { href: "/contact", label: "Contact" },
      { href: "/partner-apply", label: "Partner with us" },
    ] },
  ],
  /* Learn & Community: the public products, open to anyone. */
  community: [
    { title: "Community", links: [
      { href: "/community/report", label: "Report an animal", hint: "No account needed" },
      { href: "/community", label: "Map", hint: "Animals and care near you" },
      { href: "/community/stories", label: "Insights & stories", hint: "What happened next, start to finish" },
    ] },
    { title: "Education", links: [
      { href: "/education", label: "Education", hint: "For schools, volunteers and partners" },
      { href: "/learn", label: "Academy", hint: "Short courses on street animal care" },
      { href: "/learn/workshops", label: "Workshops", hint: "Ready-to-run sessions" },
    ] },
    { title: "Help", links: [
      { href: "/docs", label: "Documentation", hint: "How the product works" },
      { href: "/faq", label: "FAQ", hint: "Common questions, plainly answered" },
    ] },
  ],
};
