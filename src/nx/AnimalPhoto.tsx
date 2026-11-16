"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PawPrint } from "lucide-react";
import { animalLabel, type AnimalRef } from "./animalLabel";
import "./animals.css";

/* The animal's photo wherever the workspace shows one, and the same calm placeholder wherever there is none: a quiet
   tile with a paw, never a letter and never a stock picture. The photo fades in over the placeholder once it has
   loaded (at once under reduced motion); a photo that fails to load leaves the placeholder. */

export type PhotoSize = "row" | "head" | "card" | "hero";

export function AnimalPhoto({ src, size = "row", alt = "", onClick }: { src: string | null | undefined; size?: PhotoSize; alt?: string; onClick?: () => void }) {
  const [state, setState] = useState<"wait" | "ok" | "bad">("wait");
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => { setState(img.current?.complete && img.current.naturalWidth ? "ok" : "wait"); }, [src]);
  const show = !!src && state !== "bad";
  const body = <>
    <PawPrint className="am-ph-i" aria-hidden strokeWidth={1.6} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {show ? <img ref={img} src={src!} alt={alt} loading={size === "row" ? "lazy" : "eager"} decoding="async" draggable={false} onLoad={() => setState("ok")} onError={() => setState("bad")} /> : null}
  </>;
  const cls = `am-ph is-${size}${show && state === "ok" ? " is-in" : ""}`;
  return onClick && show
    ? <button type="button" className={cls} onClick={onClick} aria-label={alt ? `Open the photo: ${alt}` : "Open the photo"}>{body}</button>
    : <span className={cls} aria-hidden={alt && show ? undefined : true} role={alt && show ? "img" : undefined} aria-label={alt && show ? alt : undefined}>{body}</span>;
}

/** The number beside a name: "Tiger 132". */
export function AnimalTag({ tag }: { tag: string | null }) {
  return tag ? <span className="am-tag num" aria-label={`number ${tag}`}>{tag}</span> : null;
}

/** An animal as a list row shows it: photo, its name or "Dog 128", the number beside a name, and a second line
    (its place unless the row says something else). */
export function AnimalCell({ a, photo, sub }: { a: AnimalRef & { id: string }; photo: string | null | undefined; sub?: ReactNode }) {
  const l = animalLabel(a);
  return (
    <span className="nx-cell-main am-cell" data-animal-id={a.id} data-has-photo={photo ? "1" : "0"}>
      <AnimalPhoto src={photo} />
      <span><b>{l.title}{l.name ? <AnimalTag tag={l.tag} /> : null}</b><small>{sub ?? l.place ?? "Place not recorded"}</small></span>
    </span>
  );
}

/** A heading that names an animal: "Tiger" with its number, or "Dog 128". */
export function AnimalTitle({ a }: { a: AnimalRef }) {
  const l = animalLabel(a);
  return <>{l.title}{l.name ? <AnimalTag tag={l.tag} /> : null}</>;
}
