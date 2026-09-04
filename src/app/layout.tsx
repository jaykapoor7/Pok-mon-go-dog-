import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { Chrome } from "@/components/nav/Chrome";
import { ThemeProvider, themeBootScript } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Haptics } from "@/components/ux/Haptics";
import { InstallPrompt } from "@/components/ux/InstallPrompt";

// Interface: DM Sans — restrained, precise, engineered.
const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Display: Instrument Serif — editorial weight for headlines.
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Data: DM Mono — record IDs, coordinates, telemetry.
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
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.kapoorjay.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "StrayPaw — Every street dog, on the record",
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
    title: "StrayPaw — Every street dog, on the record",
    description:
      "A permanent identity and a shared record for India's street animals. One animal, one history, across every organisation that meets it.",
    type: "website",
    siteName: "StrayPaw",
    url: siteUrl,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw — Every street dog, on the record",
    description:
      "A permanent identity and a shared record for India's street animals. One animal, one history, across every organisation that meets it.",
    /* Next emitted twitter:image:alt and twitter:image:type from the generated
       OG route but no twitter:image itself, which left X with a malformed card
       and no preview. Naming the image explicitly fixes it. */
    images: [`${siteUrl}/opengraph-image`],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StrayPaw",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ThemeProvider>
          <AuthProvider>
            <Haptics />
            <Chrome>{children}</Chrome>
            <InstallPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
