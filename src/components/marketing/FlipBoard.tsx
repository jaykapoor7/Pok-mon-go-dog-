"use client";

import { useEffect, useState } from "react";

const DIGITS = "0123456789";

// One split-flap cell. Digits spin through 0-9 and settle on the target with a
// staggered, mechanical flip; punctuation renders as a static flap.
function Cell({ target, delay }: { target: string; delay: number }) {
  const isDigit = /[0-9]/.test(target);
  const [ch, setCh] = useState(isDigit ? "0" : target);
  const [k, setK] = useState(0);

  useEffect(() => {
    if (!isDigit) { setCh(target); return; }
    const targetIdx = DIGITS.indexOf(target);
    const steps = 10 + targetIdx; // one full spin, then land
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const start = setTimeout(function tick() {
      setCh(DIGITS[i % 10]);
      setK((v) => v + 1);
      i += 1;
      if (i <= steps) t = setTimeout(tick, 46 + i * 5);
      else { setCh(target); setK((v) => v + 1); }
    }, delay);
    return () => { clearTimeout(start); clearTimeout(t); };
  }, [target, delay, isDigit]);

  if (!isDigit) {
    return <span className="flip-punct">{target}</span>;
  }
  return (
    <span className="flip-cell">
      <span key={k} className="flip-char">{ch}</span>
    </span>
  );
}

export function FlipBoard({ value, className }: { value: string; className?: string }) {
  const chars = value.split("");
  return (
    <span className={className} aria-label={value} role="img">
      <style>{`
        .flip-board{display:inline-flex;gap:3px;align-items:stretch;perspective:320px}
        .flip-cell{position:relative;display:inline-grid;place-items:center;min-width:0.72em;padding:0.06em 0.05em;
          border-radius:5px;background:#1a1712;color:#f4ede2;overflow:hidden;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.35)}
        .flip-cell::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(0,0,0,.5);z-index:2}
        .flip-char{display:block;line-height:1;transform-origin:center;animation:flip-in .18s cubic-bezier(.3,.7,.4,1)}
        .flip-punct{display:inline-grid;place-items:center;min-width:0.34em;color:inherit;opacity:.85}
        @keyframes flip-in{0%{transform:rotateX(-88deg);opacity:.25}100%{transform:rotateX(0);opacity:1}}
        @media (prefers-reduced-motion: reduce){.flip-char{animation:none}}
      `}</style>
      <span className="flip-board">
        {chars.map((c, i) => (
          <Cell key={i} target={c} delay={i * 90} />
        ))}
      </span>
    </span>
  );
}
