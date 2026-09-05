/* ════════════════════════════════════════════════════════════════════
   JSON-LD for the site.

   Search engines and the crawlers behind AI answers read this to work out
   what StrayPaw is and who runs it. Without it the page is just prose they
   have to guess at, which is what an audit means by "no structured data".

   Everything below is a fact that exists elsewhere on the site. No postal
   address is declared, because there is not a real one to declare and a
   made-up address in machine-readable identity is worse than an absent
   one: it is the field a reader would trust most.
   ════════════════════════════════════════════════════════════════════ */

const ORG_ID = "#organisation";

export function StructuredData({ siteUrl }: { siteUrl: string }) {
  const base = siteUrl.replace(/\/$/, "");

  const graph = [
    {
      "@type": "Organization",
      "@id": `${base}/${ORG_ID}`,
      name: "StrayPaw",
      url: base,
      logo: `${base}/icon.png`,
      email: "jaykapoor7@outlook.com",
      description:
        "StrayPaw gives every street animal in India a permanent identity and a shared record. Residents, field teams and municipalities write to the same map, so coverage can be counted instead of estimated.",
      areaServed: { "@type": "Country", name: "India" },
      sameAs: ["https://x.com/jaybuildsvx"],
      knowsAbout: [
        "Free-roaming dog population management",
        "Animal Birth Control programmes",
        "Rabies prevention",
        "ISO 11784/11785 animal identification",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      url: base,
      name: "StrayPaw",
      description:
        "A shared record for India's street animals: every sighting becomes an observation, and observations accumulate into a record of one animal over time.",
      inLanguage: "en-IN",
      publisher: { "@id": `${base}/${ORG_ID}` },
      /* The organisation directory is a real search endpoint that accepts a
         q parameter, so this action resolves to something that works. */
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${base}/orgs?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Serialised rather than templated so a stray character in any field
      // cannot break out of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
