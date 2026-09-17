"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/rescues", label: "Rescues" },
  { href: "/outcomes", label: "Completed" },
  { href: "/timeline", label: "Timeline" },
];

export function CommunityRecordTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-black/[.09]" aria-label="Community records">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${active ? "border-[#2457ce] text-[#2457ce]" : "border-transparent text-[#536071] hover:text-[#0b1e3d]"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
