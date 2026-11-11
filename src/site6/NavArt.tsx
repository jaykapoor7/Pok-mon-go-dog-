/* One small drawing per menu, so each panel shows its idea instead of
   describing it. Pure SVG; decorative; the lines draw themselves when the
   panel opens and stay still under reduced motion. */

const line = { fill: "none", stroke: "#2457ce", strokeWidth: 2, strokeLinecap: "round" as const };
const soft = { fill: "none", stroke: "#dfe5f0" };

export function NavArt({ id }: { id: string }) {
  if (id === "platform") return (
    /* one thread through four institutions */
    <svg viewBox="0 0 300 110" aria-hidden="true" focusable="false">
      <path className="s6-ta-line" pathLength={1} d="M10 70C50 70 50 34 84 34S128 76 150 76S192 34 216 34S260 70 292 62" {...line} />
      {[[84, 34, "#d9452b"], [150, 76, "#2b8a5f"], [216, 34, "#6f5fd6"], [270, 66, "#2457ce"]].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><g className="s6-ta-node" style={{ ["--i" as string]: i }}><circle r="13" fill={c as string} opacity=".14" /><circle r="6.5" fill="#fff" stroke={c as string} strokeWidth="2.5" /></g></g>
      ))}
    </svg>
  );
  if (id === "solutions") return (
    /* one record, every role around it */
    <svg viewBox="0 0 300 110" aria-hidden="true" focusable="false">
      {[[52, 26], [52, 84], [248, 26], [248, 84], [150, 14]].map(([x, y], i) => <path key={i} className="s6-ta-line" pathLength={1} d={`M150 58L${x} ${y}`} {...line} strokeWidth={1.5} opacity=".55" />)}
      <rect x="118" y="38" width="64" height="40" rx="9" fill="#0b1e3d" /><path d="M130 52h40M130 62h26" stroke="#8fb1ff" strokeWidth="3" strokeLinecap="round" />
      {[[52, 26, "#2457ce"], [52, 84, "#2b8a5f"], [248, 26, "#d9452b"], [248, 84, "#6f5fd6"], [150, 14, "#e9963a"]].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><g className="s6-ta-node" style={{ ["--i" as string]: i }}><circle r="10" fill={c as string} /><circle r="3.5" cy="-2" fill="#fff" /><path d="M-5 6a5 5 0 0 1 10 0" fill="#fff" /></g></g>
      ))}
    </svg>
  );
  if (id === "trust") return (
    /* partners see counts, never people; small counts are hidden */
    <svg viewBox="0 0 300 110" aria-hidden="true" focusable="false">
      <rect x="14" y="14" width="124" height="82" rx="10" {...soft} /><rect x="162" y="14" width="124" height="82" rx="10" {...soft} />
      {[0, 1, 2].map((r) => <g key={r} transform={`translate(26 ${30 + r * 22})`}><circle r="6" cx="6" cy="4" fill="#c9d2e3" /><rect x="20" y="0" width="70" height="8" rx="4" fill="#e6eaf2" /></g>)}
      <path d="M118 22v-5a7 7 0 0 1 14 0v5" fill="none" stroke="#0b1e3d" strokeWidth="2" /><rect x="114" y="21" width="22" height="17" rx="4" fill="#0b1e3d" />
      <path className="s6-ta-line" pathLength={1} d="M138 55h24" {...line} strokeDasharray="1" />
      <text x="176" y="42" fontSize="11" fill="#6b7486">Ward 12</text><text x="274" y="42" fontSize="12" fontWeight="700" fill="#0b1e3d" textAnchor="end">14</text>
      <text x="176" y="62" fontSize="11" fill="#6b7486">Ward 13</text><text x="274" y="62" fontSize="12" fontWeight="700" fill="#2457ce" textAnchor="end">&lt;5</text>
      <text x="176" y="82" fontSize="11" fill="#6b7486">Ward 14</text><text x="274" y="82" fontSize="12" fontWeight="700" fill="#0b1e3d" textAnchor="end">9</text>
    </svg>
  );
  return (
    /* the public map */
    <svg viewBox="0 0 300 110" aria-hidden="true" focusable="false">
      <path d="M-10 84C60 60 110 96 170 74S260 36 310 54" fill="none" stroke="#dbe6fb" strokeWidth="12" strokeLinecap="round" />
      <g {...soft}>{[60, 120, 180, 240].map((x) => <path key={x} d={`M${x} 0v110`} />)}{[36, 72].map((y) => <path key={y} d={`M0 ${y}h300`} />)}</g>
      {[[44, 40, "#2457ce"], [98, 76, "#2b8a5f"], [150, 30, "#2457ce"], [204, 62, "#e9963a"], [256, 28, "#2b8a5f"], [232, 88, "#2457ce"]].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><g className="s6-ta-node" style={{ ["--i" as string]: i }}><circle r="10" fill={c as string} opacity=".16" /><circle r="5" fill={c as string} stroke="#fff" strokeWidth="2" /></g></g>
      ))}
    </svg>
  );
}
