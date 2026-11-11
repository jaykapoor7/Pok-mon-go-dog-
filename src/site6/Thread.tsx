/* The thread, drawn: an original vector scene for the hero. A faint city
   plan (blocks, a river, a ring road), four institutions as nodes, and one
   blue line that draws itself through them while a pulse travels along it.
   Pure SVG and CSS; decorative (aria-hidden); still under reduced motion. */

const PATH = "M -20 372 C 120 372 150 250 262 236 S 420 330 548 300 S 700 150 846 176 S 1010 318 1150 262 S 1330 120 1470 150";
const NODES: { x: number; y: number; label: string; d: string }[] = [
  { x: 262, y: 236, label: "Hospital", d: "M-5 0h10M0-5v10" },
  { x: 548, y: 300, label: "Field team", d: "M-4 2a2 2 0 1 0 0-.1M4 2a2 2 0 1 0 0-.1M0-4a2 2 0 1 0 0-.1" },
  { x: 846, y: 176, label: "Laboratory", d: "M-2-5h4M-1-5v4l-4 6h10l-4-6v-4" },
  { x: 1150, y: 262, label: "Programme", d: "M-5 3a5 5 0 0 1 10 0M0 3l3-4" },
];

export function HeroThread() {
  return (
    <svg className="s6-threadart" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="s6-tg" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2457ce" stopOpacity="0" /><stop offset=".12" stopColor="#2457ce" /><stop offset=".88" stopColor="#5d8bf0" /><stop offset="1" stopColor="#5d8bf0" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="s6-fade" cx=".5" cy=".42" r=".62"><stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset=".55" stopColor="#fff" stopOpacity=".82" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <pattern id="s6-blocks" width="96" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect x="6" y="6" width="38" height="26" rx="3" fill="none" stroke="#dfe5f0" /><rect x="52" y="6" width="38" height="26" rx="3" fill="none" stroke="#e7ebf3" />
          <rect x="6" y="40" width="54" height="26" rx="3" fill="none" stroke="#e7ebf3" /><rect x="68" y="40" width="22" height="26" rx="3" fill="none" stroke="#dfe5f0" />
        </pattern>
      </defs>
      {/* the city plan */}
      <rect width="1440" height="460" fill="url(#s6-blocks)" />
      <path d="M -40 120 C 240 60 420 200 700 120 S 1180 20 1500 110" fill="none" stroke="#dbe6fb" strokeWidth="18" strokeLinecap="round" opacity=".7" />
      <ellipse cx="720" cy="250" rx="560" ry="170" fill="none" stroke="#e3e8f1" strokeDasharray="2 10" />
      {/* keep the headline readable: the plan fades behind it */}
      <rect width="1440" height="460" fill="url(#s6-fade)" />
      {/* the thread */}
      <path className="s6-ta-line" d={PATH} pathLength={1} fill="none" stroke="url(#s6-tg)" strokeWidth="2.5" strokeLinecap="round" />
      <circle r="5" fill="#2457ce" className="s6-ta-pulse">
        <animateMotion dur="7s" repeatCount="indefinite" path={PATH} keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.6s" />
      </circle>
      {NODES.map((n, i) => (
        <g key={n.label} className="s6-ta-node" style={{ ["--i" as string]: i }} transform={`translate(${n.x} ${n.y})`}>
          <circle r="22" fill="#2457ce" opacity=".08" className="s6-ta-ring" />
          <circle r="13" fill="#fff" stroke="#2457ce" strokeWidth="2" />
          <path d={n.d} fill="none" stroke="#2457ce" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <text y="40" textAnchor="middle" fontSize="12" fontWeight="600" fill="#6b7486">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

/** The same thread as a quiet closing flourish on dark ground. */
export function CloseThread() {
  return (
    <svg className="s6-closeart" viewBox="0 0 800 300" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
      <path className="s6-ta-line" pathLength={1} d="M 120 320 C 220 180 330 260 430 170 S 600 60 700 110 S 780 40 840 20" fill="none" stroke="#5d8bf0" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      {[[430, 170], [700, 110]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><circle r="16" fill="#5d8bf0" opacity=".14" className="s6-ta-ring" /><circle r="6" fill="#081730" stroke="#8fb1ff" strokeWidth="2" /></g>)}
    </svg>
  );
}
