import "./seal.css";

/* ════════════════════════════════════════════════════════════════════
   The seal of an animal with no photograph yet.

   Seven of the map's cells, which of them are filled read off the
   animal's own record id, so every unphotographed animal carries a mark
   of its own and the same animal always carries the same one. The ground
   is hatched: on this record, hatching means "not recorded", and what is
   not recorded here is the photograph. A named animal keeps its initial in
   the middle cell. It is an identifier, not a picture of the animal.
   ════════════════════════════════════════════════════════════════════ */

const SQ3 = Math.sqrt(3);
const RING: [number, number][] = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function hexPts(cx: number, cy: number, r: number) {
  let d = "";
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 90);
    d += `${k ? " " : ""}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return d;
}

/** A real name someone gave the animal, not an imported label or a placeholder. */
export function givenName(name: string | null | undefined) {
  const n = name?.trim();
  return n && !/^(unknown|unnamed|dog|cat|animal|puppy|an animal|animal record|no name)\b/i.test(n) && !n.includes(" · ") ? n : null;
}

/** The seal as SVG markup, for places that build DOM by hand (map markers). */
export function sealMarkup(seed: string, name?: string | null) {
  const bits = hash(seed || "straypaw");
  const initial = givenName(name)?.slice(0, 1).toUpperCase() ?? null;
  const r = 13.2, step = 14.2;
  let cells = "";
  RING.forEach(([q, rr], i) => {
    const x = 50 + step * SQ3 * (q + rr / 2), y = 50 + step * 1.5 * rr;
    // The middle cell is filled unless it carries an initial; around it, one bit of the id each, at least one filled.
    const on = i === 0 ? !initial : ((bits >> (i * 3)) & 1) === 1 || i === 1 + (bits % 6);
    cells += `<polygon points="${hexPts(x, y, r)}" class="${on ? "as-on" : "as-off"}"/>`;
  });
  const letter = initial ? `<text x="50" y="50" class="as-l" text-anchor="middle" dominant-baseline="central">${initial.replace(/[<>&"]/g, "")}</text>` : "";
  return `<svg class="as-svg" viewBox="0 0 100 100" aria-hidden="true">${cells}${letter}</svg>`;
}

/** The seal on its hatched ground, filling whatever holds it. */
export function AnimalSeal({ seed, name, label, caption = false }: { seed: string; name?: string | null; label?: string; caption?: boolean }) {
  return (
    <span className="as" role="img" aria-label={label ?? `${givenName(name) ?? "This animal"}: no photograph yet`}>
      <span className="as-mark" dangerouslySetInnerHTML={{ __html: sealMarkup(seed, name) }} />
      {caption && <span className="as-cap">No photograph yet</span>}
    </span>
  );
}
