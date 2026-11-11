/* The public site's navigation: four menus, each answering one question, and
   no destination listed twice. Everything else lives in the footer. */
export type NavLink = { href: string; label: string; hint?: string };
export type NavCol = { title: string; links: NavLink[] };
export type NavMenu = { id: string; label: string; cols: NavCol[]; note: { title: string; href: string; cta: string } };

export const MENUS: NavMenu[] = [
  { id: "platform", label: "Platform", note: { title: "One record, every institution", href: "/platform", cta: "See how it connects" }, cols: [
    { title: "Animal health", links: [
      { href: "/platform", label: "Platform overview", hint: "What it does, module by module" },
      { href: "/abc-operations", label: "ABC and vaccination", hint: "Capture to an accepted report" },
      { href: "/ai", label: "Kaju", hint: "Prepares the work; people approve" },
    ] },
    { title: "One Health", links: [
      { href: "/platform#bite-care", label: "Bite care and PEP tracking", hint: "At the treating facility" },
      { href: "/platform#network", label: "Care network", hint: "Vaccine, wound washing, referrals" },
      { href: "/platform#laboratory", label: "Laboratory surveillance", hint: "Samples, custody, results" },
    ] },
  ] },
  { id: "solutions", label: "Who it's for", note: { title: "Start alone, join a programme later", href: "/partner-apply", cta: "Register an organisation" }, cols: [
    { title: "Run the programme", links: [
      { href: "/for-governments", label: "Governments", hint: "Review, oversight, city and state cells" },
      { href: "/for-ngos", label: "NGOs and ABC operators", hint: "Do the work and prove it" },
      { href: "/for-hospitals", label: "Hospitals and laboratories", hint: "Bite register, doses, results" },
    ] },
    { title: "Fund and study it", links: [
      { href: "/for-funders", label: "Funders and CSR", hint: "What the grant achieved" },
      { href: "/research", label: "Researchers", hint: "Governed, reproducible data" },
    ] },
  ] },
  { id: "trust", label: "Trust", note: { title: "Partners see counts, never people", href: "/security", cta: "Read the security summary" }, cols: [
    { title: "Security", links: [
      { href: "/security", label: "Security", hint: "Permissions, isolation, audit" },
      { href: "/data-governance", label: "Data governance", hint: "Who can see what, and why" },
      { href: "/status", label: "System status", hint: "Live, from the running system" },
    ] },
    { title: "Proof", links: [
      { href: "/customers", label: "Field partners", hint: "Who works with StrayPaw, and how" },
      { href: "/roadmap", label: "Roadmap", hint: "What is live and what is not" },
    ] },
  ] },
  { id: "resources", label: "Resources", note: { title: "Open to everyone, no account", href: "/community", cta: "Open the public map" }, cols: [
    { title: "Learn", links: [
      { href: "/docs", label: "Documentation", hint: "How each workflow works" },
      { href: "/learn", label: "Academy", hint: "Courses and teaching materials" },
      { href: "/blog", label: "Writing", hint: "Product notes and field stories" },
    ] },
    { title: "Company", links: [
      { href: "/our-story", label: "Our story", hint: "Why we are building this" },
      { href: "/contact", label: "Contact", hint: "Talk to the team" },
    ] },
  ] },
];

export const FOOT: [string, [string, string][]][] = [
  ["Platform", [["Platform overview", "/platform"], ["ABC and vaccination operations", "/abc-operations"], ["Kaju", "/ai"], ["Field intake", "/whatsapp"], ["Pricing", "/pricing"]]],
  ["Who it's for", [["Municipal corporations", "/for-governments"], ["NGOs and ABC operators", "/for-ngos"], ["Hospitals and laboratories", "/for-hospitals"], ["Rescue and care", "/solutions/rescue-care"], ["Researchers", "/research"], ["Funders and CSR", "/for-funders"]]],
  ["Trust", [["Security", "/security"], ["Data governance", "/data-governance"], ["System status", "/status"], ["Field partners", "/customers"], ["Research standards", "/research-standards"], ["Roadmap", "/roadmap"]]],
  ["Resources", [["Documentation", "/docs"], ["Academy", "/learn"], ["Public map", "/community"], ["Open datasets", "/research/datasets"], ["Questions", "/faq"], ["Register an organisation", "/partner-apply"], ["Contact", "/contact"]]],
];
