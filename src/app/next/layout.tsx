import type { Metadata } from "next";
import { LiveProvider } from "@/nx/live";

/* The rebuild, in progress. Kept out of search engines until it replaces the current app. */
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function NextLayout({ children }: { children: React.ReactNode }) { return <LiveProvider>{children}</LiveProvider>; }
