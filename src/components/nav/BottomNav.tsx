"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Map as MapIcon, LayoutGrid, Plus, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * meowmbai-style bottom navigation: a floating pill with the core features.
 * Map · Feed · Spot (report, login-gated) · NGO.
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { requireAuth } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5 shadow-pop">
        <Tab href="/" label="Map" icon={MapIcon} active={isActive("/")} />
        <Tab href="/feed" label="Feed" icon={LayoutGrid} active={isActive("/feed")} />
        <button
          onClick={() => requireAuth(() => router.push("/report"))}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-semibold transition-colors",
            isActive("/report")
              ? "bg-paw-500 text-white"
              : "text-bark-600 hover:bg-black/[0.04] dark:text-bark-300 dark:hover:bg-white/[0.06]"
          )}
        >
          <Plus className="h-5 w-5" />
          Spot
        </button>
        <Tab href="/dashboard" label="NGO" icon={LayoutDashboard} active={isActive("/dashboard")} />
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof MapIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-[11px] font-semibold transition-colors",
        active
          ? "bg-paw-500 text-white"
          : "text-bark-600 hover:bg-black/[0.04] dark:text-bark-300 dark:hover:bg-white/[0.06]"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
