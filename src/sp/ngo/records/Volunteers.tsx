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
import { Btn, Empty, Head, More, Note, Page, Panel, Table, type Col } from "@/ws/kit";
import { useMembership } from "../../shell/Shell";
import { day, n, since } from "../../ui";
import { Reading } from "../../ui/Reading";
import { NgoGate } from "../Gate";
import { readVolunteers } from "./read";
import "../org.k.css";
import { friendlyError } from "@/lib/friendly-error";

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

  const cols: Col<Volunteer>[] = [
    { key: "name", label: "Name", width: "minmax(0, 1fr)", render: (v) => v.name },
    { key: "zone", label: "Locality", render: (v) => v.zone || <span className="og-nr">Not given</span> },
    { key: "msg", label: "Message", width: "minmax(0, 2fr)", render: (v) => (v.message ? <span title={v.message}>{v.message}</span> : <span className="og-nr">No message</span>) },
    { key: "at", label: "Signed up", width: "112px", render: (v) => <time dateTime={v.created_at} title={day(v.created_at)}>{since(v.created_at)}</time> },
    { key: "contact", label: "Contact", width: "minmax(0, 200px)", keep: true, render: (v) => <a className="og-a og-cell" href={contactHref(v.contact)}>{isEmail(v.contact) ? <Mail size={14} aria-hidden /> : <Phone size={14} aria-hidden />}<span>{v.contact}</span></a> },
  ];

  return (
    <NgoGate title="Volunteer sign-ups" lede="People who offered to help through StrayPaw: a list to call.">
      <Page>
        <Head title="Volunteers"
          sum={<>{d.state === "read" ? <><b>{n(d.rows.length)}</b> sign-up{d.rows.length === 1 ? "" : "s"}, newest first. </> : d.state === "failed" ? "Not read. " : <><Reading>Reading sign-ups</Reading>{" "}</>}They are not on your team and see nothing. To have someone report for you, add them on <Link className="og-a" href="/ngo/team">Team</Link>.</>} />
        {d.state === "loading" && <div className="og-skel" aria-label="Reading sign-ups" aria-busy="true"><i /><i /><i /></div>}
        {d.state === "failed" && <Note tone="flame" action={<Btn small onClick={load}>Try again</Btn>}>Sign-ups could not be read. {friendlyError(d.error)} This is not the same as no sign-ups.</Note>}
        {d.state === "read" && (
          <Panel>
            <More items={d.rows} cap={15} noun="sign-ups">{(shown) => (
              <Table label="Volunteer sign-ups" cols={cols} rows={shown} rowKey={(v) => v.id}
                empty={<Empty title="No sign-ups yet" action={<Btn href="/ngo/team">Add someone to your team</Btn>}>People who offer to help appear here.</Empty>} />
            )}</More>
          </Panel>
        )}
      </Page>
    </NgoGate>
  );
}
