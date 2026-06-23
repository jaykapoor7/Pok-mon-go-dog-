import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";

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

export const metadata: Metadata = {
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
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-dvh font-sans">
        <TopBar />
        <main className="pb-24 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
