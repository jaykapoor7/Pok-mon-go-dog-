import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AppShell } from "@/components/app/AppShell";
import { DeskHeader } from "@/components/app/DeskHeader";
import { BackLink } from "@/components/app/BackLink";
import "@/components/site/site.css";
import "./shell.css";

/** A shared editorial shell for the quieter public pages and policies. */
export function MarketingShell({
  eyebrow,
  title,
  intro,
  wide,
  children,
  inApp = false,
}: {
  /** Render inside the app frame (sidebar, ground, cards) instead of the site chrome. */
  inApp?: boolean;
  eyebrow?: string;
  title: string;
  intro?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  if (inApp) return (
    <AppShell>
      <div className="sp ms ms-inapp">
        <DeskHeader kicker={eyebrow} title={title} lede={intro} />
        <div className="ms-body">{children}</div>
      </div>
    </AppShell>
  );
  return (
    <div className="sp ms">
      <SiteHeader />
      <main className={wide ? "ms-main is-wide" : "ms-main"}>
        <header className="ms-head">
          <div className="ms-copy">
            <BackLink fallback="/" />
            {eyebrow && <p className="ms-kicker">{eyebrow}</p>}
            <h1>{title}</h1>
            {intro && <p className="ms-intro">{intro}</p>}
          </div>
          <div className="ms-geometry" aria-hidden>
            <span className="is-a" />
            <span className="is-b" />
            <span className="is-c" />
            <i />
            <b>record · place · source</b>
          </div>
        </header>
        <div className="ms-body">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
