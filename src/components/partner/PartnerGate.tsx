"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { Loader2, ShieldCheck, LogIn, HeartHandshake, Check } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  isNgoMember,
  getMyPartnerRequestStatus,
  requestPartnerAccess,
} from "@/lib/actions";

/**
 * The operator surfaces are READABLE BY ANYONE, an NGO evaluating StrayPaw,
 * a funder checking what the workspace actually looks like, or a resident
 * curious about how cases get handled should not hit a wall.
 *
 * What membership controls is the records themselves. Case data loads through
 * a session-scoped RPC, so signed out or unverified the workspace renders
 * genuinely empty, the rows never reach the page rather than being hidden in
 * the markup.
 *
 * Consumers read `usePartnerAccess()` to decide whether to render a control or
 * a prompt. This component no longer blocks its children.
 */
const AccessCtx = createContext<{ member: boolean; ready: boolean }>({
  member: false,
  ready: false,
});

/** Whether the current viewer may write, and whether we know yet. */
export function usePartnerAccess() {
  return useContext(AccessCtx);
}

export function PartnerGate({ title, children }: { title: string; children: ReactNode }) {
  const { user, ready, openSignIn } = useAuth();
  const [member, setMember] = useState<boolean | null>(null);
  const [reqStatus, setReqStatus] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  /* Depend on the id, not the object: a new user object with the same id
     should not refetch membership. */
  const userId = user?.id;

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
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
  }, [ready, userId]);

  const resolved = ready && member !== null;

  return (
    <AccessCtx.Provider value={{ member: member === true, ready: resolved }}>
      {resolved && !member && !dismissed && (
        /* A callout is what Alert is for. This was a styled div doing the
           same job without the role="alert" that tells a screen reader
           something has appeared, and re-specifying its own border, tint and
           icon placement. */
        <Alert className="mb-5">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>You are not signed in, so no records are loaded.</AlertTitle>
          <AlertDescription>
            <p className="leading-relaxed">
              Look around freely. Case records load once you sign in with a
              verified organisation account, and each NGO sees only its own, so
              nothing here is another org&apos;s data.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!user ? (
                <Button size="sm" onClick={openSignIn}>
                  <LogIn className="h-4 w-4" /> Sign in
                </Button>
              ) : reqStatus === "pending" ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                  <Check className="h-4 w-4 text-status-vaccinated" />
                  Request received, we&apos;ll enable your access shortly.
                </span>
              ) : (
                <RequestForm onDone={() => setReqStatus("pending")} compact />
              )}
              <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </AccessCtx.Provider>
  );
}

function RequestForm({
  onDone,
  compact = false,
}: {
  onDone: () => void;
  /** Renders as a single button that reveals the form, for the inline banner. */
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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
    "w-full rounded border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

  /* In the inline banner the full form is too heavy, so it stays behind one
     button until the viewer actually wants it. */
  if (compact && !expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="btn-primary px-4 py-2 text-[13px]">
        <HeartHandshake className="h-4 w-4" /> Request partner access
      </button>
    );
  }

  return (
    <div className="w-full space-y-2.5 text-left">
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
      <p className="text-center text-[11.5px] text-bark-400">
        We verify each partner before enabling case tools.
      </p>
    </div>
  );
}
