import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import "./site.css";
import "./sitepage.css";

/* ════════════════════════════════════════════════════════════════════
   Standalone chrome for the pages behind the site header.

   Evidence, Volunteer and What an area needs were all being rendered
   inside the console: a sidebar, a rail, a role picker and a search box
   wrapped around what is really a public page. Clicking "Evidence" in the
   header took you *into the app*, which is not what a header link should
   do, and there was no way back out to the site except the browser.

   These are documents. They get a header, a wide reading column on the
   console's cool ground, and the site footer — the same furniture as
   Mission and For NGOs, without the marketing pages' dark hero, because
   the request was explicitly for light grounds.

   The wrapper keeps the `spa` class so the console's type scale and
   component styles still apply to page bodies written against them; `sx`
   then undoes the one thing the console needs and a document must not
   have — a viewport-locked, non-scrolling height.
   ════════════════════════════════════════════════════════════════════ */

export function SitePage({
  kicker,
  title,
  lede,
  actions,
  children,
  width = "wide",
  divider = true,
}: {
  /** Small label above the title. */
  kicker?: string;
  title: ReactNode;
  lede?: ReactNode;
  /** Buttons or links that sit beside the title on desktop. */
  actions?: ReactNode;
  children: ReactNode;
  /** `read` narrows the column for prose-heavy pages. */
  width?: "wide" | "read";
  /** Hairline closing the opening block. Off when the first section
      below draws its own rule, so the two do not stack. */
  divider?: boolean;
}) {
  return (
    <div className="sp spa sx">
      <SiteHeader />
      <main className={`sx-main sx-${width}`}>
        {(kicker || title || lede) && (
          <header className={`sx-intro${divider ? "" : " no-rule"}`}>
            {kicker && <span className="sx-kicker spa-mono">{kicker}</span>}
            <div className="sx-intro-row">
              <h1>{title}</h1>
              {actions && <div className="sx-intro-actions">{actions}</div>}
            </div>
            {lede && <p className="sx-lede">{lede}</p>}
          </header>
        )}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
