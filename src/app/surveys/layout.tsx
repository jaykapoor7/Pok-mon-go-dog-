import { AppShell } from "@/components/app/AppShell";
import { PartnerGate } from "@/components/partner/PartnerGate";
import { OrgPlace } from "@/components/app/DeskHeader";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/* A survey opened from the workspace stays in the workspace: the same
   shell, membership gate and organisation place as /partner. Without this
   the survey pages rendered with no chrome at all. */
export default function SurveysLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PartnerGate title="Your organisation">
        <OrgPlace>
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </OrgPlace>
      </PartnerGate>
    </AppShell>
  );
}
