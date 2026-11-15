import Link from "next/link";
import type { ReactNode } from "react";
import { S4Page } from "@/sp4/site/kit";
import { BackLink } from "@/components/app/BackLink";
import "./pub.css";

/* ════════════════════════════════════════════════════════════════════
   The public record kit: the pieces the public record pages (community,
   animals, fundraisers, the Academy, search and the city record) are
   built from, on the public site's page (SiteHeader, SiteFooter, Inter,
   the white-and-blue ground).

   Dense, not decorated: a short page head, sections with a plain
   heading, lists divided by one hairline, a soft fill for anything that
   is a surface. No component here holds state, so server pages and
   client components share it.
   ════════════════════════════════════════════════════════════════════ */

type Tone = "plain" | "blue" | "green" | "amber" | "flame";

/** A public record page: the site header and footer around one column. */
export function PubPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <S4Page close={false} className={`pb ${className}`.trim()}>{children}</S4Page>;
}

/** The opening of a page: where you are, what this is, one or two actions. */
export function Head({ eyebrow, title, sum, actions, back, children }: { eyebrow?: ReactNode; title: ReactNode; sum?: ReactNode; actions?: ReactNode; back?: string; children?: ReactNode }) {
  return (
    <header className={`s4-wrap pb-head${back ? " has-back" : ""}`}>
      {back && <BackLink fallback={back} />}
      {eyebrow && <p className="pb-eyebrow">{eyebrow}</p>}
      <h1 className="pb-h1">{title}</h1>
      {sum && <p className="pb-sum">{sum}</p>}
      {actions && <div className="pb-actions">{actions}</div>}
      {children}
    </header>
  );
}

/** The page body column. */
export function Body({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`s4-wrap pb-body${narrow ? " is-narrow" : ""}`}>{children}</div>;
}

/** Main column with a side column beside it (below it on a phone). */
export function Split({ side, children, sideFirst = false }: { side: ReactNode; children: ReactNode; sideFirst?: boolean }) {
  return <div className={`pb-split${sideFirst ? " is-side-first" : ""}`}><div className="pb-main">{children}</div><aside className="pb-side">{side}</aside></div>;
}

