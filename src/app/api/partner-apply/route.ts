import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INBOX = "jaykapoor7@outlook.com";

function esc(s: string) {
  return String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
}

export async function POST(req: Request) {
  let body: {
    org_name?: string; contact_name?: string; email?: string; phone?: string;
    city?: string; website?: string; about?: string; documents?: { name: string; url: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const org_name = (body.org_name ?? "").trim().slice(0, 160);
  const email = (body.email ?? "").trim().slice(0, 200);
  const about = (body.about ?? "").trim().slice(0, 5000);
  if (!org_name || !about || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please add your organisation name, a valid email, and tell us about your work." }, { status: 400 });
  }

  const row = {
    org_name,
    contact_name: (body.contact_name ?? "").trim().slice(0, 160) || null,
    email,
    phone: (body.phone ?? "").trim().slice(0, 40) || null,
    city: (body.city ?? "").trim().slice(0, 120) || null,
    website: (body.website ?? "").trim().slice(0, 200) || null,
    about,
    documents: Array.isArray(body.documents) ? body.documents.slice(0, 12) : [],
  };

  const supa = getSupabaseAdmin();
  if (supa) {
    const { error } = await supa.from("partner_applications").insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const docs = (row.documents as { name: string; url: string }[]).map((d) => `<li><a href="${esc(d.url)}">${esc(d.name)}</a></li>`).join("");
  await sendEmail({
    to: INBOX,
    subject: `[StrayPaw] Partnership application - ${org_name}`,
    html: `<p><strong>${esc(org_name)}</strong> applied to partner.</p>
      <p>Contact: ${esc(row.contact_name ?? "")} · ${esc(email)} · ${esc(row.phone ?? "")}</p>
      <p>City: ${esc(row.city ?? "")} · Website: ${esc(row.website ?? "")}</p>
      <hr/><p>${esc(about).replace(/\n/g, "<br/>")}</p>
      ${docs ? `<p><strong>Documents:</strong></p><ul>${docs}</ul>` : ""}`,
    text: `${org_name} applied to partner.\nContact: ${row.contact_name} <${email}> ${row.phone}\nCity: ${row.city}\nWebsite: ${row.website}\n\n${about}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
