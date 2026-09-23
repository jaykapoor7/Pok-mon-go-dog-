import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabBar } from "@/components/lab/LabBar";
import "@/components/lab/lab.css";

/* The design lab. Three art directions for StrayPaw, built against a
   snapshot of the live public record. It is exploration, not product:
   it never renders in production, and search engines are told to ignore
   it on every other deployment. */

export const metadata: Metadata = {
  title: "Design lab, StrayPaw",
  robots: { index: false, follow: false, nocache: true },
};

/* Faces are fetched by the browser, not at build time, so the lab adds no
   build-time network dependency to the app. */
const FONTS =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600",
    "family=IBM+Plex+Sans+Condensed:wght@400;500;600",
    "family=IBM+Plex+Mono:wght@400;500",
    "family=Archivo:wdth,wght@62..125,300..900",
    "family=Martian+Mono:wdth,wght@75..112.5,300..600",
    "family=Courier+Prime:ital,wght@0,400;0,700;1,400",
    "family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,300..700",
    "family=Caveat:wght@500;600",
  ].join("&") +
  "&display=swap";

export default function LabLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONTS} precedence="default" />
      {children}
      <LabBar />
    </>
  );
}
