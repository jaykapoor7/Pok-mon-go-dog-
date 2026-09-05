/* ════════════════════════════════════════════════════════════════════
   ChipParts, the four components of an FDX-B animal transponder, drawn
   to their real proportions (the capsule is ~12mm x 2.1mm, so ~5.7:1).

   These are illustrations of actual hardware, not sci-fi props: a glass
   capsule, a polymer anti-migration cap, a ferrite rod wound with fine
   copper wire, and a silicon die with gold bond wires. Plain SVG, so it
   stays crisp at any scale and needs no WebGL.

   Two things do the work of making these read as objects rather than
   diagrams. One light, from the upper left, so every highlight sits on
   the same edge and every shadow falls the same way. And materials that
   behave: glass has a hard specular streak and a soft caustic under it,
   polymer scatters into a wide dull sheen, copper has a warm bounce on
   its shadow side, silicon is near-black with an oily iridescence.

   Drawn at 2x the layout size (viewBox 640x112, rendered at 320x56) so
   fine detail like the winding highlights survives on a phone.
   ════════════════════════════════════════════════════════════════════ */

const W = 320;
const H = 56;
const VB = "0 0 640 112";

/* Real transponders carry several hundred turns. Drawing every one turns
   to mush at display size, so this is the density that still reads as
   "finely wound". */
const TURNS = 44;

/* Shared axis. Every part is built around the same centreline and the same
   body length, which is what lets them stack into one capsule when closed. */
const CY = 56;
const BODY_X0 = 70;
const BODY_X1 = 570;

export function GlassCapsule() {
  return (
    <svg viewBox={VB} width={W} height={H} fill="none">
      <defs>
        {/* Body tint: bright at the top where the sky hits it, dark through
            the middle, then a second lift at the bottom from light bending
            back up through the tube. */}
        <linearGradient id="gc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f2ff" stopOpacity="0.42" />
          <stop offset="22%" stopColor="#9fc2ff" stopOpacity="0.16" />
          <stop offset="52%" stopColor="#3f5680" stopOpacity="0.06" />
          <stop offset="54%" stopColor="#2c3f66" stopOpacity="0.20" />
          <stop offset="82%" stopColor="#5f86c8" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#cfe2ff" stopOpacity="0.40" />
        </linearGradient>
        {/* Edges read brighter than the middle because you are looking
            through more glass at a glancing angle. */}
        <linearGradient id="gc-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#dbe9ff" stopOpacity="0.95" />
          <stop offset="10%" stopColor="#9fc2ff" stopOpacity="0.40" />
          <stop offset="90%" stopColor="#9fc2ff" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#dbe9ff" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="gc-spec" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="18%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="46%" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="74%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gc-caustic" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8fb7ff" stopOpacity="0" />
          <stop offset="35%" stopColor="#a8ccff" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#a8ccff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8fb7ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="gc-endcap" cx="0.35" cy="0.32" r="0.8">
          <stop offset="0%" stopColor="#f2f7ff" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#9fc2ff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#41598c" stopOpacity="0.30" />
        </radialGradient>
      </defs>

      {/* body */}
      <rect
        x={BODY_X0}
        y={CY - 32}
        width={BODY_X1 - BODY_X0}
        height={64}
        rx={32}
        fill="url(#gc-body)"
      />
      <rect
        x={BODY_X0}
        y={CY - 32}
        width={BODY_X1 - BODY_X0}
        height={64}
        rx={32}
        stroke="url(#gc-rim)"
        strokeWidth={1.6}
      />

      {/* Inner wall, a second line inset from the outline. Without it the
          shape reads as a solid lozenge rather than a tube. */}
      <rect
        x={BODY_X0 + 7}
        y={CY - 25}
        width={BODY_X1 - BODY_X0 - 14}
        height={50}
        rx={25}
        stroke="#bcd6ff"
        strokeOpacity={0.22}
        strokeWidth={1}
      />

      {/* Domed ends. The right end is the sealed tip, drawn slightly fuller. */}
      <ellipse
        cx={BODY_X0 + 22}
        cy={CY}
        rx={16}
        ry={30}
        fill="url(#gc-endcap)"
        stroke="#cfe2ff"
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      <ellipse
        cx={BODY_X1 - 20}
        cy={CY}
        rx={14}
        ry={29}
        fill="url(#gc-endcap)"
        stroke="#cfe2ff"
        strokeOpacity={0.3}
        strokeWidth={1}
      />

      {/* Key specular: a long thin streak riding the upper shoulder. */}
      <rect
        x={BODY_X0 + 26}
        y={CY - 24}
        width={BODY_X1 - BODY_X0 - 60}
        height={7}
        rx={3.5}
        fill="url(#gc-spec)"
      />
      {/* Secondary, tighter and dimmer, just under the first. */}
      <rect
        x={BODY_X0 + 64}
        y={CY - 14}
        width={BODY_X1 - BODY_X0 - 150}
        height={2.4}
        rx={1.2}
        fill="#ffffff"
        opacity={0.2}
      />

      {/* Caustic: the bright line light leaves along the bottom of a tube. */}
      <rect
        x={BODY_X0 + 34}
        y={CY + 20}
        width={BODY_X1 - BODY_X0 - 76}
        height={3.2}
        rx={1.6}
        fill="url(#gc-caustic)"
      />
    </svg>
  );
}

