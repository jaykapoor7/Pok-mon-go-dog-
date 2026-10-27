import { createHmac, timingSafeEqual } from "node:crypto";

export function equalSecret(a: string, b: string) {
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function validSignature(raw: Uint8Array, signature: string | null, secret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

export async function boundedBody(req: Request, limit = 1024 * 1024): Promise<Uint8Array> {
  if (Number(req.headers.get("content-length")) > limit) throw new Error("body_too_large");
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new Error("body_too_large"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
