import type { AiReply, Proposal } from './types';
/** Postgres audit IDs may be serial numbers or UUID/text identifiers. */
export function auditReference(value:unknown):string|null{return typeof value==='string'&&value.length>0&&value.length<=160?value:typeof value==='number'&&Number.isSafeInteger(value)&&value>0?String(value):null}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=24000):v is string=>typeof v==='string'&&v.length<=max;
const nullable=(v:unknown)=>v===null||text(v);
const strings=(v:unknown)=>Array.isArray(v)&&v.length<=100&&v.every(x=>text(x));
export function safeAiHref(v:unknown):v is string {
  if(!text(v,2048)||/[\\\u0000-\u0020]/.test(v))return false;
  if(v.startsWith('/')&&!v.startsWith('//'))return true;
  try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}
}
function proposal(p:unknown):p is Proposal {
 if(!object(p)||!text(p.id,128)||!p.id||!text(p.why))return false;
 const has=(...keys:string[])=>keys.every(k=>text(p[k]));
 const provider=()=>['google','microsoft','slack','zoho'].includes(String(p.provider));
 switch(p.kind){
  case 'open_case':return has('title','city','description')&&nullable(p.zone)&&nullable(p.dogId)&&['injury','sterilisation','rescue','vaccination','other'].includes(String(p.category))&&['low','normal','high','critical'].includes(String(p.severity));
  case 'add_note':return has('caseId','caseLabel','note');
  case 'schedule_followup':return has('caseId','caseLabel','dueAt','note')&&Number.isFinite(Date.parse(String(p.dueAt)))&&nullable(p.dogId);
  case 'record_care':return has('dogId','dogLabel','careKind','notes')&&nullable(p.date);
  case 'report_file':return has('title')&&['pdf','docx','xlsx','csv','pptx','geojson','kml'].includes(String(p.format))&&['open_cases','animals','verification','operations_checks'].includes(String(p.source))&&(p.saveTo===null||['google','microsoft','slack','zoho'].includes(String(p.saveTo)))&&nullable(p.saveToName);
  case 'email':return provider()&&has('providerName','subject','body')&&strings(p.to)&&strings(p.cc)&&typeof p.send==='boolean';
  case 'calendar_event':return provider()&&has('providerName','title','start','end')&&strings(p.attendees)&&nullable(p.location);
  case 'chat_post':return provider()&&has('providerName','channel','channelName','text');
  case 'sms':return strings(p.to)&&strings(p.values)&&has('note');
  default:return false;
 }
}
export function isAiReply(v:unknown):v is AiReply {
 if(!object(v)||!text(v.text)||!['model','tools'].includes(String(v.engine)))return false;
 if(!Array.isArray(v.tools)||v.tools.length>24||!v.tools.every(t=>object(t)&&text(t.name,100)&&text(t.summary)&&typeof t.ok==='boolean'))return false;
 if(!Array.isArray(v.citations)||v.citations.length>100||!v.citations.every(c=>object(c)&&text(c.id,160)&&text(c.label,1000)&&['animal','case','programme','place','page'].includes(String(c.kind))&&safeAiHref(c.href)))return false;
 if(!Array.isArray(v.proposals)||v.proposals.length>24||!v.proposals.every(proposal))return false;
 return (v.notice===undefined||text(v.notice))&&(v.navigate===undefined||(object(v.navigate)&&safeAiHref(v.navigate.href)&&text(v.navigate.label)));
}
