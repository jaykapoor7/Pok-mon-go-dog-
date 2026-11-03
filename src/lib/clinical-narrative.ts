/** Show human observations from versioned field records. Complete source notes
 * stay available separately; request identifiers are not clinical prose. */
export function clinicalNarrative(source:string|null|undefined){
 if(!source)return '';
 const match=source.match(/(?:Recorded (?:operation|details):\s*|\n)(\{[^\n]*\})/);
 if(!match)return source;
 try{
  const value=JSON.parse(match[1]) as Record<string,unknown>;
  if(!['lifecycle-v1','arv-field-v1'].includes(String(value.template)))return source;
  const labels:Record<string,string>={procedure:'Procedure',performedBy:'Reported clinician',facility:'Facility',vaccine:'Vaccine',batch:'Batch',dose:'Dose',route:'Route',location:'Location',notes:'Observation'};
  const lines=Object.entries(labels).flatMap(([key,label])=>typeof value[key]==='string'&&value[key] ? `${label}: ${value[key]}` : []);
  return [source.split('\n')[0],...lines].join('\n');
 }catch{return source}
}
