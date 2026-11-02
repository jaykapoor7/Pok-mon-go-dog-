/** Preview is bound to the isolated staging project, including opaque keys. */
export const STAGING_SUPABASE_REF='ucxfxiddufwqithtdtix';
export function allowedServerProject(url:string,key:string,environment?:string):boolean{
 try{
  const target=new URL(url);
  if(environment==='preview'&&(target.protocol!=='https:'||target.hostname!==`${STAGING_SUPABASE_REF}.supabase.co`))return false;
  if(key.split('.').length===3){
   const segment=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
   const claims=JSON.parse(atob(segment));
   return claims?.role==='service_role'&&typeof claims.ref==='string'&&target.hostname===`${claims.ref}.supabase.co`;
  }
  // Supabase validates opaque secret keys at the configured project endpoint.
  return environment!=='preview'||key.startsWith('sb_secret_');
 }catch{return false}
}
