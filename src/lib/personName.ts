/** A person's name as StrayPaw shows it and writes it on records: the name on their account (display_name is what
    StrayPaw's own sign-up stores; full_name and name are what other providers and the One Health accounts carry),
    otherwise the first part of their email with dots and dashes as spaces. Never the whole email address. */
export function personName(meta: Record<string, unknown> | null | undefined, email: string | null | undefined, fallback = "Team member"): string {
  const m = meta ?? {};
  const given = [m.display_name, m.full_name, m.name].find((v): v is string => typeof v === "string" && v.trim().length > 0);
  if (given) return given.trim();
  return email ? email.split("@")[0].replace(/[._-]+/g, " ").trim() || fallback : fallback;
}
