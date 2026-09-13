import type { ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════════
   The console page.

   Every screen in the partner console used to build its own header. The
   same Tailwind string — `text-xl font-semibold tracking-tight
   text-bark-900 dark:text-bark-50` — was typed out on ten different
   pages, the overview used a different one again, and the actions beside
   it were laid out slightly differently each time. That is the whole
   reason the console reads as assembled rather than designed: not one
   bad screen, but ten screens that each made the same decisions
   independently and landed a few pixels apart.

   So there is one header now, and it is this. A page supplies what it
   is about; it does not supply how that looks.

   THE SHAPE OF IT follows the register, which is what this product
   actually is. A tracked mono kicker names the section — the way a form
   or a survey instrument labels which part of the ledger you are in —
   then the title, then one line saying what the screen is for. A
   hairline closes the header off.

   NO CARD. The header is not boxed, because a box around a page title
   says "this title is a separate object from its page", which is false.
   A rule and space do the same work and cost no visual weight, which is
   the rule this product's surfaces follow everywhere.

   ON A PHONE the actions drop below the title and go full width rather
   than crushing the heading into a narrow column — the console is used
   one-handed outdoors, and a 90px-wide title next to two buttons is the
   layout that fails first.
   ════════════════════════════════════════════════════════════════════ */

export function ConsolePage({
  kicker,
  title,
  lede,
  actions,
  tabs,
  children,
  /* A record screen (one animal, one case) is a document rather than a
     dashboard, so it gets the reading measure instead of the full width. */
  width = "full",
}: {
  kicker?: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  width?: "full" | "read";
}) {
  return (
    <div className={`cpage${width === "read" ? " cpage-read" : ""}`}>
      <header className="cpage-head">
        <div className="cpage-headline">
          <div className="cpage-titling">
            {kicker && <span className="cpage-kicker">{kicker}</span>}
            <h1>{title}</h1>
            {lede && <p className="cpage-lede">{lede}</p>}
          </div>
          {actions && <div className="cpage-actions">{actions}</div>}
        </div>
        {tabs}
      </header>
      {children}
    </div>
  );
}

/* A section inside a console page. Separated by a rule and space rather
   than by being put in a box — see the note above. `bare` drops the rule
   for the first section, which would otherwise double the header's. */
export function ConsoleSection({
  title,
  meta,
  actions,
  bare,
  children,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`csect${bare ? " csect-bare" : ""}`}>
      {(title || actions) && (
        <div className="csect-head">
          <div>
            {title && <h2>{title}</h2>}
            {meta && <p className="csect-meta">{meta}</p>}
          </div>
          {actions && <div className="csect-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
