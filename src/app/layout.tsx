import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { FloatingTopBar } from "@/components/nav/FloatingTopBar";
import { ThemeProvider, themeBootScript } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw Delhi — Every dog has a story",
    description:
      "A community map for Delhi's street dogs. Spot a dog, snap a photo, help track feeding, vaccination & rescue.",
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
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ThemeProvider>
          <AuthProvider>
            <FloatingTopBar />
            <main>{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
