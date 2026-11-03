"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {offlineVaultExists,unlockOffline} from '@/lib/field/outbox';
export function OfflineStorage({scope,onUnlock}:{scope:string;onUnlock:()=>void}){
 const [exists,setExists]=useState<boolean|null>(null),[pass,setPass]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let live=true;void offlineVaultExists(scope).then(v=>{if(live)setExists(v)}).catch(()=>{if(live)setError('This browser cannot open device storage. Use the online work queue.')});return()=>{live=false}},[scope]);
 return <div className="ngo-page"><header className="ngo-head"><h1>{exists?'Unlock offline records':'Secure offline work'}</h1><p className="ngo-sum">Field records and photos stay encrypted on this device until you synchronise. Signing out locks them.</p></header>
 {exists===null&&!error?<p role="status">Checking device storage…</p>:<form className="stack" style={{maxWidth:460}} onSubmit={async e=>{e.preventDefault();if(!exists&&pass!==confirm){setError('The passphrases do not match.');return}setBusy(true);setError(null);try{await unlockOffline(scope,pass);setPass('');setConfirm('');onUnlock()}catch(x){setError(x instanceof Error?x.message:'Device records could not be unlocked.')}finally{setBusy(false)}}}>
 <label>Offline passphrase<input aria-label="Offline passphrase" className="input" type="password" autoComplete={exists?'current-password':'new-password'} minLength={10} required value={pass} onChange={e=>setPass(e.target.value)}/></label>
 {!exists&&<><label>Repeat offline passphrase<input aria-label="Repeat offline passphrase" className="input" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><p>Use at least 10 characters. Keep this passphrase safe: StrayPaw cannot recover it. Unsynchronised records remain on this device.</p></>}
 <button className="btn is-ink" disabled={busy||exists===null}>{busy?'Unlocking…':exists?'Unlock offline records':'Enable secure offline work'}</button></form>}
 {error&&<p role="alert">{error}</p>}<p><Link href="/ngo/work">Return to the online work queue</Link></p></div>
}
