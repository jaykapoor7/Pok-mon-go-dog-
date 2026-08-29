// ─────────────────────────────────────────────────────────────
// Editorial line-art illustrations for the "How we work" journey.
//
// Style rules (kept consistent across all six):
//   • 480×340 viewBox with room for a wide horizontal scene
//   • one recurring protagonist — the indie street dog — same
//     silhouette in every scene so the story reads as one animal
//   • warm cream backdrop + bark-800 line work + paw-blue for
//     any information/data element the platform contributes
//   • no gradients, no drop shadows — flat editorial look
// ─────────────────────────────────────────────────────────────

const LINE = "#3c342a";          // bark-800 — main line work
const DOG = "#a67c52";           // warm indie-dog fur
const DOG_DARK = "#6d4f30";      // ears / details
const CREAM = "#e5d9c7";         // warm neutral fill
const PAPER = "#faf7f2";         // section background
const ACCENT = "#3b82f6";        // paw-blue — data / platform
const NOTICE = "#f59e0b";        // warm amber — the "notice" beat
const CARE = "#10b981";          // green — the "act" / care beat
const PIN = "#ef4444";           // red — location markers

/** The recurring dog silhouette. Positioned by parent via `transform`. */
function DogSilhouette({ transform, flip = false }: { transform?: string; flip?: boolean }) {
  return (
    <g transform={transform}>
      <g transform={flip ? "scale(-1, 1)" : undefined}>
        {/* Body */}
        <ellipse cx="0" cy="0" rx="42" ry="15" fill={DOG} />
        {/* Chest / shoulder */}
        <circle cx="30" cy="-4" r="14" fill={DOG} />
        {/* Neck bridge */}
        <ellipse cx="40" cy="-10" rx="8" ry="10" fill={DOG} />
        {/* Head */}
        <circle cx="52" cy="-16" r="12" fill={DOG} />
        {/* Muzzle */}
        <ellipse cx="65" cy="-13" rx="9" ry="5" fill={DOG} />
        {/* Nose */}
        <circle cx="72" cy="-13" r="2" fill={DOG_DARK} />
        {/* Eye */}
        <circle cx="55" cy="-19" r="1.6" fill={DOG_DARK} />
        {/* Ears — upright indie-dog triangles */}
        <polygon points="46,-30 52,-27 47,-14" fill={DOG_DARK} />
        <polygon points="55,-30 60,-14 60,-27" fill={DOG} />
        {/* Legs (front + back, 4 total) */}
        <rect x="-25" y="12" width="5" height="20" rx="2" fill={DOG} />
        <rect x="-15" y="12" width="5" height="20" rx="2" fill={DOG_DARK} />
        <rect x="18" y="12" width="5" height="20" rx="2" fill={DOG_DARK} />
        <rect x="28" y="12" width="5" height="20" rx="2" fill={DOG} />
        {/* Tail — curving up */}
        <path d="M -40 -4 Q -55 -20 -48 -30" stroke={DOG} strokeWidth="6" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

/** A minimal person silhouette. */
function Person({ x, y, phone = false, size = 1, color = LINE }: { x: number; y: number; phone?: boolean; size?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Head */}
      <circle cx="0" cy="0" r="7" fill={CREAM} />
      {/* Torso */}
      <path d="M 0 7 L 0 32 M -8 32 L -8 52 M 6 32 L 6 52" />
      {/* Arms */}
      <path d="M 0 14 L -10 24 M 0 14 L 9 22" />
      {phone && <rect x="6" y="19" width="6" height="9" rx="1" fill={ACCENT} stroke={ACCENT} />}
    </g>
  );
}

/** Shared frame — a warm rounded backdrop the illustrations sit inside. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect x="0" y="0" width="480" height="340" rx="16" fill={PAPER} />
      {children}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 01 · Notice — a dog on the street, a passerby noticing
// ─────────────────────────────────────────────────────────────
export function NoticeIllustration() {
  return (
    <Frame>
      {/* Ground line */}
      <line x1="0" y1="260" x2="480" y2="260" stroke={LINE} strokeWidth="1.5" />
      {/* Sidewalk hatch */}
      <g stroke={LINE} strokeWidth="1" opacity="0.35">
        {[40, 120, 200, 280, 360, 440].map((x) => <line key={x} x1={x} y1={260} x2={x - 12} y2={278} />)}
      </g>
      {/* Streetlamp on left */}
      <line x1="70" y1="260" x2="70" y2="90" stroke={LINE} strokeWidth="2" />
      <path d="M 70 90 L 100 90" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="98" r="10" fill={NOTICE} stroke={LINE} strokeWidth="1.5" />
      {/* Light cast — subtle */}
      <path d="M 100 108 L 70 260 L 140 260 Z" fill={NOTICE} opacity="0.14" />
      {/* Distant building suggestion */}
      <path d="M 380 260 L 380 150 L 440 130 L 460 150 L 460 260" fill="none" stroke={LINE} strokeWidth="1.4" opacity="0.35" />
      <line x1="405" y1="200" x2="418" y2="200" stroke={LINE} strokeWidth="1.2" opacity="0.35" />
      <line x1="440" y1="200" x2="453" y2="200" stroke={LINE} strokeWidth="1.2" opacity="0.35" />
      {/* Dog */}
      <DogSilhouette transform="translate(220 245)" />
      {/* Person on right with phone, glancing */}
      <Person x={340} y={195} phone />
      {/* Dashed "notice" line from phone toward the dog */}
      <line x1="340" y1="210" x2="290" y2="240" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.75" />
      {/* Small "spark" of notice */}
      <circle cx="290" cy="240" r="4" fill={ACCENT} opacity="0.85" />
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────
// 02 · Make visible — the sighting becomes structured data
// ─────────────────────────────────────────────────────────────
export function MakeVisibleIllustration() {
  return (
    <Frame>
      {/* Ground line */}
      <line x1="0" y1="270" x2="480" y2="270" stroke={LINE} strokeWidth="1.5" />
      {/* Camera viewfinder brackets */}
      <g stroke={LINE} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M 130 130 L 100 130 L 100 160" />
        <path d="M 380 130 L 410 130 L 410 160" />
        <path d="M 130 260 L 100 260 L 100 230" />
        <path d="M 380 260 L 410 260 L 410 230" />
      </g>
      {/* Dog inside frame */}
      <DogSilhouette transform="translate(255 250)" />
      {/* Location pin floating above */}
      <g transform="translate(255 90)">
        <path d="M 0 0 L -10 -16 Q -10 -30 0 -30 Q 10 -30 10 -16 Z" fill={PIN} stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="0" cy="-19" r="4" fill={PAPER} />
      </g>
      {/* Data chips at bottom */}
      <g transform="translate(0 300)">
        {[
          { x: 100, w: 85, label: "Photo" },
          { x: 200, w: 90, label: "Location" },
          { x: 305, w: 95, label: "Condition" },
        ].map((c) => (
          <g key={c.label} transform={`translate(${c.x} 0)`}>
            <rect x="0" y="0" width={c.w} height="22" rx="11" fill="none" stroke={ACCENT} strokeWidth="1.5" />
            <circle cx="12" cy="11" r="3" fill={ACCENT} />
            <text x="22" y="15" fontFamily="system-ui, sans-serif" fontSize="10.5" fontWeight="600" fill={LINE}>{c.label}</text>
          </g>
        ))}
      </g>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────
// 03 · Understand — sightings merge into a real animal record
// ─────────────────────────────────────────────────────────────
export function UnderstandIllustration() {
  return (
    <Frame>
      {/* Back "ghost" sightings — smaller cards behind */}
      {[{ x: 40, y: 60, o: 0.25 }, { x: 60, y: 45, o: 0.4 }].map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width="360" height="210" rx="14" fill="none" stroke={LINE} strokeWidth="1.5" opacity={c.o} />
      ))}
      {/* Front record card */}
      <rect x="80" y="30" width="360" height="240" rx="16" fill={PAPER} stroke={LINE} strokeWidth="2" />
      {/* Card header with dog */}
      <g transform="translate(120 90)">
        <circle cx="0" cy="10" r="30" fill={CREAM} stroke={LINE} strokeWidth="1.5" />
        <g transform="translate(0 20) scale(0.5)">
          <DogSilhouette />
        </g>
      </g>
      {/* Text lines */}
      <g transform="translate(180 65)">
        <rect x="0" y="0" width="140" height="10" rx="3" fill={LINE} />
        <rect x="0" y="18" width="200" height="8" rx="3" fill={LINE} opacity="0.35" />
        <rect x="0" y="32" width="170" height="8" rx="3" fill={LINE} opacity="0.35" />
      </g>
      {/* Status chips */}
      <g transform="translate(180 130)">
        {[
          { x: 0, w: 62, label: "Injured", color: PIN },
          { x: 72, w: 68, label: "Sighted 3×", color: ACCENT },
          { x: 152, w: 60, label: "T-Nagar", color: LINE },
        ].map((c) => (
          <g key={c.label} transform={`translate(${c.x} 0)`}>
            <rect x="0" y="0" width={c.w} height="20" rx="10" fill="none" stroke={c.color} strokeWidth="1.5" />
            <text x={c.w / 2} y="14" fontFamily="system-ui, sans-serif" fontSize="10.5" fontWeight="600" fill={c.color} textAnchor="middle">{c.label}</text>
          </g>
        ))}
      </g>
      {/* Timeline of sightings */}
      <g transform="translate(120 210)">
        <line x1="0" y1="10" x2="290" y2="10" stroke={LINE} strokeWidth="1.4" opacity="0.4" />
        {[0, 70, 145, 220, 290].map((x, i) => (
          <circle key={i} cx={x} cy="10" r={i === 4 ? "5" : "3.5"} fill={i === 4 ? ACCENT : LINE} opacity={i === 4 ? 1 : 0.7} />
        ))}
        <text x="0" y="32" fontFamily="system-ui, sans-serif" fontSize="9.5" fill={LINE} opacity="0.55">First sighted</text>
        <text x="290" y="32" fontFamily="system-ui, sans-serif" fontSize="9.5" fill={ACCENT} textAnchor="end" fontWeight="600">Today</text>
      </g>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────
// 04 · Connect — network of participants around one dog
// ─────────────────────────────────────────────────────────────
export function ConnectIllustration() {
  const CX = 240, CY = 170;
  const nodes = [
    { angle: 180, r: 145, label: "Citizen", color: "#d9a441" },
    { angle: 0, r: 145, label: "NGO", color: "#3e8473" },
    { angle: 250, r: 130, label: "Vet", color: "#8b5ea8" },
    { angle: 290, r: 130, label: "Volunteer", color: ACCENT },
  ];
  return (
    <Frame>
      {/* Halo behind dog */}
      <circle cx={CX} cy={CY} r="55" fill={CREAM} />
      {/* Connection lines — clean triangular network */}
      {nodes.map((n, i) => {
        const rad = (n.angle * Math.PI) / 180;
        const nx = CX + Math.cos(rad) * n.r;
        const ny = CY + Math.sin(rad) * n.r * 0.75;
        return (
          <line key={i} x1={CX} y1={CY} x2={nx} y2={ny} stroke={n.color} strokeWidth="1.75" opacity="0.65" />
        );
      })}
      {/* Central dog */}
      <g transform={`translate(${CX} ${CY + 15}) scale(0.75)`}>
        <DogSilhouette />
      </g>
      {/* Nodes with labels */}
      {nodes.map((n, i) => {
        const rad = (n.angle * Math.PI) / 180;
        const nx = CX + Math.cos(rad) * n.r;
        const ny = CY + Math.sin(rad) * n.r * 0.75;
        const labelDy = n.angle > 90 && n.angle < 270 ? -22 : 22;
        return (
          <g key={n.label}>
            <circle cx={nx} cy={ny} r="16" fill={PAPER} stroke={n.color} strokeWidth="2.5" />
            <circle cx={nx} cy={ny} r="7" fill={n.color} />
            <text x={nx} y={ny + labelDy} fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" fill={LINE} textAnchor="middle">{n.label}</text>
          </g>
        );
      })}
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────
// 05 · Act — treatment, vaccination, follow-ups in one thread
// ─────────────────────────────────────────────────────────────
export function ActIllustration() {
  return (
    <Frame>
      {/* Dog on the left */}
      <DogSilhouette transform="translate(140 220)" />
      {/* Care history — vertical timeline on the right */}
      <line x1="290" y1="70" x2="290" y2="290" stroke={LINE} strokeWidth="1.5" opacity="0.35" />
      {[
        { y: 80, label: "Rescued", color: PIN, icon: "!" },
        { y: 140, label: "Vaccinated · ARV", color: CARE, icon: "+" },
        { y: 200, label: "Sterilised · ABC", color: CARE, icon: "✓" },
        { y: 260, label: "Follow-up in 30d", color: ACCENT, icon: "→" },
      ].map((e) => (
        <g key={e.label} transform={`translate(0 ${e.y})`}>
          <circle cx="290" cy="0" r="10" fill={PAPER} stroke={e.color} strokeWidth="2" />
          <text x="290" y="4" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="700" fill={e.color} textAnchor="middle">{e.icon}</text>
          <rect x="315" y="-14" width="145" height="28" rx="14" fill={PAPER} stroke={LINE} strokeWidth="1.5" />
          <text x="326" y="5" fontFamily="system-ui, sans-serif" fontSize="11.5" fontWeight="600" fill={LINE}>{e.label}</text>
        </g>
      ))}
      {/* Small caption anchor */}
      <text x="140" y="290" fontFamily="system-ui, sans-serif" fontSize="10" fill={LINE} opacity="0.55" textAnchor="middle">One record. Every visit.</text>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────
// 06 · Scale — one dog becomes one node on a living map
// ─────────────────────────────────────────────────────────────
export function ScaleIllustration() {
  // Deterministic scatter of small dog dots + a few connection lines.
  const dots = Array.from({ length: 26 }, (_, i) => {
    const seed = i * 91.7 + 12.3;
    const r = 60 + ((Math.sin(seed) + 1) / 2) * 120;
    const a = ((seed * 137.5) % 360) * Math.PI / 180;
    return { x: 240 + Math.cos(a) * r, y: 170 + Math.sin(a) * r * 0.6 };
  });
  const pins = Array.from({ length: 6 }, (_, i) => {
    const seed = i * 51.7 + 5.3;
    const r = 100 + ((Math.sin(seed + 1.5) + 1) / 2) * 60;
    const a = ((seed * 217.5) % 360) * Math.PI / 180;
    return { x: 240 + Math.cos(a) * r, y: 170 + Math.sin(a) * r * 0.6 };
  });
  const anchor = dots[0];
  const linksTo = [dots[5], dots[11], dots[17]];

  return (
    <Frame>
      {/* Map outline — soft ellipse suggesting a region */}
      <ellipse cx="240" cy="170" rx="205" ry="130" fill={CREAM} opacity="0.5" />
      {/* Grid lines — very subtle */}
      <g stroke={LINE} strokeWidth="1" opacity="0.12">
        {[70, 120, 170, 220, 270].map((y) => <line key={y} x1="45" y1={y} x2="435" y2={y} />)}
        {[80, 160, 240, 320, 400].map((x) => <line key={x} x1={x} y1="55" x2={x} y2="285" />)}
      </g>
      {/* Some connecting network lines */}
      {linksTo.map((d, i) => (
        <line key={i} x1={anchor.x} y1={anchor.y} x2={d.x} y2={d.y} stroke={ACCENT} strokeWidth="1.2" opacity="0.4" />
      ))}
      {/* Scattered dog dots */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={i === 0 ? "6" : "3.5"} fill={i === 0 ? ACCENT : DOG} opacity={i === 0 ? 1 : 0.85} />
      ))}
      {/* Pins */}
      {pins.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y - 3})`}>
          <path d="M 0 0 L -3 -6 Q -3 -10 0 -10 Q 3 -10 3 -6 Z" fill={PIN} />
        </g>
      ))}
      {/* Label on anchor */}
      <g transform={`translate(${anchor.x + 12} ${anchor.y - 12})`}>
        <rect x="0" y="0" width="70" height="18" rx="9" fill={PAPER} stroke={ACCENT} strokeWidth="1.5" />
        <text x="35" y="12" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="600" fill={ACCENT} textAnchor="middle">This dog</text>
      </g>
    </Frame>
  );
}

export const ILLUSTRATIONS = {
  notice: NoticeIllustration,
  visible: MakeVisibleIllustration,
  understand: UnderstandIllustration,
  connect: ConnectIllustration,
  act: ActIllustration,
  scale: ScaleIllustration,
} as const;
