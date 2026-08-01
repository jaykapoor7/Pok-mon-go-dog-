"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, LogIn, HeartHandshake, Check, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  isNgoMember,
  getMyPartnerRequestStatus,
  requestPartnerAccess,
} from "@/lib/actions";

/**
 * Gates the operator surfaces (dashboard / cases) to VERIFIED partner NGOs.
 * Non-members get a "request access" screen; the request lands in /moderate for
 * the founder to approve, which inserts them into ngo_members.
 *
 * Note: this is a UI/positioning gate. Case data (no PII; exact pins already
 * NGO-gated server-side) is still fetched server-side; true data-level gating
 * would need cookie/SSR sessions (tracked as a follow-up).
 */
export function PartnerGate({ title, children }: { title: string; children: ReactNode }) {
  const { user, ready, openSignIn } = useAuth();
  const [member, setMember] = useState<boolean | null>(null);
  const [reqStatus, setReqStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setMember(false);
      return;
    }
    let alive = true;
    isNgoMember()
      .then((ok) => {
        if (!alive) return;
        setMember(ok);
        if (!ok) getMyPartnerRequestStatus().then((s) => alive && setReqStatus(s)).catch(() => {});
      })
      .catch(() => alive && setMember(false));
    return () => {
      alive = false;
    };
  }, [ready, user?.id]);

  if (!ready || member === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-paw-500" />
      </div>
    );
  }

  if (member) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <div className="card p-6 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-bark-500">
          The partner console is for verified rescues &amp; NGOs — claim and resolve
          cases, coverage &amp; herd-immunity stats, and your own funder report.
        </p>

        {!user ? (
          <button onClick={openSignIn} className="btn-primary mt-5 w-full py-3">
            <LogIn className="h-4 w-4" /> Sign in to continue
          </button>
        ) : reqStatus === "pending" ? (
          <div className="mt-5 rounded-2xl bg-status-hungry/10 px-4 py-3 text-sm font-medium text-bark-700 dark:text-bark-200">
            <Check className="mr-1 inline h-4 w-4 text-status-vaccinated" />
            Request received — we&apos;ll review and enable your access shortly.
          </div>
        ) : reqStatus === "rejected" ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-bark-500">
              A previous request wasn&apos;t approved. If you think that&apos;s a mistake,
              reach out or request again.
            </p>
            <RequestForm onDone={() => setReqStatus("pending")} />
          </div>
        ) : (
          <div className="mt-5">
            <RequestForm onDone={() => setReqStatus("pending")} />
          </div>
        )}
      </div>
    </div>
  );
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!orgName.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestPartnerAccess({
        orgName: orgName.trim(),
        area: area.trim(),
        contact: contact.trim(),
        message: message.trim(),
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

  return (
    <div className="space-y-2.5 text-left">
      <p className="text-center text-sm font-semibold">Request partner access</p>
      <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Organisation / rescue name" className={field} />
      <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area you cover (e.g. South Delhi)" className={field} />
      <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={`Contact (phone/email)${user?.name ? ` for ${user.name}` : ""}`} className={field} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Anything we should know (optional)" className={`${field} resize-none`} />
      {error && <p className="text-sm font-medium text-status-injured">{error}</p>}
      <button onClick={submit} disabled={busy || !orgName.trim()} className="btn-primary w-full py-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
        Request access
      </button>
      <p className="text-center text-[11px] text-bark-400">
        We verify each partner before enabling case tools.
      </p>
    </div>
  );
}
