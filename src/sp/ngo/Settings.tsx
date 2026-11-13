"use client";

/* NGO · Settings: the organisation's public profile, what of it the
   public sees, and where its private controls live. Saved through the
   profile RPC, which checks membership. */

import { useEffect, useState } from "react";
import { FileUp, GitBranch, Plug, Users } from "lucide-react";
import { getMyOrg } from "@/lib/actions";
import type { NGO } from "@/lib/types";
import { Btn, Head, Note, Page, Panel, Row, Rows, Section } from "@/ws/kit";
import { Ack } from "../ui";
import { Reading } from "../ui/Reading";
import { saveOrgProfile, type Receipt } from "../data/work";
import { ReportDeadline } from "./ReportDeadline";
import { NgoGate } from "./Gate";
import "./org.k.css";

type F = { mission: string; about: string; website: string; contact_email: string; contact_phone: string; city: string; state: string; registration_no: string; founded_year: string; areas: string };

export function Settings() {
  const [org, setOrg] = useState<NGO | null | "error">(null);
  const [f, setF] = useState<F | null>(null);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  useEffect(() => {
    getMyOrg().then((o) => {
      setOrg(o ?? "error");
      if (o) setF({ mission: o.mission ?? "", about: o.about ?? "", website: o.website ?? "", contact_email: o.contact_email ?? "", contact_phone: o.contact_phone ?? "", city: o.city ?? "", state: o.state ?? "", registration_no: o.registration_no ?? "", founded_year: o.founded_year ? String(o.founded_year) : "", areas: (o.areas_of_work ?? []).join(", ") });
    }).catch(() => setOrg("error"));
  }, []);
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => (x ? { ...x, [k]: e.target.value } : x));
  const save = async () => {
    if (!f) return;
    setBusy(true); setR(null);
    setR(await saveOrgProfile({ mission: f.mission.trim(), about: f.about.trim(), website: f.website.trim(), contact_email: f.contact_email.trim(), contact_phone: f.contact_phone.trim(), city: f.city.trim(), state: f.state.trim(), registration_no: f.registration_no.trim(), founded_year: f.founded_year ? Number(f.founded_year) : null, areas_of_work: f.areas.split(",").map((s) => s.trim()).filter(Boolean) }));
    setBusy(false);
  };

  return (
    <NgoGate title="Settings" lede="Your organisation's profile and where its controls live.">
      <Page width="narrow">
        <Head title="Settings"
          sum={org === null ? <Reading>Reading your organisation</Reading> : org === "error" ? "Your organisation's profile could not be read." : <><b>{org.name}</b>{org.verified ? ", a verified organisation" : ""}. What you save here is your public profile.</>}
          actions={org && org !== "error" && org.slug ? <Btn href={`/community/organisations/${org.slug}`}>Your public page</Btn> : undefined} />
        {org === "error" && <Note tone="flame"><Ack state="failed">Your organisation&rsquo;s profile could not be read.</Ack></Note>}
        {f && (
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <Section title="Public profile">
              <div className="og-form is-wide">
                <div className="og-f"><label htmlFor="st-m">Mission <span className="og-opt">one sentence</span></label><input id="st-m" className="og-in" value={f.mission} onChange={set("mission")} maxLength={200} /></div>
                <div className="og-f"><label htmlFor="st-a">About</label><textarea id="st-a" className="og-in" value={f.about} onChange={set("about")} rows={4} /></div>
                <div className="og-f"><label htmlFor="st-w">Areas of work <span className="og-opt">comma separated</span></label><input id="st-w" className="og-in" value={f.areas} onChange={set("areas")} placeholder="Rescue, ABC, vaccination" /></div>
                <div className="og-two"><div className="og-f"><label htmlFor="st-c">City</label><input id="st-c" className="og-in" value={f.city} onChange={set("city")} /></div><div className="og-f"><label htmlFor="st-s">State</label><input id="st-s" className="og-in" value={f.state} onChange={set("state")} /></div></div>
              </div>
            </Section>
            <Section title="Contact and registration">
              <div className="og-form is-wide">
                <div className="og-f"><label htmlFor="st-web">Website</label><input id="st-web" className="og-in" type="url" value={f.website} onChange={set("website")} /></div>
                <div className="og-two">
                  <div className="og-f"><label htmlFor="st-e">Public email <span className="og-opt">optional</span></label><input id="st-e" className="og-in" type="email" value={f.contact_email} onChange={set("contact_email")} /></div>
                  <div className="og-f"><label htmlFor="st-p">Public phone <span className="og-opt">optional</span></label><input id="st-p" className="og-in" inputMode="tel" value={f.contact_phone} onChange={set("contact_phone")} /></div>
                </div>
                <div className="og-two"><div className="og-f"><label htmlFor="st-r">Registration no.</label><input id="st-r" className="og-in" value={f.registration_no} onChange={set("registration_no")} /></div><div className="og-f"><label htmlFor="st-y">Founded</label><input id="st-y" className="og-in" inputMode="numeric" value={f.founded_year} onChange={set("founded_year")} pattern="\\d{4}" /></div></div>
                <div className="og-go"><Btn type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save the profile"}</Btn><span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>) : null}</span></div>
              </div>
            </Section>
          </form>
        )}
        {f && <ReportDeadline />}
        <Section title="More settings">
          <Panel>
            <Rows label="More settings">
              <Row href="/ngo/team" icon={<Users size={14} />} title="Team" meta="Who belongs to your organisation and what each person can do" />
              <Row href="/ngo/settings/policies" icon={<GitBranch size={14} />} title="Workflow policies" meta="Your procedure requirements, by version" />
              <Row href="/ngo/settings/connections" icon={<Plug size={14} />} title="Connections" meta="The tools your organisation uses with Kaju" />
              <Row href="/ngo/import" icon={<FileUp size={14} />} title="Import a register" meta="Bring in the spreadsheet your team already keeps" />
            </Rows>
          </Panel>
        </Section>
      </Page>
    </NgoGate>
  );
}