export function AntiMigrationCap() {
  /* The ribs are the functional part: they let tissue knit into the sleeve
     so the transponder stays where it was placed. */
  const RIBS = 7;
  const x0 = 150;
  const x1 = 470;
  const step = (x1 - x0) / (RIBS - 1);

  return (
    <svg viewBox={VB} width={W} height={H} fill="none">
      <defs>
        {/* Polymer scatters, so the highlight is wide and soft rather than a
            hard line like the glass. */}
        <linearGradient id="am-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9d0f5" />
          <stop offset="26%" stopColor="#7e9fd6" />
          <stop offset="60%" stopColor="#4a6699" />
          <stop offset="88%" stopColor="#334973" />
          <stop offset="100%" stopColor="#54739f" />
        </linearGradient>
        <linearGradient id="am-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="am-open" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b2942" />
          <stop offset="100%" stopColor="#334973" />
        </linearGradient>
      </defs>

      <rect
        x={120}
        y={CY - 26}
        width={380}
        height={52}
        rx={26}
        fill="url(#am-body)"
      />

      {/* Ribs. Each is a bright edge with its own shadow just behind it,
          which is what makes a moulded surface read as raised. */}
      {Array.from({ length: RIBS }, (_, i) => {
        const x = x0 + i * step;
        return (
          <g key={i}>
            <rect
              x={x}
              y={CY - 21}
              width={3}
              height={42}
              rx={1.5}
              fill="#0f1a2e"
              opacity={0.34}
            />
            <rect
              x={x - 2.6}
              y={CY - 21}
              width={2.4}
              height={42}
              rx={1.2}
              fill="#d3e3ff"
              opacity={0.34}
            />
          </g>
        );
      })}

      {/* Open end: this sleeve slides over the capsule, so one end is a bore. */}
      <ellipse cx={128} cy={CY} rx={13} ry={26} fill="url(#am-open)" />
      <ellipse
        cx={128}
        cy={CY}
        rx={13}
        ry={26}
        stroke="#9db9e8"
        strokeOpacity={0.5}
        strokeWidth={1.2}
      />
      <ellipse cx={128} cy={CY} rx={7} ry={17} fill="#0b1220" opacity={0.75} />

      <rect
        x={150}
        y={CY - 20}
        width={330}
        height={9}
        rx={4.5}
        fill="url(#am-sheen)"
      />
      <rect
        x={140}
        y={CY - 26}
        width={360}
        height={52}
        rx={26}
        stroke="#c2d8ff"
        strokeOpacity={0.22}
        strokeWidth={1}
      />
    </svg>
  );
}

