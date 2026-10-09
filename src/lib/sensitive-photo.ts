/* ════════════════════════════════════════════════════════════════════
   Which photographs are shown blurred until a viewer chooses to see them.

   Blurred: a cover photo a reviewer or the photo check marked sensitive
   (dogs.photo_sensitive), any photo of an animal currently flagged as
   needing help, and every photo attached to a case, medical record,
   fundraiser or incoming report, where injury is the usual subject.
   A person can always reveal it with one tap.
   ════════════════════════════════════════════════════════════════════ */

export type SensitiveFields = { photo_sensitive?: boolean | null; needs_help?: boolean | null };

/** True when an animal's cover photo should start blurred. */
export function isSensitivePhoto(a: SensitiveFields | null | undefined): boolean {
  return !!(a && (a.photo_sensitive || a.needs_help));
}

const INJURY_WORDS = /\b(injur|wound|bleed|blood|fractur|maggot|myiasis|burn|hit by|accident|limp|mange|sick|ill\b|dead|deceased)/i;

/** True when a sighting's words or tags describe an injury. */
export function describesInjury(...texts: (string | string[] | null | undefined)[]): boolean {
  return texts.some((t) => (Array.isArray(t) ? t.some((x) => INJURY_WORDS.test(x)) : !!t && INJURY_WORDS.test(t)));
}
