/* Recording build: all reads and actions stay in browser-local state. */
import{client}from'../../recording/client';
export const isSupabaseConfigured=true;
export function getSupabase():any{return client;}
export function getSupabaseAdmin():any{return null;}
