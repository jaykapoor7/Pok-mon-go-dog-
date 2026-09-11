"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MapPin, Search, X } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   Volunteering routes, filtered.

   The page listed every route with every matching organisation expanded
   at once, around 130 rows of names with no way in. Someone arrives
   knowing one or two things ("I'm in Pune", "I want to help at a
   shelter"), so those are the two filters, plus free text over names and
   places. Counts stay visible so filtering never hides how much exists.
   ════════════════════════════════════════════════════════════════════ */

export type VolOrg = {
  id: string;
  name: string;
  city: string;
  state: string;
  stateCode: string;
  url?: string | null;
};

export type VolRoute = {
  id: string;
  title: string;
  body: string;
  commitment: string;
  orgs: VolOrg[];
};

/* Enough to see the shape of a route without burying the next one. */
const FIRST_SHOWN = 4;

export function VolunteerClient({
  routes,
  states,
}: {
  routes: VolRoute[];
  states: { code: string; name: string }[];
}) {
  const [route, setRoute] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [stateCode, setStateCode] = useState("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return routes
      .filter((r) => route === "all" || r.id === route)
      .map((r) => ({
        ...r,
        orgs: r.orgs.filter((o) => {
          if (stateCode !== "all" && o.stateCode !== stateCode) return false;
          if (!needle) return true;
          return `${o.name} ${o.city} ${o.state}`.toLowerCase().includes(needle);
        }),
      }))
      .filter((r) => r.orgs.length > 0);
  }, [routes, route, stateCode, q]);

  const shown = filtered.reduce((n, r) => n + r.orgs.length, 0);
  const total = routes.reduce((n, r) => n + r.orgs.length, 0);
  const filtering = route !== "all" || stateCode !== "all" || q.trim() !== "";

  function clear() {
    setRoute("all");
    setStateCode("all");
    setQ("");
  }

  return (
    <>
      <div className="vol-filters">
        <div className="vol-search">
          <Search size={14} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search organisation, city or state…"
            aria-label="Search organisations"
            enterKeyHint="search"
            autoComplete="off"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        <label className="vol-select">
          <span className="spa-mono">Work</span>
          <select value={route} onChange={(e) => setRoute(e.target.value)}>
            <option value="all">All routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>

        <label className="vol-select">
          <span className="spa-mono">State</span>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
          >
            <option value="all">Anywhere in India</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="vol-count spa-mono">
        Showing {shown} of {total} listings
        {filtering && (
          <button type="button" onClick={clear} className="vol-clear">
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="spa-empty">
          <h2>No organisations match those filters</h2>
          <p>
            No listed organisation matches this combination. The directory is
            not exhaustive, try a wider state, or clear the filters and browse
            by the kind of work instead.
          </p>
          <button type="button" onClick={clear} className="spa-cta">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="vol-list">
          {filtered.map((r) => {
            /* Every organisation for every route, all at once, made this
               page ten thousand pixels tall on a phone: one card alone ran
               to nearly three screens, and the six routes underneath were
               unreachable without a lot of scrolling past names nobody had
               asked for yet. A few, then the rest on request. */
            const open = expanded.has(r.id);
            const shown = open ? r.orgs : r.orgs.slice(0, FIRST_SHOWN);
            const hidden = r.orgs.length - shown.length;
            return (
            <section className="vol-route" key={r.id}>
              <header>
                <div>
                  <h2>{r.title}</h2>
                  <p>{r.body}</p>
                </div>
                <div className="vol-meta">
                  <span className="spa-mono">Typical commitment</span>
                  <b>{r.commitment}</b>
                  <span className="vol-n spa-mono">
                    {r.orgs.length} organisation{r.orgs.length === 1 ? "" : "s"}
                  </span>
                </div>
              </header>

              <ul className="vol-orgs">
                {shown.map((o) => {
                  const Item = o.url ? "a" : "span";
                  return (
                    <li key={o.id}>
                      <Item
                        {...(o.url
                          ? {
                              href: o.url,
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                      >
                        <b>{o.name}</b>
                        <span className="vol-place">
                          <MapPin size={11} /> {o.city}, {o.state}
                        </span>
                        {o.url && <ExternalLink size={12} />}
                      </Item>
                    </li>
                  );
                })}
              </ul>

              {hidden > 0 && (
                <button
                  type="button"
                  className="vol-more"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.add(r.id);
                      return next;
                    })
                  }
                >
                  Show {hidden} more organisation{hidden === 1 ? "" : "s"}
                </button>
              )}
              {open && r.orgs.length > FIRST_SHOWN && (
                <button
                  type="button"
                  className="vol-more"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.delete(r.id);
                      return next;
                    })
                  }
                >
                  Show fewer
                </button>
              )}
            </section>
            );
          })}
        </div>
      )}
    </>
  );
}
