import type { Metadata, Viewport } from "next";
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
import { Analytics } from "@vercel/analytics/next";

import { SITE_URL } from "@/lib/site-url";

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
    "Shared dog records for residents, NGOs and municipalities: sightings, field work, care and documented outcomes across India.",
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
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/straypaw-symbol.svg", type: "image/svg+xml" }],
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
      className=""
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
        <Analytics />
      </body>
    </html>
  );
}
