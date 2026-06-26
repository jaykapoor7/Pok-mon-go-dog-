import { Mail, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/** Subtle row of contact icons: X, email, personal site. */
export function SocialLinks({ className }: { className?: string }) {
  const items = [
    { label: "X · @jaybuildsvx", href: "https://x.com/jaybuildsvx", icon: <XLogo className="h-4 w-4" /> },
    { label: "Email", href: "mailto:jaykapoor7@outlook.com", icon: <Mail className="h-4 w-4" /> },
    { label: "Website · kapoorjay.com", href: "https://kapoorjay.com", icon: <Globe className="h-4 w-4" /> },
  ];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((i) => (
        <a
          key={i.href}
          href={i.href}
          target={i.href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          aria-label={i.label}
          title={i.label}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-bark-600 transition-colors hover:bg-paw-100 hover:text-paw-700 dark:bg-white/[0.06] dark:text-bark-300 dark:hover:bg-bark-800"
        >
          {i.icon}
        </a>
      ))}
    </div>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
