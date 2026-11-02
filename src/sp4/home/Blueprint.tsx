/* A blueprint of a ward: streets, plots, a drainage canal, a market, the
   ward boundary, capture and release pins, a compass and a scale bar.
   Drawn as fine lines on StrayPaw blue behind the product, the way a
   programme is planned on paper before it is run. Decorative only. */

export function Blueprint({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const L = dark ? "rgba(255,255,255,.22)" : "rgba(36,87,206,.20)", F = dark ? "rgba(255,255,255,.10)" : "rgba(36,87,206,.09)", S = dark ? "rgba(255,255,255,.4)" : "rgba(36,87,206,.42)";
  return (
    <svg className={`s6-blueprint ${className}`} viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {/* plots */}
      <g fill="none" stroke={F} strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => <rect key={`a${i}`} x={40 + i * 92} y={60} width={78} height={120} />)}
        {Array.from({ length: 6 }).map((_, i) => <rect key={`b${i}`} x={980 + i * 72} y={70} width={60} height={96} />)}
        {Array.from({ length: 7 }).map((_, i) => <rect key={`c${i}`} x={60 + i * 110} y={560} width={94} height={150} />)}
        {Array.from({ length: 5 }).map((_, i) => <rect key={`d${i}`} x={1000 + i * 86} y={580} width={72} height={130} />)}
        <rect x="1060" y="250" width="260" height="190" />
        <rect x="1080" y="270" width="220" height="150" strokeDasharray="4 6" />
      </g>
      {/* streets */}
      <g fill="none" stroke={L} strokeWidth="1.5">
        <path d="M0 220 H1440" /><path d="M0 236 H1440" />
        <path d="M0 520 C300 500 520 540 760 520 S1200 490 1440 515" /><path d="M0 536 C300 516 520 556 760 536 S1200 506 1440 531" />
        <path d="M900 0 V760" /><path d="M916 0 V760" />
        <path d="M380 236 L330 520" /><path d="M394 236 L344 520" />
      </g>
      {/* canal */}
      <path d="M0 400 C200 360 360 440 560 400 S860 340 900 380" fill="none" stroke={L} strokeWidth="1" strokeDasharray="10 8" />
      {/* ward boundary */}
      <path d="M120 120 L860 90 L1380 160 L1340 690 L560 720 L90 640 Z" fill="none" stroke={S} strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      {/* labels */}
      <g fill={S} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12" letterSpacing="2">
        <text x="130" y="110">WARD 14 · BOUNDARY</text>
        <text x="1090" y="244">MARKET</text>
        <text x="580" y="392">CANAL ROAD</text>
        <text x="930" y="300" transform="rotate(90 930 300)">MAIN ROAD</text>
      </g>
      {/* capture and release pins */}
      <g>
        {[[250, 300], [610, 470], [1160, 330], [760, 160], [1230, 620], [470, 640]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="14" fill="none" stroke={S} strokeWidth="1" />
            <circle r="4" fill={i % 2 ? "#d99b1c" : dark ? "#fff" : "#2457ce"} />
          </g>
        ))}
      </g>
      {/* compass and scale */}
      <g transform="translate(1340 80)" fill="none" stroke={S} strokeWidth="1">
        <circle r="24" /><path d="M0 -30 V30 M-30 0 H30" /><path d="M0 -24 L6 0 L0 24 L-6 0 Z" fill={S} />
      </g>
      <g transform="translate(60 720)" stroke={S} strokeWidth="1.5" fill={S} fontFamily="ui-monospace, monospace" fontSize="11" letterSpacing="1.5">
        <path d="M0 0 H200 M0 -6 V6 M100 -4 V4 M200 -6 V6" /><text x="0" y="-12" stroke="none">0</text><text x="186" y="-12" stroke="none">200 m</text>
      </g>
    </svg>
  );
}
