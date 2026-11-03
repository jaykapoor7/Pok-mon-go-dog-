"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {offlineVaultExists,unlockOffline} from '@/lib/field/outbox';
export function OfflineStorage({scope,onUnlock}:{scope:string;onUnlock:()=>void}){
 const [exists,setExists]=useState<boolean|null>(null),[pass,setPass]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let live=true;void offlineVaultExists(scope).then(v=>{if(live)setExists(v)}).catch(()=>{if(live)setError('This browser cannot open device storage. Use the online work queue.')});return()=>{live=false}},[scope]);
 return <div className="ngo-page fd-lock"><header className="ngo-head"><h1>{exists?'Unlock offline records':'Secure offline work'}</h1><p className="ngo-sum">Field records and photos stay encrypted on this device until you synchronise. Signing out locks them.</p></header>
 {exists===null&&!error?<p role="status">Checking device storage…</p>:<form className="stack" style={{maxWidth:460}} onSubmit={async e=>{e.preventDefault();if(!exists&&pass!==confirm){setError('The passphrases do not match.');return}setBusy(true);setError(null);try{await unlockOffline(scope,pass);setPass('');setConfirm('');onUnlock()}catch(x){setError(x instanceof Error?x.message:'Device records could not be unlocked.')}finally{setBusy(false)}}}>
 <div className="field"><label htmlFor="fd-pass">Offline passphrase</label><input id="fd-pass" className="input" type="password" autoComplete={exists?'current-password':'new-password'} minLength={10} required value={pass} onChange={e=>setPass(e.target.value)}/></div>
 {!exists&&<><div className="field"><label htmlFor="fd-pass2">Repeat offline passphrase</label><input id="fd-pass2" className="input" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></div><p className="fd-hint">Use at least 10 characters. Keep this passphrase safe: StrayPaw cannot recover it. Unsynchronised records remain on this device.</p></>}
 <button className="btn is-ink" disabled={busy||exists===null}>{busy?'Unlocking…':exists?'Unlock offline records':'Enable secure offline work'}</button></form>}
 {error&&<p role="alert" className="fd-err">{error}</p>}<Link className="btn is-s fd-back" href="/ngo/work">Work online instead</Link></div>
}
