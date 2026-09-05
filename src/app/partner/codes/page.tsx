import { InviteCodesClient } from "@/components/partner/InviteCodesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team and codes, StrayPaw Partner" };

export default function PartnerCodesPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Team and codes
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          Everyone you add gets six characters of their own. They type those on
          StrayPaw to get in, with no account to create. Staff codes open this
          dashboard; volunteer codes only attribute reports to their name.
        </p>
      </header>
      <InviteCodesClient />
    </div>
  );
}
