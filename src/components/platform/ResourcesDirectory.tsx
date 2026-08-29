"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, ExternalLink, MapPin, X } from "lucide-react";
import type { OrgEntry } from "@/lib/platform/orgs";

interface StateOrgs {
  code: string;
  name: string;
  orgs: OrgEntry[];
}

export function ResourcesDirectory({
  statesWithOrgs,
  totalOrgs,
}: {
  statesWithOrgs: StateOrgs[];
  totalOrgs: number;
}) {
  const [selectedState, setSelectedState] = useState<string>("all");
  const [stateName, setStateName] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get("state");
    if (stateParam) {
      const match = statesWithOrgs.find((s) => s.code === stateParam);
      if (match) {
        setSelectedState(stateParam);
        setStateName(match.name);
      }
    }
  }, [statesWithOrgs]);

  const displayed =
    selectedState === "all"
      ? statesWithOrgs
      : statesWithOrgs.filter((s) => s.code === selectedState);

  function handleChange(code: string) {
    setSelectedState(code);
    const match = statesWithOrgs.find((s) => s.code === code);
    setStateName(match?.name ?? "");
    const url = new URL(window.location.href);
    if (code === "all") {
      url.searchParams.delete("state");
    } else {
      url.searchParams.set("state", code);
    }
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <section id="directory" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-bark-900">
        <Building2 className="h-5 w-5 text-paw-500" />
        Organisation directory
      </h2>
      <p className="mt-1 text-sm text-bark-400">
        {totalOrgs} animal-welfare organisations across {statesWithOrgs.length}{" "}
        states. Curated, not comprehensive.{" "}
        <Link href="/orgs" className="text-paw-600 underline">
          Full searchable directory
        </Link>
      </p>

      {/* State filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label
          htmlFor="state-filter"
          className="text-sm font-medium text-bark-600"
        >
          Show:
        </label>
        <select
          id="state-filter"
          value={selectedState}
          onChange={(e) => handleChange(e.target.value)}
          className="rounded-lg border border-bark-200 bg-white px-3 py-1.5 text-sm text-bark-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-paw-500"
        >
          <option value="all">All states ({totalOrgs} orgs)</option>
          {statesWithOrgs.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.orgs.length})
            </option>
          ))}
        </select>
        {selectedState !== "all" && (
          <button
            onClick={() => handleChange("all")}
            className="flex items-center gap-1 rounded-full bg-bark-100 px-3 py-1.5 text-xs font-medium text-bark-700 hover:bg-bark-200"
          >
            {stateName}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Org list */}
      <div className="mt-6 space-y-8">
        {displayed.map(({ code, name, orgs }) => (
          <div key={code}>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bark-400">
              <MapPin className="h-3.5 w-3.5" />
              {name}
            </h3>
            <div className="mt-2 space-y-3">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="rounded-lg border border-bark-100 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-bark-900">{org.name}</p>
                      <p className="text-xs text-bark-400">
                        {org.city}
                        {org.founded ? ` / Est. ${org.founded}` : ""}
                      </p>
                    </div>
                    {org.url && (
                      <a
                        href={org.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-bark-300 hover:text-paw-500"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-bark-600">{org.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
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
              ))}
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <p className="text-sm text-bark-400">
            No organisations listed for this state yet.{" "}
            <button
              onClick={() => handleChange("all")}
              className="text-paw-600 underline"
            >
              Show all states
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
