/** A case code as people read it. Imported codes such as
 *  SPC-47A86E67E8E443BD920C8838432C7F15 are shortened to SPC-47A86E (and
 *  SPA-DOG-497C3A… to SPA-DOG-497C3A); the full
 *  code stays in the record, in search and in exports. */
export function shortCode(code: string | null | undefined, fallback = "Case"): string {
  if (!code) return fallback;
  const m = /^([A-Z]{2,5}(?:-[A-Z]{2,5})?)-([0-9A-F]{12,})$/i.exec(code);
  return m ? `${m[1]}-${m[2].slice(0, 6).toUpperCase()}` : code;
}
