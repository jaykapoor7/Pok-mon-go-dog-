/* The database API returns at most 1,000 rows to any one request, whatever `.limit()` asks for (checked on production:
   a request for 5,000 public animals returns rows 0-999 of 2,431). A figure or an export that needs more than that must
   page with `.range()`; one that does not would silently count the first 1,000 and call it the whole. */

export const API_PAGE = 1000;

type Page = PromiseLike<{ data: unknown; error: unknown }>;

/** Every row a ranged read returns, up to `max`, one page of 1,000 at a time. `capped` is true when `max` stopped it. */
export async function allRows<T>(call: (from: number, to: number) => Page, max = 10 * API_PAGE): Promise<{ rows: T[]; capped: boolean }> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += API_PAGE) {
    const { data, error } = await call(from, Math.min(from + API_PAGE, max) - 1);
    if (error) throw error instanceof Error ? error : new Error((error as { message?: string }).message ?? "The read failed.");
    const page = (Array.isArray(data) ? data : []) as T[];
    rows.push(...page);
    if (page.length < Math.min(API_PAGE, max - from)) return { rows, capped: false };
  }
  return { rows, capped: rows.length >= max };
}
