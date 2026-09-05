"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { saveVolunteer } from "@/lib/volunteer";

/* ════════════════════════════════════════════════════════════════════
   Typing the code.

   One box, six characters, and whatever happens next is decided by the
   code rather than by the person choosing between things they have no way
   of telling apart. A staff code lands them in their organisation's
   dashboard; a volunteer's code sets them up to report and sends them
   to the camera.

   Nothing about the code is checked here. The box only tidies what is
   typed, so pasting "paws-3k9 2xr" out of a message still works.
   ════════════════════════════════════════════════════════════════════ */

type Staff = {
  kind: "staff";
  tokenHash: string;
  email: string;
  name: string | null;
  role: string;
  orgName: string;
};
type Volunteer = {
  kind: "volunteer";
  code: string;
  name: string | null;
  orgName: string;
};

export function JoinClient({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState((initialCode ?? "").toUpperCase());
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const tried = useRef(false);

  useEffect(() => {
    box.current?.focus();
  }, []);

  function clean(v: string) {
    return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  }

  async function submit(value?: string) {
    const entered = clean(value ?? code);
    if (entered.length < 4) {
      setError("A StrayPaw code is six characters.");
      return;
    }
    setBusy(true);
    setError(null);
    setStep("Checking your code");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: entered }),
      });
      const data = (await res.json()) as (Staff | Volunteer) & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "That code did not work.");
        return;
      }

      if (data.kind === "volunteer") {
        saveVolunteer({
          code: entered,
          name: data.name ?? "",
          orgName: data.orgName,
        });
        setWelcome(`You are reporting for ${data.orgName}.`);
        setStep("Opening the reporting page");
        router.push("/report");
        return;
      }

      /* Staff. The server has issued a one-time token bound to their email;
         exchanging it here is what actually creates the session, so it is
         Supabase that signs them in, not us. */
      const supa = getSupabase();
      if (!supa) {
        setError("StrayPaw could not reach its account service. Try again shortly.");
        return;
      }
      setStep("Signing you in");
      const { data: session, error: otpError } = await supa.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "email",
      });
      if (otpError || !session?.session) {
        setError("That code is valid but the sign-in did not complete. Try once more.");
        return;
      }

      setStep(`Opening ${data.orgName}`);
      await fetch("/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ code: entered, action: "claim" }),
      });

      setWelcome(
        data.name
          ? `Welcome, ${data.name.split(" ")[0]}. Opening ${data.orgName}.`
          : `Opening ${data.orgName}.`
      );
      router.push("/partner");
      router.refresh();
    } catch {
      setError("Could not reach StrayPaw. Check your connection and try again.");
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  /* A code that arrives in a link is submitted for them. Once only, so a
     failed one does not retry itself on every render. */
  useEffect(() => {
    if (initialCode && !tried.current) {
      tried.current = true;
      submit(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  return (
    <div className="join-wrap">
      <div className="join-card">
        {/* Somebody who opened this by mistake, or wants to look at the site
            first, needs a way out that is not the browser's back gesture. */}
        <Link className="join-back" href="/">
          <ArrowLeft size={15} /> Back to StrayPaw
        </Link>
        <h1>Enter your code</h1>
        <p className="join-lede">
          Six characters, from whoever added you to an organisation on
          StrayPaw. There is no password: this code is how you sign in, every
          time. Keep it somewhere you can find it.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="join-code" className="join-label">
            Your code
          </label>
          <input
            id="join-code"
            ref={box}
            className="join-code"
            value={code}
            onChange={(e) => setCode(clean(e.target.value))}
            placeholder="XXXXXX"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={8}
            disabled={busy}
            aria-describedby={error ? "join-error" : undefined}
          />

          <button type="submit" className="join-go" disabled={busy || code.length < 4}>
            {busy ? (
              <>
                <Loader2 size={16} className="imp-spin" /> {step ?? "Working"}
              </>
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {error && (
          <p id="join-error" role="alert" className="join-error">
            {error}
          </p>
        )}
        {welcome && <p className="join-welcome">{welcome}</p>}

        <p className="join-foot">
          No code? If your organisation already uses StrayPaw, ask your team
          lead for one. Anyone can report a street animal without a code at{" "}
          <a href="/report">the reporting page</a>.
        </p>
      </div>
    </div>
  );
}
