"use client";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw bot in an NGO team's WhatsApp group.

   The scroll plays one group conversation: the bot is added, then does
   the four things a team uses it for. Beside the chat (above it, on
   phones) the team's StrayPaw workspace changes as the chat does, so
   each message is seen landing in the records:

     files      a photo and a place posted in the group become a request;
                "mine" assigns it
     looks up   a StrayPaw ID returns the animal's record
     drives     a drive is started, the team posts each animal done, the
                bot keeps count and closes it into the records and the map
     due        each morning, what is due today and who has it

   Nothing to press: it plays by itself once it is on screen, and
   scrolling moves it ahead. The people, the drive and its numbers are an example
   conversation; the ID follows StrayPaw's real format.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { ArrowUpRight, Camera, CheckCheck, MapPin, Users } from "lucide-react";
import { useStory } from "./useStory";
import "./bot-groups.css";

const ID = "SP-D-K7Q2PA";
const SKILLS = [
  { at: 0.1, k: "files", t: "Files what the group posts", c: "Photo + place → a request" },
  { at: 0.34, k: "lookup", t: "Looks up any animal", c: `@StrayPaw ${ID}` },
  { at: 0.54, k: "drive", t: "Runs drives and keeps count", c: "@StrayPaw start drive" },
  { at: 0.82, k: "due", t: "Says what is due, every morning", c: "8:00 every day" },
] as const;

