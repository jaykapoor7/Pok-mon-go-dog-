/* ════════════════════════════════════════════════════════════════════
   The register's faces, framed.

   Resident photographs are taken in a hurry: a dog asleep in the corner
   of a doorway, a dog small in the middle of a road. Cropped blind into a
   small tile, most of them showed pavement. These are the photographed
   dogs on the register where the dog is plainly there, each with where it
   sits in its own picture (x, y as percentages) and how far to come in,
   chosen by looking at every photograph. The landing deals from these; if
   the register ever holds fewer than it needs, it falls back to the
   fullest records as before.
   ════════════════════════════════════════════════════════════════════ */

export type Frame = { x: number; y: number; z: number };

export const REGISTER_FRAMES: Record<string, Frame> = {
  "SP-D-W08XQS": { x: 45, y: 45, z: 1.1 },
  "SP-D-NIF7EA": { x: 50, y: 45, z: 1 },
  "SP-D-1PSJE9": { x: 50, y: 55, z: 1.25 },
  "SP-D-32BWO8": { x: 45, y: 45, z: 1.4 },
  "SP-D-W20W2S": { x: 50, y: 55, z: 1.1 },
  "SP-D-4BK5SQ": { x: 50, y: 40, z: 1.3 },
  "SP-D-XYXCBQ": { x: 50, y: 45, z: 1 },
  "SP-D-4UZGIP": { x: 50, y: 48, z: 1.3 },
  "SP-D-C28SA6": { x: 50, y: 55, z: 1.1 },
  "SP-D-8VAXYX": { x: 45, y: 30, z: 1.4 },
  "SP-D-4ZPZT9": { x: 50, y: 55, z: 1.1 },
  "SP-D-A0HO2O": { x: 55, y: 45, z: 1.45 },
  "SP-D-57V788": { x: 50, y: 42, z: 1.1 },
  "SP-D-BYCEC7": { x: 40, y: 55, z: 1.5 },
  "SP-D-LA8EFF": { x: 45, y: 55, z: 1.1 },
  "SP-D-D1IP1P": { x: 50, y: 62, z: 1.4 },
  "SP-D-HV3WU1": { x: 55, y: 40, z: 1.6 },
  "SP-D-Y8H0F9": { x: 50, y: 40, z: 1 },
  "SP-D-IIKLOT": { x: 45, y: 55, z: 1.5 },
  "SP-D-KL1E4B": { x: 50, y: 50, z: 1.1 },
  "SP-D-M22A2O": { x: 35, y: 45, z: 1.6 },
  "SP-D-M3POVF": { x: 50, y: 60, z: 1.2 },
  "SP-D-NXQ3NL": { x: 60, y: 40, z: 1.2 },
  "SP-D-NZ61DD": { x: 45, y: 55, z: 1.1 },
  "SP-D-OW0K2E": { x: 55, y: 38, z: 1.7 },
  "SP-D-R6S5QI": { x: 50, y: 45, z: 1.4 },
  "SP-D-S58N2C": { x: 50, y: 50, z: 1 },
  "SP-D-T4AYYH": { x: 50, y: 50, z: 1.1 },
  "SP-D-V8ZAKM": { x: 55, y: 55, z: 1.4 },
  "SP-D-XCDC2U": { x: 50, y: 40, z: 1.6 },
  "SP-D-ZMRM83": { x: 55, y: 78, z: 1.6 },
  "SP-D-X124P8": { x: 50, y: 45, z: 1 },
  "SP-D-ZUYNX0": { x: 45, y: 45, z: 1.6 },
  "SP-D-9Y5QOX": { x: 45, y: 60, z: 1.1 },
  "SP-D-008KHA": { x: 50, y: 45, z: 1.3 },
  "SP-D-XV8BFQ": { x: 50, y: 50, z: 1 },
};

/** Inline style that brings the dog to the middle of whatever box it is drawn in. */
export function frameStyle(sid: string | null | undefined, damp = 1): Record<string, string> | undefined {
  const f = sid ? REGISTER_FRAMES[sid] : undefined;
  if (!f) return undefined;
  const z = Math.max(1, 1 + (f.z - 1) * damp);
  return { objectPosition: `${f.x}% ${f.y}%`, transformOrigin: `${f.x}% ${f.y}%`, transform: z > 1 ? `scale(${z.toFixed(2)})` : "none" };
}
