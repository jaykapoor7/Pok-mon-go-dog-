"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PlusCircle, Images, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: Map },
  { href: "/report", label: "Report", icon: PlusCircle, primary: true },
  { href: "/feed", label: "Feed", icon: Images },
  { href: "/dashboard", label: "NGO", icon: LayoutDashboard },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden safe-bottom">
      <div className="mx-3 mb-3 glass rounded-3xl shadow-card flex items-end justify-around px-2 py-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="relative -mt-7"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paw-500 text-white shadow-warm ring-4 ring-paw-50 active:scale-95 transition-transform">
                  <Icon className="h-7 w-7" />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl text-[10px] font-medium transition-colors",
                active ? "text-paw-600" : "text-bark-400"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-paw-100")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
