"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";

const DEMO_MODE = !isSupabaseConfigured;

const LINKS = [
  { href: "/map", label: "Map" },
  { href: "/feed", label: "Feed" },
  { href: "/report", label: "Report a Dog" },
  { href: "/dashboard", label: "NGO Dashboard" },
];

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-paw-500 text-white shadow-warm group-hover:rotate-12 transition-transform">
            <PawPrint className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            StrayPaw
            <span className="text-paw-500"> Delhi</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-paw-100 text-paw-700"
                    : "text-bark-600 hover:bg-white hover:text-bark-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/report" className="btn-primary ml-2 px-4 py-2 text-sm">
            <MapPin className="h-4 w-4" />
            Report
          </Link>
        </nav>

        {DEMO_MODE && (
          <span className="hidden lg:inline-flex chip bg-paw-100 text-paw-700 ml-3">
            ● Demo data
          </span>
        )}
      </div>
    </header>
  );
}
