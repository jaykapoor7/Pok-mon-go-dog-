/** A failure as a person reads it: never a stack name or a database message. */
export function friendlyError(message: string | null | undefined): string {
  const m = message ?? "";
  if (/abort|timeout|timed out|fetch failed|network|failed to fetch/i.test(m)) return "This took longer than expected.";
  if (/permission|not allowed|row-level|rls|jwt|denied/i.test(m)) return "Your account cannot read this.";
  if (/only part of the record/i.test(m)) return "Only part of the record loaded.";
  if (!m || /[{}<>]|error:|exception|relation|column|syntax|pgrst/i.test(m)) return "Something went wrong while reading.";
  return m.replace(/\.?$/, ".");
}
