import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabase } from "@/lib/supabase";
import { notifyTelegram, moderateUrl } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public "Can you help?" submission. Goes through the server so we can alert the
// operator on Telegram. Falls back to the anon RPC if the service role isn't set.
export async function POST(req: Request) {
  let body: {
    name?: string;
    contact?: string;
    message?: string | null;
    isNgo?: boolean;
    ngoName?: string | null;
    dogId?: string | null;
    zone?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const contact = (body.contact ?? "").trim();
  if (!name || !contact) {
    return NextResponse.json({ error: "Name and contact are required." }, { status: 400 });
  }

  const supa = getSupabaseAdmin() ?? getSupabase();
  if (!supa) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const isNgo = Boolean(body.isNgo);
  const { error } = await supa.rpc("submit_helper", {
    p_name: name,
    p_contact: contact,
    p_message: body.message ? String(body.message) : null,
    p_is_ngo: isNgo,
    p_ngo_name: body.ngoName ? String(body.ngoName) : null,
    p_dog_id: body.dogId ? String(body.dogId) : null,
    p_zone: body.zone ? String(body.zone) : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  notifyTelegram(
    `${isNgo ? "🤝 <b>New NGO registration</b>" : "🙋 <b>New volunteer</b>"}\n${
      isNgo && body.ngoName ? `${body.ngoName} — ` : ""
    }${name} · ${contact}${body.zone ? `\nArea: ${body.zone}` : ""}\nView → ${moderateUrl}`
  );

  return NextResponse.json({ ok: true });
}
