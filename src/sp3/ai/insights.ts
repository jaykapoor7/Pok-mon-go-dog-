import 'server-only';
import type {ToolCtx,ToolOut} from './tools';
import type {Citation} from './types';
export async function operationsInsights({db,orgId}:ToolCtx):Promise<ToolOut>{
 if(!orgId)return {ok:false,summary:'Needs an organisation workspace',data:{error:'Organisation access required'},citations:[]};
 const {data,error}=await db.rpc('kaju_refresh_checks');
 if(error||!data)return {ok:false,summary:'The operational checks could not run. Try again.',data:{error:'Check unavailable; findings are unknown'},citations:[]};
 const citations:Citation[]=[];
 for(const finding of data.findings??[]) for(const r of finding.records??[]) if(citations.length<12&&!citations.some(c=>c.id===r.id))citations.push({id:r.id,label:r.label,href:r.href,kind:finding.rule==='programme_activity'?'programme':'case'});
 return {data,summary:`Checked ${data.findings?.length??0} operational rules`,citations,proposals:[{id:crypto.randomUUID(),kind:'report_file',why:'Review the latest explained check results',format:'pdf',source:'operations_checks',title:'Operations check report',saveTo:null,saveToName:null}]};
}
