import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { Chrome } from "@/components/nav/Chrome";
import { ThemeProvider, themeBootScript } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Haptics } from "@/components/ux/Haptics";
import { InstallPrompt } from "@/components/ux/InstallPrompt";

// Body / UI text: a clean, restrained sans.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Headings + wordmark: Plus Jakarta Sans, a modern, premium geometric sans that
// pairs cleanly with Inter and suits the light blue-and-white brand.
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "500", "600", "700", "800"],
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
  title: "StrayPaw, Open-sourcing stray-animal care",
  description:
    "An open, community-run map for India's street animals, anyone can track, report and care. Coverage and care stats NGOs usually keep closed, opened up for the people, by the people.",
  keywords: [
    "street animals",
    "stray animals",
    "India",
    "street dogs",
    "animal welfare",
    "open source",
    "community",
    "animal map",
    "NGO",
    "feeding",
    "sterilisation",
  ],
  // og:image + twitter:image are provided by the generated app/opengraph-image.tsx
  // (absolute URL via metadataBase), so no static image is referenced here.
  openGraph: {
    title: "StrayPaw, Open-sourcing stray-animal care",
    description:
      "An open, community-run map for India's street animals. Transparent care + coverage data, for the people, by the people.",
    type: "website",
    siteName: "StrayPaw",
  },
  twitter: {
    card: "summary_large_image",
    title: "StrayPaw, Open-sourcing stray-animal care",
    description:
      "An open, community-run map for India's street animals. The care stats NGOs keep closed, opened up, for the people, by the people.",
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
  themeColor: "#3b7de6",
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
      className={`${inter.variable} ${display.variable}`}
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
