/** Retry only reads whose semantics we know. PostgREST RPCs use POST even
 * for SELECTs, so the allowlist prevents replaying a write. */
const READ_RPCS = new Set([
  "list_public_spatial_cities", "list_public_org_impacts", "count_public_case_stories",
  "list_org_spatial_cities", "list_org_spatial_cells",
]);

function isRead(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!url.pathname.startsWith("/rest/v1/")) return false;
  if (method === "GET" || method === "HEAD") return true;
  return method === "POST" && url.pathname.includes("/rpc/") && READ_RPCS.has(url.pathname.split("/").pop() ?? "");
}

/** A bounded, one-retry fetch for public/server read paths.  Writes and caller
 * cancellations are never replayed. */
export function createBoundedSupabaseFetch({ request = fetch, timeoutMs = 7_000, retryDelayMs = 250 }: {
  request?: typeof fetch; timeoutMs?: number; retryDelayMs?: number;
} = {}): typeof fetch {
  return async (input, init) => {
    const caller = init?.signal ?? (input instanceof Request ? input.signal : null);
    const attempts = isRead(input, init) ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController();
      const onCallerAbort = () => controller.abort(caller?.reason);
      caller?.addEventListener("abort", onCallerAbort, { once: true });
      if (caller?.aborted) onCallerAbort();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await request(input, { ...init, signal: controller.signal });
        if (response.status < 500 || attempt + 1 >= attempts || caller?.aborted) return response;
        await response.body?.cancel();
      } catch (error) {
        if (caller?.aborted || attempt + 1 >= attempts) throw error;
        if (!(error instanceof TypeError || (error instanceof Error && error.name === "AbortError"))) throw error;
      } finally {
        clearTimeout(timer);
        caller?.removeEventListener("abort", onCallerAbort);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
    }
    throw new Error("Database read attempts exhausted.");
  };
}
