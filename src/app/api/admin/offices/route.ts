import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {verifyOfficeChange} from "@/lib/review-office-actions";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Reviewing offices for the moderation console (StrayPaw staff only).
     GET  /api/admin/offices                              → offices, their reviewers
     POST { action: "create", name, city }                → a new reviewing office
     POST { action: "rename", officeId, name, city }      → correct its name or city
     POST { action: "addReviewer", officeId, email }      → give an existing account reviewer access
     POST { action: "removeReviewer", officeId, userId }  → take it away

   A reviewer sees a package only after an organisation submits it to their
   office, and may query, accept or return it; the database enforces that.
   Adding someone requires their StrayPaw account to exist (they sign in once
   first), so access is never granted to an address nobody controls. Every
   change is written to operational_audit_log. */

function authorised(req: Request): "ok" | "unset" | "bad" {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const given = (auth?.startsWith("Bearer ") ? auth.slice(7) : "").trim();
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "bad";
}
function refuse(state: "unset" | "bad") {
  return state === "unset"
    ? NextResponse.json({ error: "Set ADMIN_SECRET in Vercel and redeploy to use the moderation tools." }, { status: 503 })
    : NextResponse.json({ error: "Wrong password." }, { status: 401 });
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OfficeRow = { id: string; name: string; city: string | null; created_at: string; reviewers: { user_id: string; email: string | null; name: string | null; added_at: string }[]; packages: number };

export async function GET(req: Request) {
  const state = authorised(req);
  if (state !== "ok") return refuse(state);
  const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Reviewing office setup needs the server credential for this deployment."},{status:503});
  const {data,error}=await db.rpc('admin_review_offices',{p_limit:200});
  if(error||!data||!Array.isArray(data.offices))return NextResponse.json({error:'Reviewing offices could not be read.'},{status:503});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req: Request) {
  const state=authorised(req);if(state!=="ok")return refuse(state);
  const db=getSupabaseAdmin();if(!db)return NextResponse.json({error:"Reviewing office setup needs the server credential for this deployment."},{status:503});
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
  if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Invalid request.'},{status:400});
  const action=body.action;
  if(typeof action!=='string'||!['create','rename','addReviewer','removeReviewer'].includes(action))return NextResponse.json({error:'Choose a reviewing-office action.'},{status:400});
  if(typeof body.requestId!=='string'||!UUID.test(body.requestId))return NextResponse.json({error:'Reload reviewing offices before making this change.'},{status:400});
  if(body.confirmed!==true||action==='addReviewer'&&body.authorisationConfirmed!==true)return NextResponse.json({error:'Confirm the change and the reviewer’s authorisation first.'},{status:400});
  const field=(key:string,max:number)=>body[key]==null?null:typeof body[key]==='string'&&(body[key] as string).length<=max?(body[key] as string).trim():undefined;
  const name=field('name',160),city=field('city',80),email=field('email',254),expected=field('expectedName',160);
  if([name,city,email,expected].some(v=>v===undefined)||action!=='create'&&(typeof body.officeId!=='string'||!UUID.test(body.officeId))||action==='removeReviewer'&&(typeof body.userId!=='string'||!UUID.test(body.userId)))return NextResponse.json({error:'Check the office fields and try again.'},{status:400});
  const {data,error}=await db.rpc('admin_review_office_act',{
    p_request:body.requestId,p_action:action,p_confirmed:true,p_office:body.officeId??null,
    p_name:name,p_city:city,p_email:email,p_user:body.userId??null,
    p_authorised:body.authorisationConfirmed===true,p_expected_name:expected,
  });
  if(error)return NextResponse.json({error:['22023','23505','P0002','40001'].includes(error.code)?error.message:'The office change could not be completed. Retry the same request.'},{status:error.code==='P0002'?404:error.code==='23505'||error.code==='40001'?409:400});
  try {
    const receipt=await verifyOfficeChange(db,body.requestId,action,{name:name??null,city:city||null},data);
    return NextResponse.json({ok:true,verified:true,id:data.office_id,auditId:data.audit_id,at:receipt.at},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({ok:false,error:'The change may have saved, but its source or audit could not be verified. Retry this same change.'},{status:503})}
}
