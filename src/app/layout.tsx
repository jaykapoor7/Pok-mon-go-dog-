import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  DM_Mono,
  Newsreader,
  Noto_Sans_Devanagari,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Noto_Sans_Kannada,
} from "next/font/google";
import "./tokens.css";
import "./globals.css";
import "./design-system.css";
import "./product.css";
import "./system.css";
import "./grounds.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { themeBootScript } from "@/components/theme/ThemeProvider";
import { StructuredData } from "@/components/seo/StructuredData";
import { RouteEnvironment } from "@/components/embed/RouteEnvironment";

import { SITE_URL } from "@/lib/site-url";
// Interface: DM Sans, restrained, precise, engineered.
const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

/* THE EDITORIAL FACE. Newsreader carries two jobs and no others: the large
   figure a section is about (2,188 requests; 96% unknown), and the one
   emphasis line under a headline. It was drawn for reading at display sizes
   on screens, which is what separates it from the decorative italic that
   was removed below. One use per view; the interface stays DM Sans. */
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

/* NO SECOND FACE. The display line used to be Instrument Serif in italic:
   the hero's second line, "Start with your street.", the big counts. One
   typeface carries the whole product now, and the emphasis that the serif
   used to provide comes from weight and colour instead. --font-display
   still exists, and still means "the display line", but it resolves to the
   interface face (see tokens.css) so every rule that asked for it keeps
   working. */

// Data: DM Mono, record IDs, coordinates, telemetry.
const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

/* DM Sans covers Latin only, so Hindi, Tamil, Telugu and Kannada would fall
   back to whatever the device happens to have and render inconsistently, or
   as boxes. Noto is the family designed for exactly this: one set of metrics
   across scripts. Each is subset to its own script so a reader downloads
   only the one they are using, and each swaps rather than blocking a first
   paint on a slow connection.

   Two weights, not four. These faces carry interface chrome -- navigation,
   controls, status words -- which needs a regular and a bold and nothing
   in between. Four weights across four families meant sixteen font files
   fetched at build time, which is a large, slow and failure-prone
   dependency for a build to carry, and a heavier download for exactly the
   low-bandwidth readers these languages are for. */
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-devanagari",
  display: "swap",
});
const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "600"],
  variable: "--font-tamil",
  display: "swap",
});
const telugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "600"],
  variable: "--font-telugu",
  display: "swap",
});
const kannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  weight: ["400", "600"],
  variable: "--font-kannada",
  display: "swap",
});

// Canonical site URL. Prefer the explicit env var; otherwise the production
// domain (NOT the per-deployment Vercel URL, which is auth-walled and makes
// crawlers like Twitterbot fail → gray preview).
const siteUrl = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  /* Every route resolves its own canonical against metadataBase. Without
     this, the same page reachable on a preview domain and on straypaw.org
     competes with itself in the index. */
  alternates: { canonical: "./" },
  title: "StrayPaw, every street animal on the record",
  description:
    "One shared record connecting sightings, field work and outcomes for India's street animals, so residents, NGOs, municipalities and funders work from the same data.",
  keywords: [
    "street animals",
    "India",
    "animal birth control",
    "ABC programme",
    "street dog census",
    "impact measurement",
    "animal welfare data",
    "NGO infrastructure",
    "rabies control",
    "CSR",
  ],
  openGraph: {
    title: "StrayPaw, every street animal on the record",
    description:
      "One shared record connecting sightings, field work and outcomes for India's street animals. One animal, one history, across every organisation that meets it.",
    type: "website",
    siteName: "StrayPaw",
    url: siteUrl,
    locale: "en_IN",
    images: [
      {
        url: `${siteUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: "StrayPaw",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw, every street animal on the record",
    description:
      "One shared record connecting sightings, field work and outcomes for India's street animals. One animal, one history, across every organisation that meets it.",
    /* A real file rather than a generated route. The generated one drew a
       hand-built heart-and-dog shape that was never the logo, and Next
       emitted twitter:image:alt and :type from it without twitter:image
       itself, which left X with a malformed card and no preview. */
    images: [`${siteUrl}/og.png`],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StrayPaw",
  },
  icons: {
    icon: "/straypaw-symbol.svg",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
  /* No maximumScale. Capping it at 1 blocks pinch zoom, and this is used
     outdoors on a phone by people who may need to enlarge the text. The
     input-zoom it was presumably guarding against is handled by keeping
     form fields at 16px instead. */
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* lang and data-locale are rendered here, matching LocaleProvider's
       default, so neither attribute appears on <html> after hydration.
       The provider rewrites them only when a visitor has actually chosen a
       different language. */
    <html
      lang="en"
      data-locale="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable} ${devanagari.variable} ${tamil.variable} ${telugu.variable} ${kannada.variable}`}
      suppressHydrationWarning
    >
      {/* <head> is left with no children of our own. React (19.2) saves its
         hydration cursor on entering <head> and restores it on leaving; if
         <head> suspends while hydrating (its children still arriving in the
         streamed payload) and is replayed, the replay overwrites the saved
         cursor, <body> then hydrates against <head>'s first child, and the
         whole page is thrown away and rendered again on the client: the
         intermittent error and the briefly doubled header. Next still puts
         metadata, fonts and styles in <head>; these two scripts sit at the
         top of <body>, where the theme script still runs before anything is
         painted and search engines read JSON-LD just the same. */}
      <head />
      <body className="min-h-dvh font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <StructuredData siteUrl={siteUrl} />
        <RouteEnvironment>{children}</RouteEnvironment>
      </body>
    </html>
  );
}
