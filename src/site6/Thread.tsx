/* The thread, drawn: original vector art for the hero. A faint city plan sits
   behind the words; below them one blue line draws itself through four
   institutions while a pulse travels along it, and each node drops to its lane
   in the product relay. Pure SVG and CSS; decorative; still under reduced motion. */

const PATH = "M -40 74 C 40 74 80 40 147 40 S 300 100 442 100 S 640 40 737 40 S 930 100 1032 100 S 1160 62 1230 50";
const NODES: { x: number; y: number; d: string }[] = [
  { x: 147, y: 40, d: "M-5 0h10M0-5v10" },
  { x: 442, y: 100, d: "M-4 2a2 2 0 1 0 0-.1M4 2a2 2 0 1 0 0-.1M0-4a2 2 0 1 0 0-.1" },
  { x: 737, y: 40, d: "M-2-5h4M-1-5v4l-4 6h10l-4-6v-4" },
  { x: 1032, y: 100, d: "M-5 3a5 5 0 0 1 10 0M0 3l3-4" },
];

/** The city plan behind the headline: blocks, a river, a ring road. It fades
    behind the copy so nothing competes with the words. */
export function HeroThread() {
  return (
    <svg className="s6-threadart" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="s6-fade" cx=".5" cy=".46" r=".6"><stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset=".62" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <pattern id="s6-blocks" width="96" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect x="6" y="6" width="38" height="26" rx="3" fill="none" stroke="#dfe5f0" /><rect x="52" y="6" width="38" height="26" rx="3" fill="none" stroke="#e7ebf3" />
          <rect x="6" y="40" width="54" height="26" rx="3" fill="none" stroke="#e7ebf3" /><rect x="68" y="40" width="22" height="26" rx="3" fill="none" stroke="#dfe5f0" />
        </pattern>
      </defs>
      <rect width="1440" height="460" fill="url(#s6-blocks)" />
      <path d="M -40 120 C 240 60 420 200 700 120 S 1180 20 1500 110" fill="none" stroke="#dbe6fb" strokeWidth="18" strokeLinecap="round" opacity=".6" />
      <rect width="1440" height="460" fill="url(#s6-fade)" />
    </svg>
  );
}

/** The thread itself, between the words and the product: one line through the
    four institutions, each node standing over its lane in the relay below. */
export function HeroBand() {
  return (
    <svg className="s6-band" viewBox="0 0 1180 132" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="s6-tg" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2457ce" stopOpacity="0" /><stop offset=".1" stopColor="#2457ce" /><stop offset=".9" stopColor="#5d8bf0" /><stop offset="1" stopColor="#5d8bf0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {NODES.map((n, i) => <path key={i} className="s6-band-drop" style={{ ["--i" as string]: i }} d={`M${n.x} ${n.y + 14}V132`} stroke="#b9c8ea" strokeDasharray="2 5" fill="none" vectorEffect="non-scaling-stroke" />)}
      <path className="s6-ta-line" d={PATH} pathLength={1} fill="none" stroke="url(#s6-tg)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle r="4.5" fill="#2457ce" className="s6-ta-pulse">
        <animateMotion dur="6s" repeatCount="indefinite" path={PATH} keyPoints="0;1" keyTimes="0;1" calcMode="linear" begin="1.6s" />
      </circle>
      {NODES.map((n, i) => (
        <g key={i} className="s6-ta-node" style={{ ["--i" as string]: i }} transform={`translate(${n.x} ${n.y})`}>
          <circle r="21" fill="#2457ce" opacity=".08" className="s6-ta-ring" />
          <circle r="13" fill="#fff" stroke="#2457ce" strokeWidth="2" />
          <path d={n.d} fill="none" stroke="#2457ce" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

/** Inner pages: the thread comes down the right of the hero through three
    stops, over a corner of the city plan. Decorative; hidden on small screens. */
export function SideThread() {
  const P = "M 470 20 C 380 40 400 120 300 140 S 150 190 190 270 S 330 330 250 400 S 120 430 60 470";
  const stops: [number, number][] = [[300, 140], [190, 270], [250, 400]];
  return (
    <svg className="s6-sideart" viewBox="0 0 460 460" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="s6-sblocks" width="96" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect x="6" y="6" width="38" height="26" rx="3" fill="none" stroke="#dfe5f0" /><rect x="52" y="6" width="38" height="26" rx="3" fill="none" stroke="#e7ebf3" />
          <rect x="6" y="40" width="54" height="26" rx="3" fill="none" stroke="#e7ebf3" /><rect x="68" y="40" width="22" height="26" rx="3" fill="none" stroke="#dfe5f0" />
        </pattern>
        <radialGradient id="s6-sfade" cx=".62" cy=".5" r=".55"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity="1" /></radialGradient>
        <linearGradient id="s6-sg" x1="1" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5d8bf0" stopOpacity="0" /><stop offset=".15" stopColor="#5d8bf0" /><stop offset=".85" stopColor="#2457ce" /><stop offset="1" stopColor="#2457ce" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="460" height="460" fill="url(#s6-sblocks)" /><rect width="460" height="460" fill="url(#s6-sfade)" />
      <path className="s6-ta-line" d={P} pathLength={1} fill="none" stroke="url(#s6-sg)" strokeWidth="2.5" strokeLinecap="round" />
      <circle r="4.5" fill="#2457ce" className="s6-ta-pulse"><animateMotion dur="6s" repeatCount="indefinite" path={P} begin="1.4s" /></circle>
      {stops.map(([x, y], i) => (
        <g key={i} className="s6-ta-node" style={{ ["--i" as string]: i }} transform={`translate(${x} ${y})`}>
          <circle r="22" fill="#2457ce" opacity=".08" className="s6-ta-ring" /><circle r="12" fill="#fff" stroke="#2457ce" strokeWidth="2" /><circle r="3.5" fill="#2457ce" />
        </g>
      ))}
    </svg>
  );
}
