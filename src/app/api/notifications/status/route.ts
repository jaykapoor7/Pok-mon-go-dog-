import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
/* Which outside channels this deployment can deliver through. Public, non-secret: whether each is configured, and the
   push service's public key (which browsers need to subscribe). */
export function GET() {
  const pushKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
  return NextResponse.json({ email: !!process.env.RESEND_API_KEY?.trim(), push: !!(pushKey && process.env.VAPID_PRIVATE_KEY?.trim() && process.env.VAPID_SUBJECT?.trim()), pushKey, sms: false, whatsapp: false }, { headers: { "Cache-Control": "no-store" } });
}
