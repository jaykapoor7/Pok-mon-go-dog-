/* ════════════════════════════════════════════════════════════════════
   ChipParts — the four components of an FDX-B animal transponder, drawn
   to their real proportions (the capsule is ~12mm × 2.1mm, so ~5.7:1).

   These are illustrations of actual hardware, not sci-fi props: a glass
   capsule, a polymer anti-migration cap, a ferrite rod wound with fine
   copper wire, and a silicon die with gold bond wires. Each is a plain
   SVG so it stays crisp at any scale and needs no WebGL.
   ════════════════════════════════════════════════════════════════════ */

const W = 320;
const H = 56;

/* Winding count for the antenna coil. Real transponders carry several
   hundred turns; drawing every one turns to mush on screen, so this is the
   density that still reads as "finely wound" at display size. */
const TURNS = 46;

export function GlassCapsule() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none">
      <defs>
        <linearGradient id="cap-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe0ff" stopOpacity="0.30" />
          <stop offset="38%" stopColor="#8fb7ff" stopOpacity="0.10" />
          <stop offset="72%" stopColor="#5f7cb8" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#cfe0ff" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id="cap-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b8d1ff" stopOpacity="0.9" />
          <stop offset="18%" stopColor="#8fb7ff" stopOpacity="0.45" />
          <stop offset="82%" stopColor="#8fb7ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#b8d1ff" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="cap-spec" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="62%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* body */}
      <rect
        x="1" y="1" width={W - 2} height={H - 2}
        rx={(H - 2) / 2}
        fill="url(#cap-glass)"
        stroke="url(#cap-rim)"
        strokeWidth="1.2"
      />
      {/* specular streak along the upper curve */}
      <path
        d={`M 26 15 Q ${W / 2} 6 ${W - 26} 15`}
        stroke="url(#cap-spec)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* faint lower bounce light */}
      <path
        d={`M 40 ${H - 12} Q ${W / 2} ${H - 5} ${W - 40} ${H - 12}`}
        stroke="#b8d1ff"
        strokeOpacity="0.2"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* domed end seams — where the glass is fire-sealed */}
      <ellipse cx="27" cy={H / 2} rx="7" ry={H / 2 - 5} stroke="#8fb7ff" strokeOpacity="0.3" strokeWidth="0.9" />
      <ellipse cx={W - 27} cy={H / 2} rx="7" ry={H / 2 - 5} stroke="#8fb7ff" strokeOpacity="0.3" strokeWidth="0.9" />
    </svg>
  );
}

