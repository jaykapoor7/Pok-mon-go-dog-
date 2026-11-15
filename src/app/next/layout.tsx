import type { Metadata } from "next";
import { LiveProvider } from "@/nx/live";
import { Frame } from "@/nx/Shell";

/* The app's frame is mounted here once, so the sidebar, channels and Kaju stay in place while pages change. */
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function NextLayout({ children }: { children: React.ReactNode }) { return <LiveProvider><Frame>{children}</Frame></LiveProvider>; }
