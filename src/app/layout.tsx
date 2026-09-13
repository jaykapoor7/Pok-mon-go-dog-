import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./tokens.css";
import "./globals.css";
import "./design-system.css";
import "./product.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { Chrome } from "@/components/nav/Chrome";
import { ThemeProvider, themeBootScript } from "@/components/theme/ThemeProvider";
import { StructuredData } from "@/components/seo/StructuredData";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Haptics } from "@/components/ux/Haptics";
import { InstallPrompt } from "@/components/ux/InstallPrompt";
import { Toaster } from "@/components/ui/sonner";
import { StorageNotice } from "@/components/site/StorageNotice";
import { MotionRoot } from "@/components/motion/MotionRoot";

// Interface: DM Sans, restrained, precise, engineered.
const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
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

// Canonical site URL. Prefer the explicit env var; otherwise the production
// domain (NOT the per-deployment Vercel URL, which is auth-walled and makes
// crawlers like Twitterbot fail → gray preview).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  /* Every route resolves its own canonical against metadataBase. Without
     this, the same page reachable on a preview domain and on straypaw.org
     competes with itself in the index. */
  alternates: { canonical: "./" },
  title: "StrayPaw, Every street dog, on the record",
  description:
    "A permanent identity and a shared record for India's street animals, so NGOs, municipalities and funders work from the same data instead of three different notebooks.",
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
    title: "StrayPaw, Every street dog, on the record",
    description:
      "A permanent identity and a shared record for India's street animals. One animal, one history, across every organisation that meets it.",
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
    title: "StrayPaw, Every street dog, on the record",
    description:
      "A permanent identity and a shared record for India's street animals. One animal, one history, across every organisation that meets it.",
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
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <StructuredData siteUrl={siteUrl} />
      </head>
      <body className="min-h-dvh font-sans">
        <ThemeProvider>
          {/* Outside AuthProvider so it covers every framer-motion
              component in the tree, including the auth modal itself. */}
          <MotionRoot>
            <AuthProvider>
              <Haptics />
              {/* The boundary is not decoration. Several screens call
                  useSearchParams() — the map, the partner animal list,
                  the new-case form — and a client component that reads
                  it bails out of prerendering. Next requires that bail
                  to happen inside a Suspense boundary, and without one
                  it fails the build while prerendering /_not-found,
                  which inherits this layout.

                  It showed up as an INTERMITTENT failure: the same
                  commit built green twice and red twice, depending on
                  how the client chunks happened to be split. An
                  intermittent build failure is worse than a reliable
                  one — it passes locally and fails on a deploy nobody
                  is watching. The boundary makes it deterministic.

                  Fallback is null: these are whole page bodies, and a
                  skeleton the size of a page flashing before the real
                  one is worse than nothing appearing for the same
                  handful of milliseconds. */}
              <Suspense fallback={null}>
                <Chrome>{children}</Chrome>
              </Suspense>
              <InstallPrompt />
              <StorageNotice />
              <Toaster />
            </AuthProvider>
          </MotionRoot>
        </ThemeProvider>
      </body>
    </html>
  );
}
