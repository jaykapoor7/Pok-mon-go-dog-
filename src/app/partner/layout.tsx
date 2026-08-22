import { PartnerRail } from "@/components/partner/PartnerRail";
import { PartnerGate } from "@/components/partner/PartnerGate";

export const dynamic = "force-dynamic";

// The Partner OS — a dedicated operational workspace with its own rail, gated
// to verified organization members. Consumer chrome is suppressed for
// /partner/* in src/components/nav/Chrome.tsx.
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper dark:bg-ink">
      <PartnerRail />
      <div className="pt-14 lg:pl-56 lg:pt-0">
        <PartnerGate title="Partner workspace">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">{children}</div>
        </PartnerGate>
      </div>
    </div>
  );
}
