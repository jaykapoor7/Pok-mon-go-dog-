"use client";
/* The offline PIN: set once per phone, entered when field mode opens.
   Field records and photos stay encrypted on the phone until they sync;
   signing out locks them. StrayPaw cannot recover a forgotten PIN, so the
   records that have not synced stay on the phone. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { offlineVaultExists, unlockOffline } from "@/lib/field/outbox";
import "./offline.css";

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

export function OfflineStorage({ scope, onUnlock, onPage = false }: { scope: string; onUnlock: () => void; onPage?: boolean }) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [pin, setPin] = useState(""), [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => { let live = true; void offlineVaultExists(scope).then((v) => { if (live) setExists(v); }).catch(() => { if (live) setError("This browser cannot store records offline. Use the online work queue."); }); return () => { live = false; }; }, [scope]);
  const ready = pin.length === 6 && (exists || again.length === 6);
  return (
    <div className="ofl-pin">
      <span className="ofl-ic" aria-hidden><Lock size={18} /></span>
      <h1>{exists ? "Enter your offline PIN" : "Set an offline PIN"}</h1>
      <p>{exists ? "Unlocks the field records saved on this phone." : "Records are saved encrypted on this phone and sync when there is signal. You'll use this PIN whenever you work offline."}</p>
      {exists === null && !error ? <p role="status" className="ofl-quiet">Checking this phone…</p> : (
        <form onSubmit={async (e) => { e.preventDefault(); if (!exists && pin !== again) { setError("The PINs do not match."); return; } setBusy(true); setError(null); try { await unlockOffline(scope, pin); setPin(""); setAgain(""); onUnlock(); } catch (x) { setError(x instanceof Error && /decrypt|operation/i.test(x.message) ? "That PIN is not right." : x instanceof Error ? x.message : "The PIN could not be checked."); } finally { setBusy(false); } }}>
          <label className="ofl-l" htmlFor="ofl-pin">{exists ? "PIN" : "New PIN"}</label>
          <input id="ofl-pin" className="ofl-in" type="password" inputMode="numeric" autoComplete={exists ? "current-password" : "new-password"} pattern="\d{6}" maxLength={6} value={pin} onChange={(e) => setPin(digits(e.target.value))} autoFocus required />
          {!exists && <><label className="ofl-l" htmlFor="ofl-pin2">Repeat PIN</label><input id="ofl-pin2" className="ofl-in" type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{6}" maxLength={6} value={again} onChange={(e) => setAgain(digits(e.target.value))} required /></>}
          <button className="btn is-ink" disabled={busy || !ready}>{busy ? "Checking…" : exists ? "Unlock" : "Set PIN"}</button>
        </form>
      )}
      {error && <p role="alert" className="ofl-err">{error}</p>}
      {!onPage && <p className="ofl-links"><Link href="/ngo/field">Field mode</Link><Link href="/ngo/work">Work online</Link></p>}
    </div>
  );
}
