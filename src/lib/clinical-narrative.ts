/** Display the human observations from versioned field records without rendering
 * request identifiers and JSON as clinical prose. The complete source is retained. */
export function clinicalNarrative(source:string|null|undefined){
 if(!source)return'';
 const match=source.match(/Recorded (?:operation|details):\s*(\{[^\n]*\})/);
 if(!match)return source;
 try{const value=JSON.parse(match[1]) as Record<string,unknown>;const labels:Record<string,string>={procedure:'Procedure',performedBy:'Reported clinician',facility:'Facility',vaccine:'Vaccine',batch:'Batch',dose:'Dose',route:'Route',location:'Location',notes:'Observation'};const lines=Object.entries(labels).flatMap(([key,label])=>typeof value[key]==='string'&&value[key]?`${label}: ${value[key]}`:[]);return [source.split('\n')[0],...lines].join('\n')}catch{return source}
}
