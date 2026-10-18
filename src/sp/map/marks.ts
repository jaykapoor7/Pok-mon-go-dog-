/* ════════════════════════════════════════════════════════════════════
   The Map's marks, drawn on canvas when first needed.

   CITY ROSETTE   a twelve-petal flower: its size is the lens's count;
                  under Animals its petals are the city's recorded
                  sterilisation (teal recorded sterilised, terracotta
                  recorded not, pale not recorded), rounded to twelfths.
                  A register kept only at city level is drawn hollow and
                  dashed: it cannot open into streets.
   AREA BLOOM     a scalloped disc in the lens's class colour, ringed with
                  a dotted line; an area whose dates were never recorded is
                  hatched, never coloured as old.
   ANIMAL PAW     one inked paw per recorded animal, coloured by its
                  recorded sterilisation; a small ring marks a photograph.

   Colour meanings live here and in the key only. Art never encodes data.
   ════════════════════════════════════════════════════════════════════ */

export const MARK = {
  ink: "#2a1d17", paper: "#fbf3e2",
  ster: { yes: "#1b8a8f", no: "#e0673f", unknown: "#d9cbb0" },
};

type Img = { width: number; height: number; data: Uint8ClampedArray };
const draw = (w: number, h: number, fn: (g: CanvasRenderingContext2D) => void): Img => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.lineJoin = "round"; g.lineCap = "round"; fn(g);
  return { width: w, height: h, data: g.getImageData(0, 0, w, h).data };
};

/** Rosette: `parts` are petal counts per colour, summing to 12. */
export const ROSETTE_PX = 128;
export function rosette(parts: [number, string][], hollow: boolean): Img {
  const S = ROSETTE_PX, c = S / 2, R = S * 0.46, r0 = S * 0.2;
  return draw(S, S, (g) => {
    const colors: string[] = [];
    for (const [n, col] of parts) for (let i = 0; i < n; i++) colors.push(col);
    while (colors.length < 12) colors.push(MARK.ster.unknown);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2, w = (Math.PI / 12) * 0.92;
      g.beginPath();
      g.moveTo(c + Math.cos(a - w) * r0, c + Math.sin(a - w) * r0);
      g.quadraticCurveTo(c + Math.cos(a - w * 1.25) * R * 0.92, c + Math.sin(a - w * 1.25) * R * 0.92, c + Math.cos(a) * R, c + Math.sin(a) * R);
      g.quadraticCurveTo(c + Math.cos(a + w * 1.25) * R * 0.92, c + Math.sin(a + w * 1.25) * R * 0.92, c + Math.cos(a + w) * r0, c + Math.sin(a + w) * r0);
      g.closePath();
      if (!hollow) { g.fillStyle = colors[i]; g.fill(); }
      g.strokeStyle = MARK.ink; g.lineWidth = hollow ? 2.4 : 2;
      g.setLineDash(hollow ? [5, 4] : []); g.stroke();
      /* The fine inner line of a Madhubani petal: a second stroke inside the first. */
      if (!hollow) {
        g.setLineDash([]); g.strokeStyle = "rgba(255,250,236,0.75)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(c + Math.cos(a) * (r0 + 6), c + Math.sin(a) * (r0 + 6)); g.lineTo(c + Math.cos(a) * (R - 9), c + Math.sin(a) * (R - 9)); g.stroke();
      }
    }
    g.setLineDash([]);
    g.beginPath(); g.arc(c, c, r0 + 1, 0, Math.PI * 2); g.fillStyle = MARK.paper; g.fill(); g.strokeStyle = MARK.ink; g.lineWidth = 2; g.stroke();
    g.fillStyle = MARK.ink;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * r0 * 0.6, c + Math.sin(a) * r0 * 0.6, 1.5, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(c, c, 3.4, 0, Math.PI * 2); g.fill();
  });
}

/** Petals per colour for a city's recorded sterilisation, out of twelve. */
export function sterPetals(yes: number, no: number, unknown: number): [number, string][] {
  const t = yes + no + unknown; if (!t) return [[12, MARK.ster.unknown]];
  let y = Math.round((yes / t) * 12), n = Math.round((no / t) * 12);
  if (yes && !y) y = 1; if (no && !n) n = 1; if (y + n > 12) n = 12 - y;
  return [[y, MARK.ster.yes], [n, MARK.ster.no], [12 - y - n, MARK.ster.unknown]];
}

/** Area bloom. `fill` is a colour, or "hatch" for undated. */
export const BLOOM_PX = 96;
export function bloom(fill: string): Img {
  const S = BLOOM_PX, c = S / 2, R = S * 0.44;
  return draw(S, S, (g) => {
    const path = (k: number) => { g.beginPath(); for (let i = 0; i <= 120; i++) { const t = (i / 120) * Math.PI * 2, r = k * R * (0.9 + 0.1 * Math.cos(t * 10)); const x = c + Math.cos(t) * r, y = c + Math.sin(t) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
    path(1);
    if (fill === "hatch") {
      g.fillStyle = MARK.paper; g.fill(); g.save(); g.clip();
      g.strokeStyle = "rgba(42,29,23,0.55)"; g.lineWidth = 1.6;
      for (let x = -S; x < S * 2; x += 9) { g.beginPath(); g.moveTo(x, S); g.lineTo(x + S, 0); g.stroke(); }
      g.restore(); path(1); g.setLineDash([6, 4]);
    } else { g.fillStyle = fill; g.fill(); }
    g.strokeStyle = MARK.ink; g.lineWidth = 2.6; g.stroke(); g.setLineDash([]);
    if (fill !== "hatch") {
      g.fillStyle = "rgba(255,250,236,0.9)";
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * R * 0.66, c + Math.sin(a) * R * 0.66, 1.9, 0, Math.PI * 2); g.fill(); }
    }
  });
}

/** Animal paw, `ring` when the record holds a photograph, `sel` when chosen. */
export const PAW_PX = 64;
export function paw(fill: string, ring: boolean, sel = false): Img {
  const S = PAW_PX, c = S / 2;
  return draw(S, S, (g) => {
    if (ring || sel) { g.beginPath(); g.arc(c, c, S * 0.46, 0, Math.PI * 2); g.fillStyle = sel ? "#fff6d6" : MARK.paper; g.fill(); g.strokeStyle = sel ? "#d9452b" : MARK.ink; g.lineWidth = sel ? 4 : 2.2; g.stroke(); }
    const k = ring || sel ? 0.78 : 1;
    const blob = (x: number, y: number, rx: number, ry: number, rot = 0) => { g.beginPath(); g.ellipse(c + x * k, c + y * k, rx * k, ry * k, rot, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); g.strokeStyle = MARK.ink; g.lineWidth = 2.2; g.stroke(); };
    blob(0, 7, 11, 9);
    blob(-12, -5, 4.6, 6, -0.35); blob(-4.2, -11.5, 4.6, 6.2, -0.1); blob(4.2, -11.5, 4.6, 6.2, 0.1); blob(12, -5, 4.6, 6, 0.35);
  });
}

/** A small dashed ring: the edge of the record, an area bordering recorded ones with nothing in it. */
export function edgeRing(): Img {
  const S = 64, c = S / 2;
  return draw(S, S, (g) => { g.beginPath(); g.arc(c, c, S * 0.4, 0, Math.PI * 2); g.setLineDash([3, 5]); g.strokeStyle = "rgba(42,29,23,0.45)"; g.lineWidth = 2; g.stroke(); });
}
