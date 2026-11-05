/* The hand-drawn StrayPaw with its animals alive: the cat and monkey swing,
   the parrot flies a loop, the horse, sheep and goat breathe. The base image
   holds everything else; each moving animal is its own cut-out on top.
   Decorative; motion lives in landing7.css and stops for reduced motion. */

export function AliveLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`s7-egg-art ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="s7-egg-base" src="/brand/egg/base-900.webp" width={900} height={431} alt="" loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="s7-egg-a is-monkey" src="/brand/egg/monkey.webp" width={228} height={211} alt="" loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="s7-egg-a is-cat" src="/brand/egg/cat.webp" width={154} height={286} alt="" loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="s7-egg-a is-sheep" src="/brand/egg/sheep.webp" width={270} height={211} alt="" loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="s7-egg-a is-goat" src="/brand/egg/goat.webp" width={295} height={301} alt="" loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="s7-egg-a is-horse" src="/brand/egg/horse.webp" width={344} height={176} alt="" loading="lazy" decoding="async" />
      <span className="s7-egg-z"><i>z</i><i>z</i><i>z</i></span>
      <span className="s7-egg-loop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="s7-egg-a is-parrot" src="/brand/egg/parrot.webp" width={188} height={203} alt="" loading="lazy" decoding="async" />
      </span>
    </span>
  );
}