type Who = "bot" | "Priya" | "Arun" | "Kavya" | "sys" | "day";
type Line = { at: number; who: Who; body: ReactNode; time?: string; typing?: boolean };
const INK: Record<string, string> = { Priya: "#c2410c", Arun: "#1d4ed8", Kavya: "#7e22ce" };

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function BotGroups() {
  const track = useRef<HTMLDivElement>(null);
  const q = useStory(track, 13, "request-journey");

  const at = (t: number) => q >= t;
  const skill = SKILLS.reduce((a, s, i) => (q >= s.at ? i : a), -1);
  /* The drive's count runs while the team posts. */
  const run = clamp((q - 0.62) / 0.13);
  const ster = Math.round(18 * run), vacc = Math.round(22 * run), recheck = Math.round(3 * clamp((q - 0.7) / 0.05));
  const closed = at(0.79);

  const lines: Line[] = [
    { at: 0.03, who: "sys", body: <>Priya added StrayPaw</> },
    { at: 0.07, who: "bot", time: "10:02", body: <>Hi team. Post an animal here, a photo and the place, and I’ll file it in your records. Send me a StrayPaw ID to look one up, or say <b>start drive</b>.</> },
    { at: 0.14, who: "Arun", time: "10:14", body: <><span className="bg-media"><span className="bg-photo"><Camera aria-hidden /></span><span className="bg-loc"><MapPin aria-hidden />Location</span></span>Pup with ticks behind the temple, very weak</> },
    { at: 0.23, who: "bot", time: "10:14", body: <>Filed: <b>new request, Ganapathy</b>. Unassigned. Reply <b>mine</b> to take it.</> },
    { at: 0.27, who: "Kavya", time: "10:16", body: <>mine</> },
    { at: 0.3, who: "bot", time: "10:16", body: <><b>Kavya</b> has it. I’ll check in tomorrow morning.</> },
    { at: 0.37, who: "Priya", time: "12:40", body: <><span className="bg-at">@StrayPaw</span> {ID}</> },
    { at: 0.42, who: "bot", time: "12:40", body: <span className="bg-card"><b>{ID}</b><span>Brown female · Ganapathy</span><span><i className="is-ok" />Sterilised, ear notched · Mar 2025</span><span><i className="is-ok" />Vaccinated · Aug 2026</span><span><i />Last seen 3 days ago · no open request</span></span> },
    { at: 0.56, who: "Priya", time: "7:05", body: <><span className="bg-at">@StrayPaw</span> start drive, ABC, Ganapathy</> },
    { at: 0.6, who: "bot", time: "7:05", body: <>Drive started. Post a photo of each animal as you finish it with <b>done</b>, and I’ll keep count.</> },
    { at: 0.64, who: "Arun", time: "9:31", body: <><span className="bg-album"><i /><i /><i /><i data-more={`+${Math.max(0, ster - 3)}`} /></span>done ✓</> },
    { at: 0.7, who: "Kavya", time: "11:48", body: <>done, 3 of them need a recheck</> },
    { at: 0.76, who: "Priya", time: "14:20", body: <><span className="bg-at">@StrayPaw</span> close drive</> },
    { at: 0.79, who: "bot", time: "14:20", body: <>Drive closed: <b>18 sterilised, 22 vaccinated</b>, 3 to recheck on Friday. Added to your records and the city map.</> },
    { at: 0.84, who: "day", body: <>Friday</> },
    { at: 0.86, who: "bot", time: "8:00", body: <>Good morning. Due today: <b>3 rechecks</b> from Tuesday’s drive (Arun), and <b>the pup behind the temple</b> (Kavya).</> },
    { at: 0.92, who: "Arun", time: "8:04", body: <>On it</> },
  ];
  const shown = lines.filter((l) => at(l.at));
  const next = lines.find((l) => !at(l.at));
  const typing = next?.who === "bot" && q >= next.at - 0.03;

  return (
    <section id="whatsapp-groups" className="bg" aria-labelledby="bg-title">
      <p className="bg-sr">In an NGO team’s WhatsApp group, the StrayPaw bot files reports the group posts, looks up any animal by its StrayPaw ID, runs sterilisation and vaccination drives and keeps count, and each morning tells the team what is due. Everything lands in the organisation’s StrayPaw records.</p>
      <div ref={track} className="bg-track">
        <div className="bg-stage">
          <h2 id="bg-title" className="bg-label"><Users aria-hidden />StrayPaw in your NGO’s WhatsApp group</h2>

          <div className="bg-chat" aria-hidden>
            <div className="bg-head">
              <span className="bg-avatar"><Users /></span>
              <span><b>Ganapathy rescue team</b><small>{typing ? "StrayPaw is typing…" : `Priya, Arun, Kavya, You${at(0.03) ? ", StrayPaw" : ""}`}</small></span>
            </div>
            <div className="bg-thread">
              <div className="bg-scroll">
                {shown.map((l, i) => {
                  if (l.who === "sys" || l.who === "day") return <p key={i} className={`bg-sys${l.who === "day" ? " is-day" : ""}`}>{l.body}</p>;
                  const mine = l.who !== "bot" && l.who === "Priya";
                  return (
                    <div key={i} className={`bg-msg${l.who === "bot" ? " is-bot" : ""}${mine ? " is-mine" : ""}`}>
                      <div className="bg-bubble">
                        {!mine && <b className="bg-who" style={l.who !== "bot" ? { color: INK[l.who] } : undefined}>{l.who === "bot" ? "StrayPaw" : l.who}</b>}
                        {l.body}
                        <span className="bg-time">{l.time}{mine && <CheckCheck aria-hidden />}</span>
                      </div>
                    </div>
                  );
                })}
                {typing && <div className="bg-msg is-bot"><div className="bg-bubble bg-typing"><i /><i /><i /></div></div>}
              </div>
            </div>
            <div className="bg-compose"><span>Message</span></div>
          </div>

          <div className="bg-desk">
            <ol className="bg-skills" aria-label="What the bot does in a group">
              {SKILLS.map((s, i) => (
                <li key={s.k} className={i === skill ? "is-now" : i < skill ? "is-past" : undefined}>
                  <b>{s.t}</b><code>{s.c}</code>
                </li>
              ))}
            </ol>

            <div className="bg-ws" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <p className="bg-ws-k"><img src="/straypaw-mark.png" alt="" width={18} height={18} />Ganapathy rescue team · StrayPaw</p>
              {skill <= 0 && (
                <ul className="bg-reqs">
                  <li className={at(0.23) ? "is-new" : "is-ghost"}><b>Pup with ticks</b><span>Ganapathy · just now</span><em className={at(0.3) ? "is-kavya" : undefined}>{at(0.3) ? "Kavya" : "Unassigned"}</em></li>
                  <li><b>Dog with maggot wound</b><span>RS Puram · yesterday</span><em>Arun</em></li>
                  <li><b>Limping, back leg</b><span>Ganapathy · 2 days ago</span><em>Priya</em></li>
                </ul>
              )}
              {skill === 1 && (
                <div className={`bg-animal${at(0.42) ? " is-on" : ""}`}>
                  <span className="bg-animal-ph" />
                  <div><b>{ID}</b><span>Brown female · Ganapathy</span></div>
                  <ol>
                    <li><i className="is-ok" />Sterilised · Mar 2025</li>
                    <li><i className="is-ok" />Vaccinated · Aug 2026</li>
                    <li><i />Seen · 3 days ago</li>
                  </ol>
                </div>
              )}
              {skill === 2 && (
                <div className="bg-drive">
                  <p className="bg-drive-h">ABC drive · Ganapathy <em className={closed ? "is-closed" : undefined}>{closed ? "Closed" : at(0.6) ? "Running" : "Starting"}</em></p>
                  <dl>
                    <div><dt>Sterilised</dt><dd>{ster}</dd></div>
                    <div><dt>Vaccinated</dt><dd>{vacc}</dd></div>
                    <div><dt>To recheck</dt><dd>{recheck}</dd></div>
                  </dl>
                  <span className="bg-dots">{Array.from({ length: 22 }, (_, i) => <i key={i} className={i < vacc ? (i < ster ? "is-ster" : "is-vacc") : undefined} />)}</span>
                  {closed && <p className="bg-drive-done">Added to the records and the city map</p>}
                </div>
              )}
              {skill === 3 && (
                <ul className="bg-due">
                  <li><b>3 rechecks</b><span>Tuesday’s drive</span><em>Arun</em></li>
                  <li><b>Pup with ticks</b><span>Behind the temple</span><em className="is-kavya">Kavya</em></li>
                </ul>
              )}
            </div>
          </div>

          <div className="bg-cta-band" aria-hidden={!at(0.9)}>
            <Link href="/contact?subject=WhatsApp%20CareOS%20access" className={`bg-cta${at(0.9) ? " is-on" : ""}`} tabIndex={at(0.9) ? 0 : -1}>Add StrayPaw to your NGO’s group<ArrowUpRight aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
