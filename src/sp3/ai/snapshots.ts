import {safeAiHref} from './validation';
export type CheckFinding={rule:string;count:number|null;explanation:string;configured?:boolean;dueOn?:string;records:{id:string;label:string;href:string;missing?:string[];due_at?:string}[]};
export type CheckSnapshot={id:string;checked_at:string;rules_version:string;findings:CheckFinding[]};
export function readSnapshot(value:unknown):CheckSnapshot|null{
 if(!value||typeof value!=='object')return null;
 const data=value as Record<string,unknown>;
 if(typeof data.id!=='string'||typeof data.checked_at!=='string'||!Number.isFinite(Date.parse(data.checked_at))||typeof data.rules_version!=='string'||!Array.isArray(data.findings)||!data.findings.length||data.findings.length>20)return null;
 const findings:CheckFinding[]=[];
 for(const raw of data.findings){
  if(!raw||typeof raw!=='object'||typeof raw.rule!=='string'||typeof raw.explanation!=='string')return null;
  const records=(Array.isArray(raw.records)?raw.records:[]).filter((r:Record<string,unknown>)=>r&&typeof r.id==='string'&&typeof r.label==='string'&&safeAiHref(r.href)&&r.href.startsWith('/ngo/'));
  findings.push({rule:raw.rule,count:typeof raw.count==='number'&&Number.isFinite(raw.count)&&raw.count>=0?raw.count:null,explanation:raw.explanation,configured:typeof raw.configured==='boolean'?raw.configured:undefined,dueOn:typeof raw.due_on==='string'&&Number.isFinite(Date.parse(raw.due_on))?raw.due_on:undefined,records});
 }
 return {id:data.id,checked_at:data.checked_at,rules_version:data.rules_version,findings};
}
