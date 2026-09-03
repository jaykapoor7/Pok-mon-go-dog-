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
  title: "StrayPaw — Make care measurable",
  description:
    "The infrastructure connecting funding, evidence and action across India's street-animal ecosystem. Companies fund the questions. NGOs find the answers on the ground. StrayPaw turns those answers into action.",
  keywords: [
    "street animals",
    "India",
    "CSR",
    "impact measurement",
    "evidence layer",
    "animal welfare data",
    "NGO infrastructure",
    "field studies",
    "civic infrastructure",
    "intervention tracking",
  ],
  // og:image + twitter:image are provided by the generated app/opengraph-image.tsx
  // (absolute URL via metadataBase), so no static image is referenced here.
  openGraph: {
    title: "StrayPaw — Make care measurable",
    description:
      "The system connecting street-level evidence to the people who can act. Fund the question. Measure the answer.",
    type: "website",
    siteName: "StrayPaw",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw — Make care measurable",
    description:
      "The system connecting street-level evidence to the people who can act. Fund the question. Measure the answer.",
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
