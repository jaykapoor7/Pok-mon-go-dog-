import type { ReactNode } from "react";
import {
  BookOpen, Building2, ClipboardCheck, FlaskConical, GraduationCap, HandHeart,
  Landmark, Map as MapIcon, MessageCircle, Plug, ShieldCheck, Sparkles, Stethoscope, Syringe, Users,
} from "lucide-react";

/* The site's navigation data. A plain module (not "use client") so server
   pages such as /solutions can render the same lists the header shows. */
export type Item = { href: string; label: string; hint: string; icon: ReactNode };

export const PLATFORM: Item[] = [
  { href: "/platform", label: "Operations", hint: "Programmes, animals, cases, evidence and reports in one record", icon: <ClipboardCheck size={17} /> },
  { href: "/ai", label: "StrayPaw AI", hint: "Search, summarise and prepare records with citations", icon: <Sparkles size={17} /> },
  { href: "/whatsapp", label: "CareOS for WhatsApp", hint: "Field intake from a phone, prepared for review", icon: <MessageCircle size={17} /> },
  { href: "/platform#integrations", label: "Integrations", hint: "Registers, imports, map embeds and email", icon: <Plug size={17} /> },
  { href: "/platform#security", label: "Security & trust", hint: "Permissions, provenance, review and audit", icon: <ShieldCheck size={17} /> },
];
export const SOLUTIONS: Item[] = [
  { href: "/for-governments", label: "Municipalities", hint: "Oversee ABC/ARV delivery and reports", icon: <Landmark size={17} /> },
  { href: "/for-ngos", label: "NGOs", hint: "Record fieldwork, cases and care", icon: <Building2 size={17} /> },
  { href: "/solutions/abc-arv", label: "ABC / ARV programmes", hint: "Sterilisation and vaccination, end to end", icon: <Syringe size={17} /> },
  { href: "/solutions/rescue-care", label: "Rescue & care", hint: "Requests, treatment and follow-ups", icon: <Stethoscope size={17} /> },
  { href: "/for-funders", label: "Funders", hint: "Scoped monitoring of funded programmes", icon: <HandHeart size={17} /> },
];
export const RESOURCES: Item[] = [
  { href: "/explore", label: "Public map", hint: "Recorded animals and care by place", icon: <MapIcon size={17} /> },
  { href: "/evidence", label: "Research", hint: "Sources, methods and published findings", icon: <FlaskConical size={17} /> },
  { href: "/learn", label: "Academy", hint: "Courses, workshops and teaching materials", icon: <GraduationCap size={17} /> },
  { href: "/for-community", label: "Community", hint: "Report an animal, follow what happens", icon: <Users size={17} /> },
  { href: "/docs", label: "Documentation", hint: "How the product works, step by step", icon: <BookOpen size={17} /> },
];
/** Kept for pages that still list audiences. */
export const AUDIENCES = [
  { label: "Municipalities", href: "/for-governments", hint: "Oversee programmes. Review records." },
  { label: "NGOs & Rescues", href: "/for-ngos", hint: "Record fieldwork. Manage cases." },
  { label: "Funders", href: "/for-funders", hint: "Monitor funded programmes." },
  { label: "Community", href: "/for-community", hint: "Report animals. Follow updates." },
  { label: "Feeders", href: "/for-feeders", hint: "Know your animals. Record care." },
  { label: "Education", href: "/education", hint: "Learn, teach and share." },
];

