import type { Metadata } from "next";

/* The rebuild, in progress. Sample data only; kept out of search engines until it replaces the current app. */
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function NextLayout({ children }: { children: React.ReactNode }) { return children; }
