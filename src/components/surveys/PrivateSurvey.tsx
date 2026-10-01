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
 if (error) return <div className="py-10"><h1 className="text-2xl">Survey unavailable</h1><p role="alert" className="mt-4">{error}</p></div>;
 if (member===false) return <div className="py-10"><h1 className="text-2xl">Your organisation’s surveys</h1><p className="mt-4">Surveys and field observations are private to the organisation that keeps them.</p>{!user ? <button className="sys-btn mt-4" onClick={openSignIn}>Sign in</button> : <p className="mt-4">Active organisation access is required.</p>}</div>;
 if (id && survey) return collect ? <CollectFlow survey={survey} areas={areas} /> : <SurveyDetail survey={survey} areas={areas} onChanged={load} />;
 if (id || surveys===null) return <div className="py-10"><h1 className="text-2xl">Surveys &amp; census</h1><p className="mt-4" role="status">Loading your organisation’s surveys…</p></div>;
 return <div><header className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-xl font-semibold">Surveys &amp; census</h1><p className="mt-2 text-sm text-bark-500">Structured field counts across wards, villages and districts.</p></div><SurveyCreate /></header>{surveys.length ? <ul className="divide-y border-y border-black/10">{surveys.map(s => <li key={s.id}><Link className="block py-4" href={`/surveys/${s.id}`}><b>{s.title}</b><p className="mt-1 text-sm text-bark-500">Dog census · {s.status}</p></Link></li>)}</ul> : <p className="py-12 text-sm text-bark-500">No surveys have been recorded. Create one, then add the areas your team will cover.</p>}<p className="mt-4 text-xs text-bark-500">Showing up to 200 recent surveys.</p></div>;
}
