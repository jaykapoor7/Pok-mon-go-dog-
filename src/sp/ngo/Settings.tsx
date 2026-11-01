"use client";

/* NGO · Settings: the organisation's public profile, what of it the
   public sees, and where its private controls live. Saved through the
   profile RPC, which checks membership. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyOrg } from "@/lib/actions";
import type { NGO } from "@/lib/types";
import { Ack } from "../ui";
import { Reading } from "../ui/Reading";
import { saveOrgProfile, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";

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
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{org && org !== "error" ? org.name : "Your organisation"} · settings</p><h1 className="serif">Settings</h1></div>
          <p className="ngo-sum">{org && org !== "error" ? <>{org.verified ? "Verified organisation." : "Not yet verified: your public page says so."} The public sees your name, mission, city, areas of work and website. Contact details are shown only if you fill them in.</> : <Reading>Reading your organisation</Reading>}</p>
          <div className="row">{org && org !== "error" && org.slug && <Link className="btn is-s" href={`/community/organisations/${org.slug}`}>Your public page</Link>}<Link className="btn is-s" href="/ngo/settings/connections">Connections</Link></div>
        </header>
        {org === "error" && <p className="im-err"><Ack state="failed">Your organisation&rsquo;s profile could not be read.</Ack></p>}
        {f && (
          <form className="st-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <section className="st-sec">
              <h2 className="h3">Public profile</h2>
              <div className="field"><label htmlFor="st-m">Mission <span className="small">one sentence</span></label><input id="st-m" className="input" value={f.mission} onChange={set("mission")} maxLength={200} /></div>
              <div className="field"><label htmlFor="st-a">About</label><textarea id="st-a" className="textarea" value={f.about} onChange={set("about")} rows={6} /></div>
              <div className="field"><label htmlFor="st-w">Areas of work <span className="small">comma separated</span></label><input id="st-w" className="input" value={f.areas} onChange={set("areas")} placeholder="Rescue, ABC, vaccination" /></div>
              <div className="st-two"><div className="field"><label htmlFor="st-c">City</label><input id="st-c" className="input" value={f.city} onChange={set("city")} /></div><div className="field"><label htmlFor="st-s">State</label><input id="st-s" className="input" value={f.state} onChange={set("state")} /></div></div>
            </section>
            <section className="st-sec">
              <h2 className="h3">Contact and registration</h2>
              <div className="field"><label htmlFor="st-web">Website</label><input id="st-web" className="input" type="url" value={f.website} onChange={set("website")} /></div>
              <div className="field"><label htmlFor="st-e">Public email <span className="small">optional</span></label><input id="st-e" className="input" type="email" value={f.contact_email} onChange={set("contact_email")} /></div>
              <div className="field"><label htmlFor="st-p">Public phone <span className="small">optional</span></label><input id="st-p" className="input" inputMode="tel" value={f.contact_phone} onChange={set("contact_phone")} /></div>
              <div className="st-two"><div className="field"><label htmlFor="st-r">Registration no.</label><input id="st-r" className="input" value={f.registration_no} onChange={set("registration_no")} /></div><div className="field"><label htmlFor="st-y">Founded</label><input id="st-y" className="input" inputMode="numeric" value={f.founded_year} onChange={set("founded_year")} pattern="\d{4}" /></div></div>
              <div className="st-save"><button type="submit" className="btn is-ink" disabled={busy}>{busy ? "Saving…" : "Save the profile"}</button><span aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not saved: {r.error}</Ack>) : null}</span></div>
            </section>
            <section className="st-sec st-links">
              <h2 className="h3">Elsewhere</h2>
              <ul>
                <li><Link className="link" href="/ngo/team">Team &amp; access</Link><small>Members, roles, codes</small></li>
                <li><Link className="link" href="/ngo/import">Import a workbook</Link><small>Bring your existing register</small></li>
                <li><Link className="link" href="/ngo/proof">Reports &amp; proof</Link><small>Documents from your records</small></li>
                <li><span>WhatsApp intake</span><small>Not connected. CareOS needs backend support that does not exist yet.</small></li>
              </ul>
            </section>
          </form>
        )}
      </div>
    </NgoGate>
  );
}
