import Link from "next/link";

/* What StrayPaw is, in six words that travel sideways as the page scrolls. The word passing the
   centre takes the flame; every word opens its part of the product. */
export type Word = { w: string; sub: string; href: string };

export function Words({ words }: { words: Word[] }) {
  return (
    <ol className="wd" style={{ ["--n" as string]: words.length }}>
      {words.map((x, i) => (
        <li key={x.w} style={{ ["--i" as string]: i }}>
          <Link href={x.href}><b>{x.w}</b><span>{x.sub}</span></Link>
        </li>
      ))}
    </ol>
  );
}
