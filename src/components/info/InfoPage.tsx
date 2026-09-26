import { MarketingShell } from "@/components/marketing/MarketingShell";
import "./info.css";


export function InfoPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <MarketingShell eyebrow="StrayPaw policy" title={title} intro={updated ? `Last updated ${updated}` : undefined}>
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
