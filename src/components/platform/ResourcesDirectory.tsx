"use client";

import { useState, useEffect, useMemo } from "react";
import { Building2, ExternalLink, Search, X, MapPin } from "lucide-react";
import { ORGS } from "@/lib/platform/orgs";
import { STATES } from "@/lib/platform/geography";
import type { OrgEntry } from "@/lib/platform/orgs";

/* ── Static groupings (computed once at module load) ── */

function groupBy<K extends string>(orgs: OrgEntry[], key: (o: OrgEntry) => K) {
  const m = new Map<K, OrgEntry[]>();
  for (const org of orgs) {
    const k = key(org);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(org);
  }
  return m;
}

const CITY_MAP = groupBy(ORGS, (o) => o.city);
const STATE_MAP = groupBy(ORGS, (o) => o.stateCode);

const CITIES_RANKED = [...CITY_MAP.entries()]
  .map(([city, orgs]) => ({ city, count: orgs.length, stateCode: orgs[0].stateCode }))
  .sort((a, b) => b.count - a.count);

const TOP_CITIES = CITIES_RANKED.slice(0, 9);

const STATES_LIST = [...STATE_MAP.entries()]
  .map(([code, orgs]) => ({
    code,
    name: STATES.find((s) => s.code === code)?.name ?? code,
    count: orgs.length,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

function getStateName(code: string) {
  return STATES.find((s) => s.code === code)?.name ?? code;
}

/* ── Org card ── */

function OrgCard({ org }: { org: OrgEntry }) {
  return (
    <div className="rounded-xl border border-bark-100 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-bark-900">{org.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-bark-400">
            <MapPin className="h-3 w-3 shrink-0" />
            {org.city}
            {org.founded ? ` · Est. ${org.founded}` : ""}
          </p>
        </div>
        {org.url && (
          <a
            href={org.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full p-1.5 text-bark-300 hover:bg-bark-50 hover:text-paw-500"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-bark-600">{org.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {org.focus.map((f) => (
          <span
            key={f}
            className="rounded-full bg-bark-50 px-2 py-0.5 text-[11px] font-medium text-bark-500"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ── */

export function ResourcesDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get("state");
    if (stateParam && STATE_MAP.has(stateParam)) {
      setSelectedStateCode(stateParam);
    }
    const cityParam = params.get("city");
    if (cityParam && CITY_MAP.has(cityParam)) {
      setSelectedCity(cityParam);
    }
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 1) return null;
    return CITIES_RANKED.filter(({ city }) => city.toLowerCase().includes(q));
  }, [searchQuery]);

  // Derive displayed orgs + labels
  const { displayedOrgs, locationLabel, fallbackNote } = useMemo(() => {
    if (selectedCity) {
      const cityOrgs = CITY_MAP.get(selectedCity) ?? [];
      if (cityOrgs.length > 0) {
        return { displayedOrgs: cityOrgs, locationLabel: selectedCity, fallbackNote: null };
      }
      // Fall back to state
      const stateCode = CITIES_RANKED.find((c) => c.city === selectedCity)?.stateCode;
      const stateOrgs = stateCode ? (STATE_MAP.get(stateCode) ?? []) : [];
      return {
        displayedOrgs: stateOrgs,
        locationLabel: selectedCity,
        fallbackNote: stateCode
          ? `No orgs listed for ${selectedCity}. Showing all in ${getStateName(stateCode)}.`
          : null,
      };
    }
    if (selectedStateCode) {
      return {
        displayedOrgs: STATE_MAP.get(selectedStateCode) ?? [],
        locationLabel: getStateName(selectedStateCode),
        fallbackNote: null,
      };
    }
    return { displayedOrgs: [], locationLabel: null, fallbackNote: null };
  }, [selectedCity, selectedStateCode]);

  const hasSelection = selectedCity !== null || selectedStateCode !== null;

  function selectCity(city: string) {
    setSelectedCity(city);
    setSelectedStateCode(null);
    setSearchQuery("");
    pushUrl({ city });
  }

  function selectState(code: string) {
    setSelectedStateCode(code);
    setSelectedCity(null);
    setSearchQuery("");
    pushUrl({ state: code });
  }

  function reset() {
    setSelectedCity(null);
    setSelectedStateCode(null);
    setSearchQuery("");
    pushUrl({});
  }

  function pushUrl(params: { city?: string; state?: string }) {
    const url = new URL(window.location.href);
    url.searchParams.delete("city");
    url.searchParams.delete("state");
    if (params.city) url.searchParams.set("city", params.city);
    if (params.state) url.searchParams.set("state", params.state);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <section id="directory" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-bark-900">
        <Building2 className="h-5 w-5 text-paw-500" />
        Find organisations near you
      </h2>
      <p className="mt-1 text-sm text-bark-400">
        Select your city or state to see relevant organisations.
      </p>

      {/* ── Picker (shown when no selection) ── */}
      {!hasSelection && (
        <div className="mt-5">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
            <input
              type="text"
              placeholder="Search your city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-bark-200 bg-white py-3 pl-10 pr-4 text-sm text-bark-900 placeholder-bark-400 shadow-sm focus:border-paw-400 focus:outline-none focus:ring-2 focus:ring-paw-100"
            />
          </div>

          {/* Search results */}
          {searchResults && searchResults.length > 0 && (
            <div className="mt-1 rounded-xl border border-bark-200 bg-white py-1 shadow-card">
              {searchResults.slice(0, 6).map(({ city, count }) => (
                <button
                  key={city}
                  onClick={() => selectCity(city)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-bark-900 hover:bg-bark-50"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-bark-400" />
                    {city}
                  </span>
                  <span className="text-xs text-bark-400">
                    {count} org{count !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchResults !== null &&
            searchResults.length === 0 &&
            searchQuery.length > 1 && (
              <p className="mt-2 text-sm text-bark-400">
                No organisations found for &ldquo;{searchQuery}&rdquo;.
              </p>
            )}

          {/* Popular cities */}
          {!searchQuery && (
            <>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-bark-400">
                  Popular cities
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TOP_CITIES.map(({ city, count }) => (
                    <button
                      key={city}
                      onClick={() => selectCity(city)}
                      className="flex items-center gap-1.5 rounded-full border border-bark-200 bg-white px-4 py-2 text-sm font-medium text-bark-800 transition-colors hover:border-paw-400 hover:text-paw-700"
                    >
                      {city}
                      <span className="text-xs font-normal text-bark-400">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-bark-400">
                  Or browse by state
                </p>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) selectState(e.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-bark-200 bg-white px-4 py-2.5 text-sm text-bark-900 focus:outline-none focus:ring-2 focus:ring-paw-100 sm:w-72"
                >
                  <option value="" disabled>
                    Select a state...
                  </option>
                  {STATES_LIST.map(({ code, name, count }) => (
                    <option key={code} value={code}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Active selection breadcrumb ── */}
      {hasSelection && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full bg-paw-50 px-4 py-2 text-sm font-medium text-paw-700 hover:bg-paw-100"
          >
            {locationLabel}
            <X className="h-3.5 w-3.5" />
          </button>
          {fallbackNote && (
            <p className="text-xs text-bark-400">{fallbackNote}</p>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {hasSelection && displayedOrgs.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-bark-500">
            {displayedOrgs.length} organisation
            {displayedOrgs.length !== 1 ? "s" : ""}
            {fallbackNote
              ? ""
              : ` in ${locationLabel}`}
          </p>
          <div className="mt-3 space-y-3">
            {displayedOrgs.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
          <button
            onClick={reset}
            className="mt-6 text-sm font-medium text-bark-500 underline-offset-2 hover:text-bark-700 hover:underline"
          >
            Search a different city
          </button>
        </div>
      )}

      {hasSelection && displayedOrgs.length === 0 && (
        <div className="mt-6 rounded-xl border border-bark-100 bg-bark-50 p-6 text-center">
          <p className="text-sm text-bark-600">
            No organisations listed for {locationLabel} yet.
          </p>
          <button
            onClick={reset}
            className="mt-3 text-sm font-medium text-paw-600 hover:text-paw-700"
          >
            Browse all cities
          </button>
        </div>
      )}
    </section>
  );
}
