/* The public site's navigation: four menus, each answering one question. */
export type NavLink = { href: string; label: string; hint?: string };
export type NavCol = { title: string; links: NavLink[] };
export type NavMenu = { id: string; label: string; cols: NavCol[]; note: { title: string; body: string; href: string; cta: string } };

export const MENUS: NavMenu[] = [
  { id: "platform", label: "Platform", note: { title: "One record, many institutions", body: "A bite at a hospital becomes a follow-up for the field team, a sample for the laboratory and a decision for the programme.", href: "/platform", cta: "See how it connects" }, cols: [
    { title: "Animal health", links: [
      { href: "/abc-operations", label: "ABC and vaccination operations", hint: "Capture, surgery, vaccination, release, evidence" },
      { href: "/abc-operations#report", label: "Verification and claims", hint: "Municipal review, animal by animal" },
      { href: "/whatsapp", label: "Field intake", hint: "Reports from the field become draft cases" },
    ] },
    { title: "One Health", links: [
      { href: "/platform#bite-care", label: "Bite care and PEP tracking", hint: "Clinician-governed, at the treating facility" },
      { href: "/platform#network", label: "Care network", hint: "Vaccine, immunoglobulin, wound washing, referrals" },
      { href: "/platform#laboratory", label: "Laboratory surveillance", hint: "Samples, chain of custody, results" },
    ] },
    { title: "Intelligence", links: [
      { href: "/ai", label: "Kaju", hint: "Finds gaps, prepares work, cites its sources" },
      { href: "/platform#coverage", label: "Coverage and alerts", hint: "Vaccination against the target, by area" },
      { href: "/platform#integrations", label: "Integrations", hint: "Imports, exports, email, maps" },
    ] },
  ] },
  { id: "solutions", label: "Who it's for", note: { title: "Start small", body: "An NGO can begin alone. A municipality, hospital or laboratory joins the same programme later, with no migration.", href: "/pricing", cta: "See pricing" }, cols: [
    { title: "Government", links: [
      { href: "/for-governments", label: "Municipal corporations", hint: "Oversight, review and reporting" },
      { href: "/for-governments#programme", label: "City and state programmes", hint: "Rabies elimination, ABC, One Health cells" },
    ] },
    { title: "Delivery", links: [
      { href: "/for-ngos", label: "NGOs and ABC operators", hint: "Run the work and prove it" },
      { href: "/solutions/rescue-care", label: "Rescue and care", hint: "Requests, treatment, follow-ups" },
      { href: "/teams/veterinarians", label: "Veterinarians", hint: "Sign what you treated" },
    ] },
    { title: "Health and research", links: [
      { href: "/platform#bite-care", label: "Hospitals and health centres", hint: "Bite register, doses, referrals" },
      { href: "/research", label: "Researchers", hint: "Governed, suppressed, reproducible data" },
      { href: "/for-funders", label: "Funders and CSR", hint: "What the grant achieved" },
    ] },
  ] },
  { id: "trust", label: "Trust", note: { title: "Patient records stay at the facility", body: "Other partners see counts, never people. Small counts are hidden. Every read of a record is logged.", href: "/security", cta: "Read the security summary" }, cols: [
    { title: "Security", links: [
      { href: "/security", label: "Security", hint: "Permissions, isolation, audit" },
      { href: "/data-governance", label: "Data governance", hint: "Who can see what, and why" },
      { href: "/status", label: "System status", hint: "Live, from the running system" },
    ] },
    { title: "Proof", links: [
      { href: "/customers", label: "Field partners", hint: "Who works with StrayPaw, and how" },
      { href: "/research-standards", label: "Research standards", hint: "Methods, provenance, limits" },
      { href: "/roadmap", label: "Roadmap", hint: "What is live and what is not" },
    ] },
    { title: "Legal", links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/data-processing", label: "Data processing" },
    ] },
  ] },
  { id: "resources", label: "Resources", note: { title: "No account needed", body: "Anyone can report an animal that needs help or explore the public map.", href: "/community/report", cta: "Report an animal" }, cols: [
    { title: "Learn", links: [
      { href: "/docs", label: "Documentation", hint: "How each workflow works" },
      { href: "/learn", label: "Academy", hint: "Courses and teaching materials" },
      { href: "/faq", label: "Questions", hint: "Short, direct answers" },
    ] },
    { title: "Open to everyone", links: [
      { href: "/community", label: "Public map", hint: "Recorded animals and care by place" },
      { href: "/research/datasets", label: "Open datasets", hint: "With methods and limits" },
      { href: "/blog", label: "Writing", hint: "Product notes and field stories" },
    ] },
    { title: "Company", links: [
      { href: "/our-story", label: "Our story" },
      { href: "/contact", label: "Contact" },
      { href: "/partner-apply", label: "Register an organisation" },
    ] },
  ] },
];

export const FOOT: [string, [string, string][]][] = [
  ["Platform", [["Platform overview", "/platform"], ["ABC and vaccination operations", "/abc-operations"], ["Kaju", "/ai"], ["Field intake", "/whatsapp"], ["Pricing", "/pricing"]]],
  ["Who it's for", [["Municipal corporations", "/for-governments"], ["NGOs and ABC operators", "/for-ngos"], ["Rescue and care", "/solutions/rescue-care"], ["Researchers", "/research"], ["Funders and CSR", "/for-funders"]]],
  ["Trust", [["Security", "/security"], ["Data governance", "/data-governance"], ["System status", "/status"], ["Field partners", "/customers"], ["Roadmap", "/roadmap"]]],
  ["Resources", [["Documentation", "/docs"], ["Academy", "/learn"], ["Public map", "/community"], ["Questions", "/faq"], ["Contact", "/contact"]]],
];
