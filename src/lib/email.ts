// ─────────────────────────────────────────────────────────────
// Server-only transactional email via Resend (https://resend.com).
// No SDK — just the REST API. No-ops silently when RESEND_API_KEY is unset, so
// email COLLECTION works immediately and SENDING switches on once you add the
// key (+ a verified sending domain) and set EMAIL_FROM.
//   RESEND_API_KEY  — from Resend dashboard
//   EMAIL_FROM      — e.g. "StrayPaw <hello@straypaw.kapoorjay.com>"
// ─────────────────────────────────────────────────────────────

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.kapoorjay.com";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "StrayPaw <hello@straypaw.kapoorjay.com>";
  if (!key) return false; // not configured — collection still works
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** "Your sighting is live" email sent when a reporter's sighting is approved. */
export async function sendSightingLiveEmail(
  to: string,
  reporterName: string | null,
  dogId: string
): Promise<boolean> {
  const dogUrl = `${SITE}/dog/${dogId}`;
  const hi = reporterName ? `Hi ${reporterName},` : "Hi,";
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#17150f">
    <div style="font-size:22px;font-weight:800;color:#97431f">🐾 StrayPaw</div>
    <p style="font-size:16px;line-height:1.5;margin-top:16px">${hi}</p>
    <p style="font-size:16px;line-height:1.5">Great news — the street dog you reported is now <b>live on the map</b>. Thank you for helping keep track of the dogs in your area.</p>
    <p style="margin:24px 0">
      <a href="${dogUrl}" style="background:#b4552d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;display:inline-block">See the dog on StrayPaw →</a>
    </p>
    <p style="font-size:14px;color:#54564a;line-height:1.5">Spotted another dog? <a href="${SITE}/report" style="color:#b4552d">Report it here.</a></p>
    <hr style="border:none;border-top:1px solid #e7e6dd;margin:24px 0">
    <p style="font-size:12px;color:#a3a292">You got this because you left your email when reporting a sighting on StrayPaw. We only email you about your reports.</p>
  </div>`;
  const text = `${hi}\n\nThe street dog you reported is now live on the map: ${dogUrl}\n\nThank you for helping. Spotted another dog? Report it: ${SITE}/report\n\n— StrayPaw`;
  return sendEmail({ to, subject: "Your StrayPaw sighting is now live 🐾", html, text });
}
