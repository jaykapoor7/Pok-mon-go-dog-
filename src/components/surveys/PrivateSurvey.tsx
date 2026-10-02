"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { isNgoMember } from "@/lib/actions";
import { getSurveys, getSurveyById, getSurveyAreas, isProjectSurvey } from "@/lib/surveys";
import type { Survey, SurveyArea } from "@/lib/types";
import { SurveyCreate } from "./SurveyCreate";
import { SurveyDetail } from "./SurveyDetail";
import { CollectFlow } from "./CollectFlow";
import { DeskHeader } from "@/components/app/DeskHeader";

export function PrivateSurvey({ id, collect = false }: { id?: string; collect?: boolean }) {
 const { user, ready, openSignIn } = useAuth();
 const [member,setMember] = useState<boolean | null>(null);
 const [surveys,setSurveys] = useState<Survey[] | null>(null);
 const [survey,setSurvey] = useState<Survey | null>(null);
 const [areas,setAreas] = useState<SurveyArea[]>([]);
 const [error,setError] = useState<string | null>(null);
 const load = useCallback(async () => {
   if (id) {
     const [record, nextAreas] = await Promise.all([getSurveyById(id),getSurveyAreas(id)]);
     if (!record) throw new Error("This survey is not in your organisation’s register.");
     setSurvey(record); setAreas(nextAreas);
   } else setSurveys((await getSurveys()).filter(s => !isProjectSurvey(s)));
 }, [id]);
 useEffect(() => {
   if (!ready) return;
   if (!user) { setMember(false); return; }
   let live=true;
   isNgoMember().then(async ok => { if (!live) return; setMember(ok); if (ok) await load(); }).catch(e => { if (live) setError(e.message || "The survey could not be loaded."); });
   return () => { live=false; };
 }, [ready,user,id,load]);
 const head = (lede: React.ReactNode, actions?: React.ReactNode) => (
   <DeskHeader kicker="Field work · surveys" title={<>Surveys &amp; census</>} lede={lede}
     figures={surveys ? [{ label: "surveys", value: surveys.length }] : undefined} actions={actions} />
 );
 if (error) return <div className="dk-page">{head("This survey could not be opened.")}<p role="alert" className="ops-alert">{error}</p></div>;
 if (member===false) return <div className="dk-page">{head("Surveys and field observations are private to the organisation that keeps them.", !user ? <button type="button" className="dk-btn" onClick={openSignIn}>Sign in</button> : undefined)}{user && <p className="dk-note">Your organisation access is not active yet.</p>}</div>;
 if (id && survey) return collect ? <CollectFlow survey={survey} areas={areas} /> : <SurveyDetail survey={survey} areas={areas} onChanged={load} />;
 if (id || surveys===null) return <div className="dk-page">{head(<span role="status">Loading your organisation’s surveys…</span>)}</div>;
 return (
   <div className="dk-page">
     {head("Structured field counts across wards, villages and districts, drawn on the map as they are collected.", <SurveyCreate />)}
     {surveys.length ? (
       <ul className="dk-ledger">
         {surveys.map(s => (
           <li key={s.id}>
             <Link href={`/surveys/${s.id}`}>
               <i className="dk-dot" aria-hidden />
               <span className="dk-row-main"><b>{s.title}</b><small>Dog census · {s.status}</small></span>
               <span className="dk-row-go" aria-hidden>Open</span>
             </Link>
           </li>
         ))}
       </ul>
     ) : <p className="dk-note">No surveys yet. Create one, then add the areas your team will cover.</p>}
     {surveys.length >= 200 && <p className="dk-fine">Showing the 200 most recent surveys.</p>}
   </div>
 );
}
