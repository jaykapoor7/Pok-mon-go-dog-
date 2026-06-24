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

// One restrained family across the app (regular + semibold). Display tier is
// the same family at a heavier weight — premium, minimal, no font clutter.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "StrayPaw Delhi — Every dog has a story",
  description:
    "A community-powered map to discover, track and care for Delhi's street dogs. Report sightings, follow dog profiles, and help NGOs feed, vaccinate and sterilise.",
  keywords: [
    "street dogs",
    "Delhi",
    "stray dogs",
    "animal welfare",
    "dog map",
    "NGO",
    "feeding",
    "sterilisation",
  ],
  openGraph: {
    title: "StrayPaw Delhi — Every dog has a story",
    description:
      "Discover, explore and upload sightings of Delhi's street dogs. Build a living database of every good boy and girl in the city.",
    type: "website",
    siteName: "StrayPaw Delhi",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "StrayPaw Delhi — Every dog has a story. Start seeing them.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw Delhi — Every dog has a story",
    description:
      "A community map for Delhi's street dogs. Spot a dog, snap a photo, help track feeding, vaccination & rescue.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
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
              <FloatingTopBar />
              <main>{children}</main>
              <BottomNav />
            </DemoModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
