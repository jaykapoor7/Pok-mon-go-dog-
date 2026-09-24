/* "Not recorded", drawn. The same 45° line at the same weight as the CSS
   --sp-hatch, so a band, a unit square and a hexagon all say it the same
   way. Every SVG that can show an unknown carries one of these with its
   own id (ids must be unique per document). */
export function HatchDef({ id, night = false, size = 6 }: { id: string; night?: boolean; size?: number }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width={size} height={size} fill="none" />
      <line x1="0" y1="0" x2="0" y2={size} strokeWidth="1.6" style={{ stroke: night ? "rgba(239,231,218,0.32)" : "var(--sp-hatch-line)" }} />
    </pattern>
  );
}
