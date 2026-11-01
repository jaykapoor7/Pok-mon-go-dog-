import "server-only";

/* Organisation SMS through MSG91 (India). Indian rules (TRAI DLT) allow only
   pre-registered templates from a registered sender, so Kaju fills the
   template's variables; it never writes free text. Set MSG91_AUTH_KEY and
   MSG91_TEMPLATE_ID (a Flow template approved on DLT). */
export const smsConfigured = () => !!process.env.MSG91_AUTH_KEY?.trim() && !!process.env.MSG91_TEMPLATE_ID?.trim();

export function normaliseIndian(n: string): string | null {
  const d = n.replace(/[^\d]/g, "").replace(/^0+/, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d;
  return /^[6-9]\d{9}$/.test(ten) ? `91${ten}` : null;
}

export async function sendSms(to: string[], values: string[]): Promise<{ id: string; count: number }> {
  const mobiles = [...new Set(to.map(normaliseIndian).filter((x): x is string => !!x))].slice(0, 50);
  if (!mobiles.length) throw new Error("Add at least one valid Indian mobile number.");
  const vars = Object.fromEntries(values.slice(0, 5).map((v, i) => [`var${i + 1}`, v.replace(/[\r\n]+/g, " ").slice(0, 30)]));
  const r = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: { authkey: process.env.MSG91_AUTH_KEY!.trim(), "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ template_id: process.env.MSG91_TEMPLATE_ID!.trim(), short_url: "0", recipients: mobiles.map((mobiles) => ({ mobiles, ...vars })) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.type === "error") throw new Error(`MSG91: ${j.message ?? r.status}`);
  return { id: String(j.message ?? "sent"), count: mobiles.length };
}
