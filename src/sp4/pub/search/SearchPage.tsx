/* Search (/search): one query across what a visitor is allowed to see:
   cities, places, animals by StrayPaw tag or given name, organisations,
   programmes and lessons. Cases are private to organisations and are
   searched inside the organisation's workspace, never here. */

import Link from "next/link";
import { Search } from "lucide-react";
import { Body, Empty, Head, List, Row, Sec } from "../kit";

export type Hit = { kind: string; title: string; detail: string; href: string };

export function SearchPage({ q, groups, failed = [] }: { q: string; groups: { kind: string; hits: Hit[] }[]; failed?: string[] }) {
  const n = groups.reduce((a, g) => a + g.hits.length, 0);
  const shown = groups.filter((g) => g.hits.length);
  return (
    <>
      <Head title="Search"
        sum={<>{q.length < 3 ? "Type at least three letters." : n ? <><b>{n}</b> {n === 1 ? "result" : "results"} for “{q}”.</> : `Nothing on the public record matches “${q}”.`} Organisation members search their own cases in their <Link className="pb-link" href="/sign-in?next=/home">workspace</Link>.</>}>
        <form action="/search" className="sx-form" role="search">
          <label className="sx-q"><Search size={16} aria-hidden /><span className="pb-sr">Search the public record</span><input name="q" type="search" defaultValue={q} placeholder="A city, a neighbourhood, a StrayPaw tag, an organisation" autoFocus={!q} enterKeyHint="search" /></label>
          <button type="submit" className="pb-btn is-primary">Search</button>
        </form>
      </Head>
      <Body narrow>
        {failed.length > 0 && <p className="pb-ack is-offline" role="status">Not read just now: {failed.join(", ").toLowerCase()}. Results from those may be missing; that is not the same as none.</p>}
        {q.length >= 3 && !n ? <Empty title="No match on the public record">Try a city, a neighbourhood, a StrayPaw tag or an organisation&rsquo;s name. That says what has been shared, not what has happened.</Empty> : null}
        {shown.map((g) => (
          <Sec key={g.kind} title={g.kind} count={g.hits.length}>
            <List label={g.kind}>{g.hits.map((h) => <Row key={h.href + h.title} href={h.href} title={h.title} meta={h.detail} />)}</List>
          </Sec>
        ))}
      </Body>
    </>
  );
}
