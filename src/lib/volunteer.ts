"use client";

/* The volunteer's organisation code and name, remembered on their device.

   A field volunteer types these once. Asking again on every report is the
   friction the invite-code path exists to remove, so this persists across
   visits. It is a convenience, not a credential: the code is re-checked on
   the server for every single report, and this store only saves retyping.

   Storage access is wrapped because reading localStorage throws outright in
   private mode and under some enterprise policies. Someone in that state
   simply retypes the code, which is a far better outcome than the page
   failing to load. */

const KEY = "straypaw.volunteer.v1";

export type VolunteerSession = {
  code: string;
  name: string;
  orgName: string;
};

export function readVolunteer(): VolunteerSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<VolunteerSession>;
    if (!v?.code || !v?.name) return null;
    return { code: v.code, name: v.name, orgName: v.orgName ?? "your organisation" };
  } catch {
    return null;
  }
}

export function saveVolunteer(v: VolunteerSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* Nothing to persist to. They will be asked again next time. */
  }
}

export function clearVolunteer(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Already effectively cleared. */
  }
}

/** Checks a code with the server and returns the organisation it belongs to. */
export async function verifyCode(
  code: string
): Promise<{ ok: true; orgName: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/volunteer/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = (await res.json()) as { ok?: boolean; orgName?: string; error?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? "That code did not work." };
    }
    return { ok: true, orgName: data.orgName ?? "your organisation" };
  } catch {
    return { ok: false, error: "Could not reach StrayPaw. Check your connection." };
  }
}