export function AntennaCoil() {
  const x0 = 116;
  const x1 = 524;
  const span = x1 - x0;
  const step = span / (TURNS - 1);

  return (
    <svg viewBox={VB} width={W} height={H} fill="none">
      <defs>
        {/* Ferrite is a dull dark grey, near-black in shadow. */}
        <linearGradient id="ac-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a5468" />
          <stop offset="40%" stopColor="#232c3e" />
          <stop offset="100%" stopColor="#12192a" />
        </linearGradient>
        {/* Copper: bright warm top, deep red-brown shadow, then a warm bounce
            at the very bottom. Skipping that bounce is what makes drawn metal
            look like plastic. */}
        <linearGradient id="ac-wire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="22%" stopColor="#e5a163" />
          <stop offset="55%" stopColor="#a35f2c" />
          <stop offset="82%" stopColor="#6b3a19" />
          <stop offset="100%" stopColor="#c8823f" />
        </linearGradient>
        <linearGradient id="ac-lead" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e5a163" />
          <stop offset="100%" stopColor="#8a5323" />
        </linearGradient>
        <radialGradient id="ac-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#e8a465" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#e8a465" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Warm ambient the copper throws onto its surroundings. */}
      <ellipse cx={320} cy={CY} rx={250} ry={44} fill="url(#ac-glow)" />

      {/* Ferrite rod, showing past the winding at both ends. */}
      <rect x={96} y={CY - 11} width={448} height={22} rx={11} fill="url(#ac-core)" />
      <rect
        x={96}
        y={CY - 11}
        width={448}
        height={4}
        rx={2}
        fill="#7b879e"
        opacity={0.35}
      />

      {/* Windings. Each turn is an ellipse, and the ellipse narrows toward the
          ends of the rod: that foreshortening is what gives the coil its
          barrel shape instead of reading as a flat striped bar. */}
      {Array.from({ length: TURNS }, (_, i) => {
        const t = i / (TURNS - 1);
        const x = x0 + i * step;
        // 1 at the middle, ~0.82 at the ends.
        const f = 0.82 + 0.18 * Math.sin(Math.PI * t);
        const ry = 19 * f;
        return (
          <g key={i}>
            <ellipse
              cx={x}
              cy={CY}
              rx={3.4}
              ry={ry}
              fill="none"
              stroke="url(#ac-wire)"
              strokeWidth={3.4}
            />
            {/* Specular nick on the upper-left of each turn, the same place on
                every one, which is what makes it read as one light. */}
            <path
              d={`M ${x - 2.4} ${CY - ry * 0.62} q 1.6 -3.4 4 -4.6`}
              stroke="#ffe6c2"
              strokeOpacity={0.75}
              strokeWidth={1.3}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );
      })}

      {/* Leads to the die. */}
      <path
        d={`M ${x0 - 4} ${CY - 6} C ${x0 - 40} ${CY - 26}, 74 ${CY - 30}, 56 ${CY - 20}`}
        stroke="url(#ac-lead)"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${x1 + 4} ${CY + 6} C ${x1 + 40} ${CY + 26}, 566 ${CY + 30}, 588 ${CY + 18}`}
        stroke="url(#ac-lead)"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function SiliconDie() {
  const dx = 236;
  const dy = CY - 26;
  const dw = 168;
  const dh = 52;
  const PADS = 6;

  return (
    <svg viewBox={VB} width={W} height={H} fill="none">
      <defs>
        {/* Silicon is nearly black, with an oily blue-violet sheen where the
            light grazes it. */}
        <linearGradient id="sd-die" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#33456b" />
          <stop offset="30%" stopColor="#1d2942" />
          <stop offset="62%" stopColor="#141d33" />
          <stop offset="100%" stopColor="#2a2340" />
        </linearGradient>
        <linearGradient id="sd-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8fb7ff" stopOpacity="0" />
          <stop offset="40%" stopColor="#b9d3ff" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#c9a8ff" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="sd-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe8ac" />
          <stop offset="50%" stopColor="#e2b559" />
          <stop offset="100%" stopColor="#9a7226" />
        </linearGradient>
        <linearGradient id="sd-wire" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffe9b0" />
          <stop offset="100%" stopColor="#a37c2c" />
        </linearGradient>
      </defs>

      {/* Contact shadow, so the die sits on something. */}
      <ellipse cx={320} cy={CY + 32} rx={110} ry={7} fill="#000000" opacity={0.35} />

      <rect x={dx} y={dy} width={dw} height={dh} rx={4} fill="url(#sd-die)" />
      <rect
        x={dx}
        y={dy}
        width={dw}
        height={dh}
        rx={4}
        stroke="#7f9ad0"
        strokeOpacity={0.4}
        strokeWidth={1}
      />
      <rect x={dx} y={dy} width={dw} height={14} rx={4} fill="url(#sd-sheen)" />

      {/* Circuitry: a coarse block and finer traces. Suggestive of a layout
          without pretending to be a real one. */}
      <rect
        x={dx + 30}
        y={dy + 19}
        width={52}
        height={18}
        rx={2}
        stroke="#9fc2ff"
        strokeOpacity={0.45}
        strokeWidth={1}
        fill="#8fb7ff"
        fillOpacity={0.07}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <rect
          key={`t${i}`}
          x={dx + 94}
          y={dy + 14 + i * 4}
          width={54 - (i % 3) * 13}
          height={1.4}
          fill="#8fb7ff"
          opacity={0.38}
        />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <rect
          key={`v${i}`}
          x={dx + 16 + i * 4}
          y={dy + 16}
          width={1.4}
          height={dh - 32}
          fill="#8fb7ff"
          opacity={0.28}
        />
      ))}

      {/* Gold bond pads along both long edges. */}
      {Array.from({ length: PADS }, (_, i) => {
        const x = dx + 16 + i * ((dw - 32) / (PADS - 1));
        return (
          <g key={`p${i}`}>
            <rect x={x - 5} y={dy - 4} width={10} height={7} rx={1.5} fill="url(#sd-gold)" />
            <rect x={x - 5} y={dy + dh - 3} width={10} height={7} rx={1.5} fill="url(#sd-gold)" />
          </g>
        );
      })}

      {/* Bond wires: fine gold arcs out to the coil leads. The arc is real,
          the loop is what stops the wire snapping under thermal movement. */}
      <path
        d={`M ${dx + 16} ${dy - 2} C ${dx - 40} ${dy - 34}, ${dx - 96} ${dy - 8}, ${dx - 132} ${dy + 14}`}
        stroke="url(#sd-wire)"
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${dx + dw - 16} ${dy + dh + 2} C ${dx + dw + 44} ${dy + dh + 32}, ${dx + dw + 104} ${dy + dh + 4}, ${dx + dw + 136} ${dy + dh - 16}`}
        stroke="url(#sd-wire)"
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