export function AntiMigrationCap() {
  /* Ribbed polymer sleeve that sits over one end; tissue anchors to it so
     the transponder does not travel under the skin. */
  const ribs = Array.from({ length: 9 }, (_, i) => 30 + i * 6.2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none">
      <defs>
        <linearGradient id="cap-poly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d7bb5" />
          <stop offset="45%" stopColor="#33507f" />
          <stop offset="100%" stopColor="#20344f" />
        </linearGradient>
      </defs>
      <g>
        <path
          d={`M 24 ${H / 2 - 20} h 62 a 20 20 0 0 1 0 40 h -62 a 20 20 0 0 1 0 -40 z`}
          fill="url(#cap-poly)"
          stroke="#8fb7ff"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        {ribs.map((x) => (
          <line
            key={x}
            x1={x} y1={H / 2 - 15} x2={x} y2={H / 2 + 15}
            stroke="#9fc0ff" strokeOpacity="0.28" strokeWidth="1.1"
          />
        ))}
        {/* highlight on the crown of the sleeve */}
        <path
          d={`M 30 ${H / 2 - 14} h 56`}
          stroke="#cfe0ff" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function AntennaCoil() {
  /* Ferrite rod wound with fine enamelled copper. The winding is what picks
     up the reader's field and powers the die — there is no battery. */
  const x0 = 66;
  const x1 = 254;
  const step = (x1 - x0) / TURNS;
  const cy = H / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none">
      <defs>
        <linearGradient id="coil-ferrite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d5568" />
          <stop offset="50%" stopColor="#2a3140" />
          <stop offset="100%" stopColor="#191e28" />
        </linearGradient>
        <linearGradient id="coil-wire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="42%" stopColor="#e39b5a" />
          <stop offset="100%" stopColor="#8a542a" />
        </linearGradient>
      </defs>

      {/* ferrite core */}
      <rect x={x0 - 12} y={cy - 7} width={x1 - x0 + 24} height="14" rx="3" fill="url(#coil-ferrite)" />

      {/* windings — each turn is an ellipse arc across the rod */}
      <g stroke="url(#coil-wire)" strokeWidth="1.5" strokeLinecap="round">
        {Array.from({ length: TURNS }, (_, i) => {
          const x = x0 + i * step;
          return (
            <path
              key={i}
              d={`M ${x} ${cy + 11} C ${x + step * 1.5} ${cy + 5}, ${x + step * 1.5} ${cy - 5}, ${x} ${cy - 11}`}
              opacity={0.55 + 0.45 * Math.abs(Math.sin(i * 0.55))}
            />
          );
        })}
      </g>

      {/* enamel sheen across the top of the winding */}
      <path
        d={`M ${x0} ${cy - 9} L ${x1} ${cy - 9}`}
        stroke="#ffe6c4" strokeOpacity="0.34" strokeWidth="1.6" strokeLinecap="round"
      />
      {/* lead-out wires heading for the die */}
      <path
        d={`M ${x1} ${cy - 8} q 16 -2 24 -12`}
        stroke="#e39b5a" strokeOpacity="0.85" strokeWidth="1.3" fill="none" strokeLinecap="round"
      />
      <path
        d={`M ${x1} ${cy + 8} q 16 2 24 12`}
        stroke="#e39b5a" strokeOpacity="0.85" strokeWidth="1.3" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

export function SiliconDie() {
  /* The IC itself: a speck of silicon carrying the 15-digit code, wire-bonded
     to the coil. Traces and pads drawn as they actually sit on a die. */
  const dx = 128;
  const dy = 10;
  const dw = 64;
  const dh = 36;
  const pads = [0, 1, 2, 3];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none">
      <defs>
        <linearGradient id="die-si" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3c4c6b" />
          <stop offset="46%" stopColor="#1d2739" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="die-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd98a" />
          <stop offset="100%" stopColor="#c98b32" />
        </linearGradient>
      </defs>

      {/* die substrate */}
      <rect x={dx} y={dy} width={dw} height={dh} rx="2.5" fill="url(#die-si)" stroke="#8fb7ff" strokeOpacity="0.55" strokeWidth="1" />
      {/* circuit traces */}
      <g stroke="#8fb7ff" strokeOpacity="0.42" strokeWidth="0.7">
        <path d={`M ${dx + 8} ${dy + 7} h 22 v 9 h 16`} fill="none" />
        <path d={`M ${dx + 8} ${dy + 15} h 12 v 12 h 26`} fill="none" />
        <path d={`M ${dx + 8} ${dy + 24} h 30`} fill="none" />
        <path d={`M ${dx + 44} ${dy + 6} v 12 h 12`} fill="none" />
        <path d={`M ${dx + 20} ${dy + 30} h 30 v -6`} fill="none" />
      </g>
      {/* the logic block at the centre of the die */}
      <rect x={dx + 22} y={dy + 12} width={20} height={13} rx="1" fill="#8fb7ff" fillOpacity="0.16" stroke="#8fb7ff" strokeOpacity="0.5" strokeWidth="0.7" />

      {/* bond pads down each side */}
      {pads.map((i) => (
        <rect key={`l${i}`} x={dx - 3} y={dy + 5 + i * 8} width="5" height="4.5" rx="0.8" fill="url(#die-gold)" />
      ))}
      {pads.map((i) => (
        <rect key={`r${i}`} x={dx + dw - 2} y={dy + 5 + i * 8} width="5" height="4.5" rx="0.8" fill="url(#die-gold)" />
      ))}
      {/* gold bond wires arcing off to the coil leads */}
      <path d={`M ${dx - 2} ${dy + 7} q -22 -4 -34 6`} stroke="url(#die-gold)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d={`M ${dx + dw + 2} ${dy + 29} q 22 4 34 -6`} stroke="url(#die-gold)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export const CHIP_W = W;
export const CHIP_H = H;
