import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const CONTACT_EMAIL = "jaykapoor7@outlook.com";

const LINKS = [
  { label: "What we do", href: "/what-we-do" },
  { label: "Our journey", href: "/journey" },
  { label: "Contact", href: `mailto:${CONTACT_EMAIL}?subject=StrayPaw` },
];

/** Floating "bubble" nav shared across the marketing surface. */
export function MarketingNav() {
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="glass flex items-center gap-1 rounded-full border border-black/[0.06] py-1.5 pl-2 pr-1.5 shadow-card dark:border-white/10">
        <Link href="/" aria-label="StrayPaw" className="px-1.5">
          <Logo size="sm" />
        </Link>
        <div className="mx-1 hidden items-center gap-0.5 sm:flex">
          {LINKS.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-bark-600 transition-colors hover:bg-black/[0.05] hover:text-bark-900 dark:text-bark-300 dark:hover:bg-white/[0.06] dark:hover:text-bark-50"
            >
              {n.label}
            </Link>
          ))}
        </div>
        <Link href="/app" className="btn-primary px-4 py-2 text-sm">
          Open app <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>
    </div>
  );
}
