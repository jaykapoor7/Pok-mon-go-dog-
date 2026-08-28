import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { label: "What we do", href: "/what-we-do" },
  { label: "Our journey", href: "/journey" },
  { label: "Partnerships", href: "/partnerships" },
  { label: "Contact", href: "/contact" },
];

/** Floating "bubble" nav shared across the marketing surface. */
export function MarketingNav() {
  return (
    <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4">
      <nav className="no-scrollbar glass flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-black/[0.06] py-1.5 pl-2 pr-1.5 shadow-card dark:border-white/10 sm:gap-1">
        <Link href="/" aria-label="StrayPaw" className="shrink-0 px-1">
          {/* wordmark on desktop, compact mark on phones so the links fit up top */}
          <Logo size="sm" className="hidden sm:inline-flex" />
          <Logo size="sm" showWordmark={false} className="sm:hidden" />
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          {LINKS.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium text-bark-600 transition-colors hover:bg-black/[0.05] hover:text-bark-900 dark:text-bark-300 dark:hover:bg-white/[0.06] dark:hover:text-bark-50 sm:px-3 sm:text-sm"
            >
              {n.label}
            </Link>
          ))}
        </div>
        <Link href="/map" className="btn-primary shrink-0 px-3 py-2 text-[13px] sm:px-4 sm:text-sm">
          Open <ArrowRight className="hidden h-4 w-4 sm:block" />
        </Link>
      </nav>
    </div>
  );
}
