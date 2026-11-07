/* Feature flags.

   Anything not yet verified end to end, or not yet approved for its users,
   ships switched off. A flag turns on only when its name appears in the
   deployment's SP_FLAGS (comma separated), so production stays as it is
   until someone deliberately lists the flag there. Medical and public
   experiences additionally need their own release checks (see readiness.ts);
   a flag alone never makes them public. */

export const FLAGS = {
  citizen_bite_assist: "Bite or scratch help for citizens (prototype, awaiting clinical review)",
  training_lms: "Training courses, assignments and completion records",
  animal_identifiers: "RFID, microchip and QR identifiers on animal records",
  readiness_board: "Module readiness board for staff",
} as const;

export type Flag = keyof typeof FLAGS;

/* Read literally so Next.js inlines it into browser code: navigation in the
   browser can then hide links to pages the server would refuse anyway. */
const PUBLIC_FLAGS = process.env.NEXT_PUBLIC_SP_FLAGS ?? "";

/** The flags switched on for this deployment. Unknown names are ignored. */
export function enabledFlags(env: Record<string, string | undefined> = process.env): Set<Flag> {
  const raw = `${env.SP_FLAGS ?? ""},${env === process.env ? PUBLIC_FLAGS : env.NEXT_PUBLIC_SP_FLAGS ?? ""}`;
  const on = new Set<Flag>();
  for (const part of raw.split(",")) {
    const name = part.trim() as Flag;
    if (name && name in FLAGS) on.add(name);
  }
  return on;
}

export const flagOn = (name: Flag, env: Record<string, string | undefined> = process.env) => enabledFlags(env).has(name);