/** A section under a plain heading, with its count, a note and one action. */
export function Sec({ title, count, note, action, id, children }: { title: ReactNode; count?: ReactNode; note?: ReactNode; action?: ReactNode; id?: string; children: ReactNode }) {
  const hid = id ? `${id}-h` : undefined;
  return (
    <section className="pb-sec" id={id} aria-labelledby={hid}>
      <div className="pb-sec-h">
        <div>
          <h2 id={hid}>{title}{count !== undefined && count !== null && count !== "" ? <span className="pb-count">{count}</span> : null}</h2>
          {note && <p className="pb-sec-note">{note}</p>}
        </div>
        {action && <div className="pb-sec-a">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** A section that folds away (a native disclosure, keyboard and screen reader ready). */
export function Fold({ title, count, open = false, children }: { title: ReactNode; count?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="pb-fold" open={open}>
      <summary><span>{title}{count !== undefined && count !== null ? <span className="pb-count">{count}</span> : null}</span></summary>
      <div className="pb-fold-b">{children}</div>
    </details>
  );
}

/** A list of rows divided by one hairline. */
export function List({ label, children }: { label?: string; children: ReactNode }) {
  return <ul className="pb-list" aria-label={label}>{children}</ul>;
}

/** One row: an optional mark, a title with one line of detail, and what sits at the end. A row with href is one link. */
export function Row({ title, meta, end, href, icon, tone, external = false }: { title: ReactNode; meta?: ReactNode; end?: ReactNode; href?: string; icon?: ReactNode; tone?: Tone; external?: boolean }) {
  const inner = (
    <>
      {icon && <span className={`pb-row-i${tone ? ` is-${tone}` : ""}`} aria-hidden>{icon}</span>}
      <span className="pb-row-t"><b>{title}</b>{meta && <small>{meta}</small>}</span>
      {end && <span className="pb-row-e">{end}</span>}
    </>
  );
  if (!href) return <li><div className="pb-row">{inner}</div></li>;
  if (external || /^(https?:|tel:|mailto:)/.test(href)) return <li><a className="pb-row is-link" href={href} {...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inner}</a></li>;
  return <li><Link className="pb-row is-link" href={href}>{inner}</Link></li>;
}

/** Label and value pairs. */
export function Props({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return <dl className="pb-props">{items.map((x, i) => <div key={i}><dt>{x.label}</dt><dd>{x.value}</dd></div>)}</dl>;
}

/** A few real figures, each with its unit. */
export function Figs({ items, label }: { items: { label: ReactNode; value: ReactNode; note?: ReactNode }[]; label?: string }) {
  return <dl className="pb-figs" aria-label={label}>{items.map((x, i) => <div key={i}><dt>{x.label}</dt><dd>{x.value}</dd>{x.note && <small>{x.note}</small>}</div>)}</dl>;
}

export function Tag({ tone = "plain", children }: { tone?: Tone; children: ReactNode }) {
  /* k-tag: the hook the earlier pages carried, kept so existing checks still find a status tag. */
  return <span className={`pb-tag k-tag is-${tone}`}>{children}</span>;
}

/** A sentence that needs to be read before the rest, with one action. */
export function Note({ tone = "plain", action, children, role }: { tone?: Tone; action?: ReactNode; children: ReactNode; role?: "status" | "alert" }) {
  return <div className={`pb-note is-${tone}`} role={role}><div>{children}</div>{action && <div className="pb-note-a">{action}</div>}</div>;
}

/** An honest empty state: one sentence of fact and, where there is one, the next action. */
export function Empty({ title, children, action, alert = false }: { title: ReactNode; children?: ReactNode; action?: ReactNode; alert?: boolean }) {
  return <div className="pb-empty" role={alert ? "alert" : undefined}><h3>{title}</h3>{children && <p>{children}</p>}{action && <div className="pb-actions">{action}</div>}</div>;
}

/** A soft surface for forms and grouped controls. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`pb-panel ${className}`.trim()}>{children}</div>;
}

type BtnProps = { variant?: "primary" | "line" | "quiet" | "flame"; small?: boolean; icon?: ReactNode; children: ReactNode; className?: string };
/** A link that looks like a button. */
export function LinkBtn({ href, variant = "line", small, icon, children, className = "", external = false, ...rest }: BtnProps & { href: string; external?: boolean } & Record<string, unknown>) {
  const cls = `pb-btn is-${variant}${small ? " is-s" : ""} ${className}`.trim();
  if (external || /^https?:/.test(href)) return <a className={cls} href={href} target="_blank" rel="noopener noreferrer" {...rest}>{icon}{children}</a>;
  return <Link className={cls} href={href} {...rest}>{icon}{children}</Link>;
}
/** A button. */
export function Btn({ variant = "line", small, icon, children, className = "", type = "button", ...rest }: BtnProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`pb-btn is-${variant}${small ? " is-s" : ""} ${className}`.trim()} {...rest}>{icon}{children}</button>;
}

/** Choose one of a few views (underlined text, one pressed). */
export function Lanes<K extends string>({ label, value, onChange, lanes }: { label: string; value: K; onChange: (k: K) => void; lanes: { id: K; label: ReactNode; count?: number | null }[] }) {
  return (
    <div className="pb-lanes" role="group" aria-label={label}>
      {lanes.map((l) => <button key={l.id} type="button" aria-pressed={value === l.id} onClick={() => onChange(l.id)}>{l.label}{l.count !== undefined && l.count !== null ? <span className="pb-count">{l.count}</span> : null}</button>)}
    </div>
  );
}

/** A row of tools above a list: filters on the left, search or export on the right. */
export function Tools({ children, end }: { children?: ReactNode; end?: ReactNode }) {
  return <div className="pb-tools"><div className="pb-tools-l">{children}</div>{end && <div className="pb-tools-r">{end}</div>}</div>;
}

/** A form-free search box (the value is held by the caller). */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <label className="pb-search">
      <span className="pb-sr">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

/** A table on a wide screen, a list of labelled rows on a phone. */
export type Col<T> = { key: string; label: string; render: (row: T) => ReactNode; className?: string; primary?: boolean };
export function Table<T>({ label, cols, rows, rowKey, href, empty }: { label: string; cols: Col<T>[]; rows: T[]; rowKey: (row: T) => string; href?: (row: T) => string; empty?: ReactNode }) {
  if (!rows.length) return <>{empty ?? null}</>;
  return (
    <div className="pb-table-wrap" role="region" aria-label={label} tabIndex={0}>
      <table className="pb-table">
        <thead><tr>{cols.map((c) => <th key={c.key} scope="col" className={c.className}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {cols.map((c, i) => {
                const primary = c.primary ?? i === 0;
                const v = c.render(r);
                if (primary) return <th key={c.key} scope="row" className={c.className}>{href ? <Link href={href(r)}>{v}</Link> : v}</th>;
                return <td key={c.key} className={c.className} data-label={c.label}>{v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A write's acknowledgement: what the server answered, never a promise before it does. */
export function Ack({ state, children }: { state: "pending" | "saved" | "failed" | "offline" | "draft"; children: ReactNode }) {
  return <p className={`pb-ack is-${state}`} role={state === "failed" ? "alert" : "status"}>{children}</p>;
}
