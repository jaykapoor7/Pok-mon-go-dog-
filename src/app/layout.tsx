import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { FloatingTopBar } from "@/components/nav/FloatingTopBar";
import { BottomNav } from "@/components/nav/BottomNav";
import { ThemeProvider, themeBootScript } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DemoModeProvider } from "@/components/demo/DemoModeProvider";
import { Haptics } from "@/components/ux/Haptics";
import { InstallPrompt } from "@/components/ux/InstallPrompt";

// Body / UI text: a clean, restrained sans.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Headings: Fraunces — a warm, distinctive display serif that gives StrayPaw
// its own editorial personality (and reads great on the olive palette).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

// Canonical site URL. Prefer the explicit env var; otherwise the production
// domain (NOT the per-deployment Vercel URL, which is auth-walled and makes
// crawlers like Twitterbot fail → gray preview).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.kapoorjay.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "StrayPaw — Open-sourcing stray-dog care",
  description:
    "An open, community-run map for India's street dogs — anyone can track, report and care. Coverage and care stats NGOs usually keep closed, opened up for the people, by the people.",
  keywords: [
    "street dogs",
    "India",
    "stray dogs",
    "animal welfare",
    "open source",
    "community",
    "dog map",
    "NGO",
    "feeding",
    "sterilisation",
  ],
  // og:image + twitter:image are provided by the generated app/opengraph-image.tsx
  // (absolute URL via metadataBase), so no static image is referenced here.
  openGraph: {
    title: "StrayPaw — Open-sourcing stray-dog care",
    description:
      "An open, community-run map for India's street dogs. Transparent care + coverage data, for the people, by the people.",
    type: "website",
    siteName: "StrayPaw",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw — Open-sourcing stray-dog care",
    description:
      "An open, community-run map for India's street dogs. The care stats NGOs keep closed — opened up, for the people, by the people.",
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
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ThemeProvider>
          <AuthProvider>
            <DemoModeProvider>
              <Haptics />
              <FloatingTopBar />
              <main className="lg:pl-60">{children}</main>
              <BottomNav />
              <InstallPrompt />
            </DemoModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
