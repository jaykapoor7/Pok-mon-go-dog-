import type { Session, SupabaseClient } from "@supabase/supabase-js";

/* ════════════════════════════════════════════════════════════════════
   Turning a one-time token into a session.

   The server mints the token with generateLink({ type: "magiclink" }),
   and both sign-in screens then handed it to verifyOtp with
   type: "email". Those are different token types. supabase-js lists them
   separately for a reason: "email" is the six-digit email OTP, and
   "magiclink" is the hashed token a magic link carries. Which of the two
   a given GoTrue release will accept for a magiclink token has changed
   between versions, which is exactly the kind of thing that works on one
   project and fails on another with nothing in the browser to say why.

   So it asks for what it was actually given first, and falls back to the
   other rather than betting the whole sign-in on one string.

   The real error comes back with the result. The screens used to say
   "That code is valid but the sign-in did not complete", which tells the
   person nothing and tells whoever has to fix it even less.
   ════════════════════════════════════════════════════════════════════ */

export type ExchangeResult =
  | { session: Session; error: null }
  | { session: null; error: string };

export async function exchangeToken(
  supa: SupabaseClient,
  tokenHash: string
): Promise<ExchangeResult> {
  const types = ["magiclink", "email"] as const;
  let lastError = "";

  for (const type of types) {
    const { data, error } = await supa.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data?.session) return { session: data.session, error: null };
    if (error) lastError = error.message;
  }

  return {
    session: null,
    error: lastError || "The sign-in link could not be exchanged.",
  };
}
