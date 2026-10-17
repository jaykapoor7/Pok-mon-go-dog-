"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Volunteer sign-ups (1.0 /partner/volunteers).

   People who offered to help through StrayPaw. They are not on the team
   and see nothing: this is a list to call. Read through the same
   org_volunteers RPC as 1.0, which the database opens to organisation
   members only. A failed read says "Not read", never "no sign-ups".
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Phone, Mail } from "lucide-react";
import type { Volunteer } from "@/lib/team-actions";
import { useMembership } from "../../shell/Shell";
import { Method, State, day, n, since } from "../../ui";
import { NgoGate } from "../Gate";
import { readVolunteers } from "./read";
import "../ngo.css";
import "./records.css";

const isEmail = (c: string) => c.includes("@");
const contactHref = (c: string) => (isEmail(c) ? `mailto:${c}` : `tel:${c.replace(/\s+/g, "")}`);

export function Volunteers() {
  const mem = useMembership();
  const [d, setD] = useState<{ state: "loading" } | { state: "failed"; error: string } | { state: "read"; rows: Volunteer[] }>({ state: "loading" });
  const load = useCallback(() => {
    setD({ state: "loading" });
    readVolunteers().then((rows) => setD({ state: "read", rows })).catch((e: unknown) => setD({ state: "failed", error: e instanceof Error ? e.message : "The read failed." }));
  }, []);
  useEffect(() => { if (mem.member) load(); }, [mem.member, load]);

  return (
    <NgoGate title="Volunteer sign-ups" lede="People who offered to help through StrayPaw: a list to call.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · volunteers</p><h1 className="serif">Volunteer sign-ups</h1></div>
          <p className="ngo-sum">{d.state === "read" ? <><b>{n(d.rows.length)}</b> sign-up{d.rows.length === 1 ? "" : "s"}. </> : d.state === "failed" ? "Not read. " : "Reading sign-ups… "}They are not on your team and see nothing. To have someone report for you, add them on <Link className="link" href="/ngo/team">Team</Link>.</p>
        </header>
        <div className="rc-body">
          {d.state === "loading" && <div className="rc-skel" aria-label="Reading sign-ups"><span className="skel" /><span className="skel" /><span className="skel" /></div>}
          {d.state === "failed" && <State kind="error" title="Not read" action={<button type="button" className="btn is-s" onClick={load}>Try again</button>}>Sign-ups could not be read ({d.error}). This is not the same as no sign-ups.</State>}
          {d.state === "read" && !d.rows.length && <State art="ngo-empty" title="No sign-ups yet" action={<Link className="btn is-ink" href="/ngo/team">Add someone to your team</Link>}>People who offer to help on StrayPaw appear here with how to reach them. Someone you already know can be added to your team with a personal code instead.</State>}
          {d.state === "read" && d.rows.length > 0 && (
            <div className="rc-stack">
              <Method items={[["Source", "StrayPaw sign-up form"], ["Order", "newest first"], ["Shown", `up to 300, ${n(d.rows.length)} read`]]} />
              <div className="rc-scroll" role="region" aria-label="Volunteer sign-ups" tabIndex={0}>
                <table className="rc-table rc-vol">
                  <thead><tr><th scope="col">Name</th><th scope="col">Locality</th><th scope="col">Message</th><th scope="col">Signed up</th><th scope="col">Contact</th></tr></thead>
                  <tbody>
                    {d.rows.map((v) => (
                      <tr key={v.id}>
                        <td className="rc-who"><b>{v.name}</b></td>
                        <td>{v.zone || <span className="pill is-unknown">Not given</span>}</td>
                        <td className="rc-note">{v.message ? <span className="rc-pre">{v.message}</span> : <i className="small">No message</i>}</td>
                        <td className="mono rc-date"><time dateTime={v.created_at} title={day(v.created_at)}>{since(v.created_at)}</time></td>
                        <td className="rc-open"><a className="btn is-s" href={contactHref(v.contact)}>{isEmail(v.contact) ? <Mail size={14} aria-hidden /> : <Phone size={14} aria-hidden />}<span className="rc-contact">{v.contact}</span></a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </NgoGate>
  );
}
