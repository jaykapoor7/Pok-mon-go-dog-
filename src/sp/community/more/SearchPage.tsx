/* ════════════════════════════════════════════════════════════════════
   Search (decision 037): one query across what the visitor is allowed to
   see: cities, places, animals by StrayPaw tag or given name, organisa-
   tions, programmes and lessons. Cases are private to organisations and
   are searched inside NGO Work, never here.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Search } from "lucide-react";
import "./more.css";

export type Hit = { kind: string; title: string; detail: string; href: string };

export function SearchPage({ q, groups }: { q: string; groups: { kind: string; hits: Hit[] }[] }) {
  const n = groups.reduce((a, g) => a + g.hits.length, 0);
  return (
    <div className="mo">
      <header className="mo-head">
        <p className="k">Search</p>
        <form action="/search" className="se-form" role="search">
          <label className="search se-field"><Search size={18} aria-hidden /><input name="q" defaultValue={q} placeholder="A city, a neighbourhood, a StrayPaw tag, an organisation" aria-label="Search" autoFocus={!q} /></label>
          <button type="submit" className="btn is-ink">Search</button>
        </form>
        <p className="small">{q.length < 3 ? "Type at least three letters." : n ? `${n} result${n === 1 ? "" : "s"} for “${q}”.` : `Nothing on the public record matches “${q}”.`} Organisation members search their own cases inside <Link className="link" href="/ngo">NGO Work</Link>.</p>
      </header>
      <div className="se-groups">
        {groups.filter((g) => g.hits.length).map((g) => (
          <section key={g.kind} aria-label={g.kind}>
            <h2 className="se-k">{g.kind}</h2>
            <ul>{g.hits.map((h) => <li key={h.href + h.title}><Link href={h.href}><b>{h.title}</b><small>{h.detail}</small></Link></li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}
