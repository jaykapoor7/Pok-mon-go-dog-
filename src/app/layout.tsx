import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { FloatingTopBar } from "@/components/nav/FloatingTopBar";
import { BottomNav } from "@/components/nav/BottomNav";
import { ThemeProvider, themeBootScript } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DemoModeProvider } from "@/components/demo/DemoModeProvider";
import { Haptics } from "@/components/ux/Haptics";

// One restrained family across the app (regular + semibold). Display tier is
// the same family at a heavier weight — premium, minimal, no font clutter.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Canonical site URL. Prefer the explicit env var; otherwise the production
// domain (NOT the per-deployment Vercel URL, which is auth-walled and makes
// crawlers like Twitterbot fail → gray preview).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.kapoorjay.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "StrayPaw — Every dog has a story",
  description:
    "A community-powered map to discover, track and care for India's street dogs. Report sightings, follow dog profiles, and help NGOs feed, vaccinate and sterilise.",
  keywords: [
    "street dogs",
    "India",
    "stray dogs",
    "animal welfare",
    "dog map",
    "NGO",
    "feeding",
    "sterilisation",
  ],
  // og:image + twitter:image are provided by the generated app/opengraph-image.tsx
  // (absolute URL via metadataBase), so no static image is referenced here.
  openGraph: {
    title: "StrayPaw — Every dog has a story",
    description:
      "Discover, explore and upload sightings of India's street dogs. Build a living database of every good boy and girl in your city.",
    type: "website",
    siteName: "StrayPaw",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw — Every dog has a story",
    description:
      "A community map for India's street dogs. Spot a dog, snap a photo, help track feeding, vaccination & rescue.",
  },
};

export const viewport: Viewport = {
  themeColor: "#6E7A45",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ThemeProvider>
          <AuthProvider>
            <DemoModeProvider>
              <Haptics />
              <FloatingTopBar />
              <main className="lg:pl-20">{children}</main>
              <BottomNav />
            </DemoModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
