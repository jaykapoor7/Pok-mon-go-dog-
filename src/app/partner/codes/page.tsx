import { InviteCodesClient } from "@/components/partner/InviteCodesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Volunteer codes, StrayPaw Partner" };

export default function PartnerCodesPage() {
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Volunteer codes
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          Field volunteers report using a code and their name, with no account
          to create. Their reports arrive here attributed to them.
        </p>
      </header>
      <InviteCodesClient />
    </div>
  );
}
