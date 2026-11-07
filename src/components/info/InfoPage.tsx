import { MarketingShell } from "@/components/marketing/MarketingShell";
import "./info.css";


export function InfoPage({
  title,
  updated,
  eyebrow = "StrayPaw policy",
  children,
}: {
  title: string;
  updated?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <MarketingShell eyebrow={eyebrow} title={title} intro={updated ? `Last updated ${updated}` : undefined}>
      <div className="info-prose">
        {children}
      </div>
    </MarketingShell>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2>
      {children}
    </h2>
  );
}
