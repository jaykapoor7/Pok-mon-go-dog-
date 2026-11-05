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
export const MEGA: Record<"platform" | "solutions" | "resources", MegaCol[]> = {
  platform: [
    { title: "Products", links: [
      { href: "/whatsapp", label: "Receive", hint: "Field and public reports become cases" },
      { href: "/abc-operations#capture", label: "Register", hint: "One record per animal, from capture on" },
      { href: "/abc-operations#treatment", label: "Treat", hint: "Procedures the vet actually signed" },
      { href: "/abc-operations#evidence", label: "Release", hint: "Released where captured, with proof" },
      { href: "/abc-operations#report", label: "Submit & bill", hint: "The monthly claim the office can check" },
    ] },
    { title: "Platform", links: [
      { href: "/platform", label: "Platform overview" },
      { href: "/roadmap", label: "Roadmap" },
      { href: "/ai", label: "Kaju AI" },
      { href: "/kaju-agents", label: "Kaju agents" },
      { href: "/whatsapp", label: "WhatsApp intake" },
      { href: "/for-governments", label: "Government workspace" },
      { href: "/platform#integrations", label: "Integrations" },
      { href: "/data-governance", label: "Data governance" },
    ] },
    { title: "Open to everyone", links: [
      { href: "/community", label: "National register", hint: "The public map of India's street animals" },
      { href: "/research", label: "Research", hint: "Open data, methods and studies" },
      { href: "/learn", label: "Academy", hint: "Courses, school programmes and practicums" },
      { href: "/community/report", label: "Report an animal", hint: "No account needed" },
    ] },
  ],
  solutions: [
    { title: "By organisation", links: [
      { href: "/for-ngos", label: "NGOs & ABC operators", hint: "Run funded programmes and prove the work" },
      { href: "/for-governments", label: "Municipal corporations", hint: "Review claims animal by animal" },
      { href: "/for-funders", label: "Funders & CSR", hint: "See what your grant achieved" },
      { href: "/solutions/rescue-care", label: "Rescue & community groups", hint: "Requests, treatment and outcomes" },
    ] },
    { title: "By programme", links: [
      { href: "/abc-operations", label: "Animal birth control", hint: "Capture, surgery and release" },
      { href: "/solutions/abc-arv", label: "Anti-rabies vaccination", hint: "Doses recorded animal by animal" },
      { href: "/solutions/rescue-care", label: "Rescue & treatment", hint: "Every case closed with an outcome" },
      { href: "/for-feeders", label: "Feeding & community care", hint: "Know the animals you feed" },
    ] },
    { title: "By team", links: [
      { href: "/teams/coordinators", label: "Coordinators" },
      { href: "/teams/field-staff", label: "Field staff" },
      { href: "/teams/veterinarians", label: "Veterinarians" },
      { href: "/teams/municipal-reviewers", label: "Municipal reviewers" },
      { href: "/teams/leadership", label: "Leadership" },
    ] },
  ],
  resources: [
    { title: "Get updated", links: [
      { href: "/blog", label: "Blog", hint: "Field guides, case studies and notes" },
      { href: "/product-updates", label: "Product updates", hint: "New features and improvements" },
      { href: "/blog?kind=Research%20notes", label: "Research notes", hint: "Methods, data and what they can say" },
      { href: "/roadmap", label: "Roadmap", hint: "What we've shipped and what's next" },
    ] },
    { title: "Get connected", links: [
      { href: "/events", label: "Events & webinars", hint: "Live sessions with practitioners" },
      { href: "/blog?kind=Newsroom", label: "Newsroom", hint: "Announcements and press" },
      { href: "/customers", label: "Customer stories", hint: "How partners use StrayPaw" },
      { href: "/partner-apply", label: "Partner with us", hint: "Join as an NGO, office or university" },
    ] },
    { title: "Get started", links: [
      { href: "/docs", label: "Help center", hint: "Docs, guides and quick answers" },
      { href: "/pricing", label: "Pricing", hint: "Plans for every programme" },
      { href: "/faq", label: "FAQ", hint: "Common questions, plainly answered" },
      { href: "/our-story", label: "Our story", hint: "Why we are building StrayPaw" },
    ] },
  ],
};
