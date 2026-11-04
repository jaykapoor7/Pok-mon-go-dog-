import { KajuFace } from "@/kaju/Kaju";

/** Kaju's face in a role's colour: the same Kaju, a different job. */
export function RoleFace({ color, size = 44 }: { color: string; size?: number }) {
  return <span className="s7a-face" style={{ ["--c" as string]: color, width: size + 16, height: size + 16 }}><KajuFace size={size} /></span>;
}

/** Kaju itself recoloured for a role, with no tile behind it. */
export function RoleBot({ tint, size = 34 }: { tint: string; size?: number }) {
  return <span className="s7a-bot" style={{ filter: tint }} aria-hidden><KajuFace size={size} /></span>;
}
