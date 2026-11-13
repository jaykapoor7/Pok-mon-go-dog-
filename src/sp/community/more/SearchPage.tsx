/* ════════════════════════════════════════════════════════════════════
   Search (decision 037): one query across what the visitor is allowed to
   see: cities, places, animals by StrayPaw tag or given name, organisa-
   tions, programmes and lessons. Cases are private to organisations and
   are searched inside NGO Work, never here.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Search } from "lucide-react";
import { Empty, Head, Page, Panel, Row, Rows, Section } from "@/ws/kit";
import "./more.css";

export type Hit = { kind: string; title: string; detail: string; href: string };

export function SearchPage({ q, groups }: { q: string; groups: { kind: string; hits: Hit[] }[] }) {
  const n = groups.reduce((a, g) => a + g.hits.length, 0);
  const shown = groups.filter((g) => g.hits.length);
  return (
    <Page width="narrow">
      <Head title="Search"
        sum={<>{q.length < 3 ? "Type at least three letters." : n ? <><b>{n}</b> result{n === 1 ? "" : "s"} for “{q}”.</> : `Nothing on the public record matches “${q}”.`} Organisation members search their own cases inside <Link className="cmo-link" href="/ngo">NGO Work</Link>.</>} />
      <form action="/search" className="cmo-search" role="search">
        <label className="k-search"><Search size={14} aria-hidden /><input name="q" type="search" defaultValue={q} placeholder="A city, a neighbourhood, a StrayPaw tag, an organisation" aria-label="Search" autoFocus={!q} /></label>
        <button type="submit" className="k-btn is-primary"><span>Search</span></button>
      </form>
      {q.length >= 3 && !n ? <Panel><Empty title="No match on the public record">Try a city, a neighbourhood, a StrayPaw tag or an organisation&rsquo;s name. That says what has been shared, not what has happened.</Empty></Panel> : null}
      {shown.map((g) => (
        <Section key={g.kind} title={g.kind} count={g.hits.length}>
          <Panel><Rows label={g.kind}>{g.hits.map((h) => <Row key={h.href + h.title} href={h.href} title={h.title} meta={h.detail} />)}</Rows></Panel>
        </Section>
      ))}
    </Page>
  );
}
