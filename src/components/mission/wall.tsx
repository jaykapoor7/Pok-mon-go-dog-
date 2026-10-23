/* The wall: a limewashed blue plaster (StrayPaw blue, as on a Jodhpur lane) in an Indian street, drawn rather
   than photographed so it fits any screen. Nothing on it is a real
   person, number or business. */
export type Size = { w: number; h: number };

/* A small seeded random, so the wall is the same wall every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ── the wall ─────────────────────────────────────────────────────── */
export function Wall({ w, h }: Size) {
  const k = Math.max(0.55, Math.min(1.25, Math.min(w, h) / 820));
  const portrait = h > w * 1.1;
  const dado = h * (portrait ? 0.86 : 0.83);
  const r = rng(7);
  const streaks = Array.from({ length: 9 }, (_, i) => ({ x: (i + 0.3 + r() * 0.5) * (w / 9), wd: 10 + r() * 40, len: h * (0.12 + r() * 0.35), o: 0.05 + r() * 0.08 }));
  const cracks = [
    `M${w * 0.62} ${h * 0.08} l${8 * k} ${22 * k} l${-6 * k} ${18 * k} l${12 * k} ${26 * k} l${-4 * k} ${20 * k}`,
    `M${w * 0.33} ${dado} l${6 * k} ${-24 * k} l${-9 * k} ${-16 * k} l${5 * k} ${-28 * k}`,
    `M${w * 0.9} ${h * 0.42} l${-14 * k} ${10 * k} l${-6 * k} ${22 * k} l${-16 * k} ${8 * k}`,
  ];
  /* Posters: anchored to edges so they frame the words on any screen. */
  const P = (x: number, y: number, pw: number, ph: number, rot: number) => ({ x, y, pw: pw * k, ph: ph * k, rot });
  const tuition = portrait ? P(w * 0.04, h * 0.6, 170, 230, -3) : P(w * 0.035, h * 0.5, 200, 270, -3);
  const admit = portrait ? P(w * 0.42, h * 0.63, 160, 200, 2.5) : P(w * 0.15, h * 0.58, 190, 240, 3);
  const film = portrait ? P(w * 0.6, h * 0.1, 150, 200, 2) : P(w * 0.76, h * 0.08, 210, 290, 2);
  const meter = { x: portrait ? w * 0.06 : w * 0.05, y: h * 0.11, s: k };
  const brick = { x: portrait ? w * 0.7 : w * 0.82, y: portrait ? h * 0.66 : h * 0.6 };
  const stencil = { x: portrait ? w * 0.06 : w * 0.66, y: portrait ? h * 0.27 : h * 0.68 };

  return (
    <svg className="mw-wall" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <defs>
        <filter id="mw-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="3" /><feColorMatrix values="0 0 0 0 .06  0 0 0 0 .14  0 0 0 0 .13  0 0 0 -1.6 1.05" /></filter>
        <filter id="mw-relief" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="5" seed="11" result="n" /><feDiffuseLighting in="n" lightingColor="#fff6e3" surfaceScale="2.2" diffuseConstant="1.05"><feDistantLight azimuth="235" elevation="58" /></feDiffuseLighting></filter>
        <filter id="mw-blotch" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".004 .009" numOctaves="4" seed="5" /><feColorMatrix values="0 0 0 0 .12  0 0 0 0 .24  0 0 0 0 .22  0 0 0 2.4 -1.25" /></filter>
        <filter id="mw-torn" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="9" result="t" /><feDisplacementMap in="SourceGraphic" in2="t" scale={7 * k} xChannelSelector="R" yChannelSelector="G" /></filter>
        <filter id="mw-soft"><feGaussianBlur stdDeviation={6 * k} /></filter>
        <linearGradient id="mw-light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2cf" stopOpacity=".3" /><stop offset=".55" stopColor="#fff2cf" stopOpacity="0" /><stop offset="1" stopColor="#071733" stopOpacity=".35" /></linearGradient>
        <linearGradient id="mw-damp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0e2149" stopOpacity="0" /><stop offset="1" stopColor="#0e2149" stopOpacity=".42" /></linearGradient>
        <linearGradient id="mw-streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12285a" stopOpacity="1" /><stop offset="1" stopColor="#12285a" stopOpacity="0" /></linearGradient>
        <pattern id="mw-bricks" width={44 * k} height={22 * k} patternUnits="userSpaceOnUse">
          <rect width={44 * k} height={22 * k} fill="#cfae8b" />
          <rect x={1.5 * k} y={1.5 * k} width={40 * k} height={8.5 * k} rx={1.5} fill="#a5543a" />
          <rect x={-20 * k} y={12 * k} width={40 * k} height={8.5 * k} rx={1.5} fill="#9a4b33" />
          <rect x={23.5 * k} y={12 * k} width={40 * k} height={8.5 * k} rx={1.5} fill="#ad5d40" />
        </pattern>
        <radialGradient id="mw-vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#030b1a" stopOpacity=".55" /></radialGradient>
      </defs>

      {/* plaster, its relief, its stains */}
      <rect width={w} height={h} fill="#3a6cc9" />
      <rect width={w} height={h} filter="url(#mw-relief)" style={{ mixBlendMode: "multiply" }} opacity=".55" />
      <rect width={w} height={h} filter="url(#mw-blotch)" opacity=".55" />
      {streaks.map((s, i) => <rect key={i} x={s.x} y={0} width={s.wd * k} height={s.len} fill="url(#mw-streak)" opacity={s.o} filter="url(#mw-soft)" />)}
      <rect y={dado - h * 0.2} width={w} height={h * 0.2} fill="url(#mw-damp)" />

      {/* fallen plaster, showing brick */}
      <g transform={`translate(${brick.x} ${brick.y})`}>
        <path d={`M0 ${20 * k} C${30 * k} ${-6 * k} ${90 * k} ${4 * k} ${120 * k} ${-8 * k} C${150 * k} ${10 * k} ${160 * k} ${60 * k} ${140 * k} ${90 * k} C${100 * k} ${110 * k} ${50 * k} ${96 * k} ${20 * k} ${104 * k} C${-10 * k} ${80 * k} ${-12 * k} ${50 * k} 0 ${20 * k}Z`} fill="url(#mw-bricks)" stroke="#8a6a44" strokeWidth={2.5 * k} />
        <path d={`M0 ${20 * k} C${30 * k} ${-6 * k} ${90 * k} ${4 * k} ${120 * k} ${-8 * k}`} fill="none" stroke="#fff3d6" strokeOpacity=".5" strokeWidth={2 * k} />
      </g>
      {cracks.map((d, i) => <path key={i} d={d} fill="none" stroke="#10244c" strokeOpacity=".6" strokeWidth={1.4 * k} strokeLinejoin="round" />)}

      {/* the painted band at the foot of the wall */}
      <path d={`M0 ${dado} Q${w * 0.25} ${dado - 3 * k} ${w * 0.5} ${dado + 2 * k} T${w} ${dado - 2 * k} V${h} H0Z`} fill="#0b1e3d" />
      <rect y={dado} width={w} height={h - dado} filter="url(#mw-relief)" style={{ mixBlendMode: "multiply" }} opacity=".45" />
      <path d={`M0 ${dado - 1} Q${w * 0.25} ${dado - 4 * k} ${w * 0.5} ${dado + 1 * k} T${w} ${dado - 3 * k}`} fill="none" stroke="#050f22" strokeWidth={2.5 * k} />
      {/* paan stains */}
      <g transform={`translate(${w * (portrait ? 0.82 : 0.38)} ${dado + (h - dado) * 0.35})`} fill="#050f22" opacity=".55">
        <ellipse rx={22 * k} ry={9 * k} /><ellipse cx={26 * k} cy={6 * k} rx={7 * k} ry={4 * k} /><circle cx={-24 * k} cy={-6 * k} r={4 * k} /><circle cx={34 * k} cy={-10 * k} r={2.5 * k} /><path d={`M${4 * k} ${6 * k} q${2 * k} ${14 * k} ${-1 * k} ${26 * k}`} stroke="#050f22" strokeWidth={3 * k} fill="none" />
      </g>

      {/* the meter box and its wires */}
      <g transform={`translate(${meter.x} ${meter.y}) scale(${meter.s})`}>
        <path d={`M38 0 C ${w * 0.18 / meter.s} -30 ${w * 0.32 / meter.s} 40 ${w * 0.55 / meter.s} -10 S ${w * 0.9 / meter.s} -30 ${w * 1.1 / meter.s} -20`} fill="none" stroke="#161616" strokeWidth="3.2" />
        <path d={`M48 0 C ${w * 0.2 / meter.s} 24 ${w * 0.4 / meter.s} 70 ${w * 0.62 / meter.s} 20 S ${w * 0.95 / meter.s} 10 ${w * 1.1 / meter.s} 30`} fill="none" stroke="#222" strokeWidth="2.4" />
        <path d="M44 96 C 40 150 52 200 46 260" fill="none" stroke="#1b1b1b" strokeWidth="3" />
        <rect x="6" y="4" width="76" height="96" rx="4" fill="#8e938f" stroke="#4b4f4c" strokeWidth="2" />
        <rect x="16" y="16" width="56" height="34" rx="2" fill="#2c3533" /><rect x="22" y="24" width="30" height="10" fill="#9fb7a4" opacity=".6" />
        <circle cx="16" cy="88" r="2.4" fill="#4b4f4c" /><circle cx="72" cy="88" r="2.4" fill="#4b4f4c" />
        <rect x="6" y="4" width="76" height="96" rx="4" fill="url(#mw-light)" />
      </g>

      {/* stencilled on the wall long ago, under the posters */}
      <g transform={`translate(${stencil.x} ${stencil.y}) rotate(-1.5) scale(${k})`} className="mw-stencil">
        <text y="0" fill="#f3ead6" opacity=".7" fontSize="34" letterSpacing="3">STICK NO BILLS</text>
        <text y="40" fill="#ffd9a0" opacity=".66" fontSize="25">यहाँ पोस्टर लगाना मना है</text>
      </g>

      {/* torn remnants of older posters */}
      <g filter="url(#mw-torn)" opacity=".85">
        <rect x={tuition.x + 150 * k} y={tuition.y - 40 * k} width={70 * k} height={50 * k} fill="#e9e2cf" transform={`rotate(4 ${tuition.x} ${tuition.y})`} />
        <rect x={film.x - 50 * k} y={film.y + 210 * k} width={60 * k} height={70 * k} fill="#d7c48d" />
        <rect x={w * 0.5} y={h * 0.86} width={90 * k} height={30 * k} fill="#e4dccb" opacity=".7" />
      </g>

      {/* posters */}
      <g transform={`translate(${tuition.x} ${tuition.y}) rotate(${tuition.rot})`} filter="url(#mw-torn)">
        <rect width={tuition.pw} height={tuition.ph} fill="#f3ecd8" />
        <rect width={tuition.pw} height={tuition.ph * 0.24} fill="#c8321f" />
        <text x={tuition.pw / 2} y={tuition.ph * 0.16} textAnchor="middle" fill="#fff8e7" fontSize={24 * k} fontWeight="800" className="mw-poster-t">TUITION</text>
        <text x={tuition.pw / 2} y={tuition.ph * 0.36} textAnchor="middle" fill="#1d2b5c" fontSize={15 * k} fontWeight="800">CLASS 6 TO 12</text>
        <text x={tuition.pw / 2} y={tuition.ph * 0.47} textAnchor="middle" fill="#1d2b5c" fontSize={12 * k}>Maths · Science · English</text>
        <text x={tuition.pw / 2} y={tuition.ph * 0.6} textAnchor="middle" fill="#c8321f" fontSize={17 * k} fontWeight="700">हर विषय की कोचिंग</text>
        <rect x={tuition.pw * 0.12} y={tuition.ph * 0.72} width={tuition.pw * 0.76} height={tuition.ph * 0.13} fill="#1d2b5c" />
        <text x={tuition.pw / 2} y={tuition.ph * 0.81} textAnchor="middle" fill="#ffd34d" fontSize={13 * k} fontWeight="700">ADMISSIONS NOW</text>
        <rect width={tuition.pw} height={tuition.ph} fill="url(#mw-light)" />
      </g>
      <g transform={`translate(${admit.x} ${admit.y}) rotate(${admit.rot})`} filter="url(#mw-torn)">
        <rect width={admit.pw} height={admit.ph} fill="#13254a" />
        <rect y={admit.ph * 0.62} width={admit.pw} height={admit.ph * 0.38} fill="#ffcc2e" />
        <text x={admit.pw / 2} y={admit.ph * 0.22} textAnchor="middle" fill="#ffcc2e" fontSize={22 * k} fontWeight="800" className="mw-poster-t">ADMISSION</text>
        <text x={admit.pw / 2} y={admit.ph * 0.38} textAnchor="middle" fill="#fff" fontSize={22 * k} fontWeight="800" className="mw-poster-t">OPEN</text>
        <text x={admit.pw / 2} y={admit.ph * 0.52} textAnchor="middle" fill="#fff" fontSize={14 * k}>2026–27</text>
        <text x={admit.pw / 2} y={admit.ph * 0.8} textAnchor="middle" fill="#a2140a" fontSize={20 * k} fontWeight="800">प्रवेश प्रारंभ</text>
        <rect width={admit.pw} height={admit.ph} fill="url(#mw-light)" />
        {/* a corner torn away */}
        <path d={`M${admit.pw} ${admit.ph * 0.7} L${admit.pw} ${admit.ph} L${admit.pw * 0.62} ${admit.ph} Z`} fill="#3a6cc9" />
      </g>
      <g transform={`translate(${film.x} ${film.y}) rotate(${film.rot})`} filter="url(#mw-torn)" opacity=".92">
        <rect width={film.pw} height={film.ph} fill="#5d1747" />
        <circle cx={film.pw * 0.5} cy={film.ph * 0.36} r={film.pw * 0.3} fill="#f08a24" opacity=".9" />
        <path d={`M0 ${film.ph * 0.56} L${film.pw * 0.25} ${film.ph * 0.4} L${film.pw * 0.45} ${film.ph * 0.52} L${film.pw * 0.7} ${film.ph * 0.34} L${film.pw} ${film.ph * 0.5} V${film.ph * 0.66} H0Z`} fill="#2a0b22" />
        <text x={film.pw / 2} y={film.ph * 0.8} textAnchor="middle" fill="#ffe9a8" fontSize={26 * k} fontWeight="800" className="mw-poster-t">MERA SHEHAR</text>
        <text x={film.pw / 2} y={film.ph * 0.9} textAnchor="middle" fill="#ffe9a8" fontSize={12 * k} letterSpacing="2">NOW SHOWING</text>
        <rect width={film.pw} height={film.ph} fill="url(#mw-light)" />
        {/* the lower part peeled off */}
        <path d={`M0 ${film.ph * 0.86} L${film.pw * 0.2} ${film.ph * 0.93} L${film.pw * 0.34} ${film.ph * 0.88} L${film.pw * 0.5} ${film.ph * 0.97} L0 ${film.ph}Z`} fill="#3a6cc9" />
      </g>

      {/* grain, light and vignette over everything */}
      <rect width={w} height={h} filter="url(#mw-grain)" opacity=".5" />
      <rect width={w} height={h} fill="url(#mw-light)" />
      <rect width={w} height={h} fill="url(#mw-vig)" />
    </svg>
  );
}

