/* Fundraisers (/fundraisers) and one campaign (/fundraisers/[id]).
   Campaigns by partner NGOs and curated rescues; every one links straight
   to the organisation's own donation channel. StrayPaw never handles the
   money, and a raised amount is what the organiser reported. */

import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, ExternalLink, Megaphone, ShieldCheck, Wallet } from "lucide-react";
import { formatINR } from "@/lib/fundraisers";
import { fundraiserCategory, type Fundraiser, type FundraiserUpdate, type NGO } from "@/lib/types";
import { Body, Empty, Head, LinkBtn, Sec, Split, Tag } from "../kit";
import { Pic } from "../Pic";
import { day } from "../fmt";
import { OwnerControls } from "./OwnerControls";
import "./fundraisers.css";

const pctOf = (f: Fundraiser) => (f.goal_amount && f.raised_reported ? Math.min(100, Math.round((f.raised_reported / f.goal_amount) * 100)) : null);

function Progress({ f }: { f: Fundraiser }) {
  if (f.goal_amount == null) return null;
  const pct = pctOf(f);
  return (
    <div className="fr-prog">
      {pct != null && <div className="fr-bar" role="img" aria-label={`${pct}% of the goal, as reported by the organiser`}><i style={{ width: `${pct}%` }} /></div>}
      <p>{f.raised_reported != null ? <><b>{formatINR(f.raised_reported)}</b> reported raised of {formatINR(f.goal_amount)}</> : <>Goal <b>{formatINR(f.goal_amount)}</b></>}</p>
    </div>
  );
}

export function FundraiserList({ list }: { list: Fundraiser[] }) {
  return (
    <>
      <Head title="Fundraisers"
        sum={<>{list.length ? <><b>{list.length}</b> active {list.length === 1 ? "campaign" : "campaigns"}</> : "Campaigns"} by partner NGOs and vetted rescues, for vet bills, sterilisation and emergencies. Every one links straight to the rescue&rsquo;s own donation channel; StrayPaw never handles the money.</>} />
      <Body>
        {!list.length ? <Empty title="No active fundraisers just now">When a partner NGO or a vetted rescue opens a campaign, it is listed here. That says what has been shared, not what is needed.</Empty> : (
          <ul className="fr-list" aria-label="Active fundraisers">
            {list.map((f) => {
              const cat = fundraiserCategory(f.category);
              return (
                <li key={f.id}>
                  <Link href={`/fundraisers/${f.id}`} className="fr-item">
                    <span className="fr-cover" aria-hidden><Pic src={f.cover_photo} tag={f.title} sensitive /></span>
                    <span className="fr-text">
                      <span className="pb-tags"><Tag>{cat.label}</Tag>{f.featured && <Tag tone="blue">StrayPaw pick</Tag>}</span>
                      <b>{f.title}</b>
                      <small>{f.created_by_name ?? "Organisation not named"}{f.deadline ? ` · needed by ${day(f.deadline)}` : ""}</small>
                      <Progress f={f} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="pb-fine">Are you a verified partner NGO? Campaigns are started from your organisation&rsquo;s workspace. <Link href="/sign-in?next=/next/ngo/programmes">Sign in to start one</Link>.</p>
      </Body>
    </>
  );
}

export function FundraiserView({ f, org, updates }: { f: Fundraiser; org: NGO | null; updates: FundraiserUpdate[] }) {
  const cat = fundraiserCategory(f.category);
  const budgetTotal = f.budget.reduce((s, l) => s + (l.amount || 0), 0);
  const by = f.created_by_name ?? org?.name ?? "this rescue";
  return (
    <>
      <Head back="/fundraisers" title={f.title}
        eyebrow={<span className="pb-tags"><Tag>{cat.label}</Tag>{f.featured && <Tag tone="blue"><ShieldCheck size={12} aria-hidden /> StrayPaw pick</Tag>}{f.status === "closed" && <Tag tone="amber">This campaign has closed</Tag>}</span>}
        sum={<>By {org ? <Link className="pb-link" href={`/community/organisations/${org.slug ?? org.id}`}>{org.name}</Link> : by}{org ? (org.verified ? " · verified organisation" : " · not yet verified") : ""}.</>} />
      <Body>
        <Split side={<>
          <div className="fr-donate">
            <Progress f={f} />
            {f.deadline && <p className="fr-dl"><Clock size={16} aria-hidden /> Needed by {day(f.deadline)}</p>}
            <LinkBtn href={f.donate_url} external variant="primary" className="fr-donate-btn" rel="noopener noreferrer nofollow" icon={<ExternalLink size={16} aria-hidden />}>Donate to {by}<span className="pb-sr"> (opens their page in a new tab)</span></LinkBtn>
            <p className="pb-fine">Opens the organisation&rsquo;s own donation page. StrayPaw does not process or hold the payment: your money goes directly to them.</p>
          </div>
          <OwnerControls f={f} />
        </>}>
          {f.cover_photo && <div className="fr-hero"><Pic src={f.cover_photo} tag={f.title} sensitive alt={f.title} /></div>}
          {f.story && <Sec title="The story"><p className="pb-prose">{f.story}</p></Sec>}
          {f.budget.length > 0 && (
            <Sec title={<><Wallet size={16} aria-hidden /> Use of funds</>}>
              <table className="fr-budget">
                <caption className="pb-sr">How the funds are planned to be used</caption>
                <tbody>{f.budget.map((line, i) => <tr key={i}><th scope="row">{line.label}</th><td>{formatINR(line.amount)}</td></tr>)}</tbody>
                {budgetTotal > 0 && <tfoot><tr><th scope="row">Total</th><td>{formatINR(budgetTotal)}</td></tr></tfoot>}
              </table>
            </Sec>
          )}
          {f.outcome && <Sec title={<><CheckCircle2 size={16} aria-hidden /> Outcome</>} note="As reported by the organiser."><p className="pb-prose">{f.outcome}</p></Sec>}
          <Sec title={<><Megaphone size={16} aria-hidden /> Updates</>} count={updates.length || null}>
            {updates.length ? (
              <ol className="fr-updates">
                {updates.map((u) => (
                  <li key={u.id}>
                    <time dateTime={u.created_at}>{day(u.created_at)}</time>
                    <p className="pb-prose">{u.body}</p>
                    {u.photo_url && <div className="fr-up-pic"><Pic src={u.photo_url} tag="Update photo" sensitive alt="Photo posted with this update" /></div>}
                  </li>
                ))}
              </ol>
            ) : <p className="pb-fine">No update posted yet.</p>}
          </Sec>
          {f.case_id && <p className="pb-fine fr-case"><ClipboardList size={16} aria-hidden /> This campaign is linked to a case on the organisation&rsquo;s own record. Case files are private to the organisation.</p>}
        </Split>
      </Body>
    </>
  );
}
