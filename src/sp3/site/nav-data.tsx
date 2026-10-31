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
  { href: "/ai", label: "StrayPaw AI", hint: "Finds gaps, prepares records, cites its sources", icon: <Sparkles size={16} />, tone: "violet" },
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
  { href: "/research", label: "Research", hint: "Methods, sources and the research archive", icon: <FlaskConical size={16} />, tone: "teal" },
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
