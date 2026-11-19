"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* Kaju's work opens over whatever page the person is on when the address says ?job=<id> (from Needs you, Today, a
   record, History or an old link). This watcher is all every page carries; the card's code loads only when one opens.

   It reads the address itself rather than through useSearchParams: a change of query alone on a statically rendered
   page (Kaju's home is one) does not reach a hook in the layout. So it reads the address when the page changes, on Back
   and Forward, when a link that carries ?job= is followed, and when code opens a job (useOpenJob sends JOB_EVENT). */
const JobHost = dynamic(() => import("./JobCard").then((m) => m.JobHost), { ssr: false });
export const JOB_EVENT = "sp:job";
const read = () => new URLSearchParams(window.location.search).get("job");

export function JobWatch() {
  const path = usePathname();
  const [job, setJob] = useState<string | null>(null);
  useEffect(() => { setJob(read()); }, [path]);
  useEffect(() => {
    const on = () => setJob(read());
    const soon = () => { for (const ms of [0, 80, 300]) window.setTimeout(on, ms); };
    const click = (e: MouseEvent) => { const a = (e.target as Element | null)?.closest?.("a[href]"); if (a && /[?&]job=/.test(a.getAttribute("href") ?? "")) soon(); };
    window.addEventListener(JOB_EVENT, soon); window.addEventListener("popstate", soon);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener(JOB_EVENT, soon); window.removeEventListener("popstate", soon); document.removeEventListener("click", click, true); };
  }, []);
  return job ? <JobHost id={job} /> : null;
}
