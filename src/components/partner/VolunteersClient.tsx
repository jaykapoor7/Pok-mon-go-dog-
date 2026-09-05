"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, MapPin } from "lucide-react";
import { getOrgVolunteers, type Volunteer } from "@/lib/team-actions";
import { timeAgo } from "@/lib/utils";

export function VolunteersClient() {
  const [rows, setRows] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getOrgVolunteers().then(setRows).finally(() => setLoading(false)); }, []);

  function contactHref(c: string) {
    return c.includes("@") ? `mailto:${c}` : `tel:${c.replace(/\s+/g, "")}`;
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Volunteer sign-ups</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          People who offered to help through the StrayPaw site. They are not
          on your team and cannot see anything: this is a list to call.
          Somebody you want reporting for you gets added on{" "}
          <a href="/partner/team" className="font-semibold underline underline-offset-2">Team</a>.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-12 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No volunteers have signed up yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((v) => (
            <div key={v.id} className="rounded border border-black/[0.08] bg-white p-4 dark:border-white/[0.1] dark:bg-bark-900">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-bark-900 dark:text-bark-50">{v.name}</p>
                <span className="text-[11.5px] text-bark-400">{timeAgo(v.created_at)}</span>
              </div>
              {v.zone && <p className="mt-1 flex items-center gap-1 text-xs text-bark-500"><MapPin className="h-3.5 w-3.5" /> {v.zone}</p>}
              {v.message && <p className="mt-2 whitespace-pre-line text-[13px] text-bark-600 dark:text-bark-300">{v.message}</p>}
              <a href={contactHref(v.contact)} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-paw-600">
                <Phone className="h-3.5 w-3.5" /> {v.contact}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
