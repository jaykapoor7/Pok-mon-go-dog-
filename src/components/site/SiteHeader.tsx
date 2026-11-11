"use client";

/* The public site header. The implementation lives in src/site6/Nav.tsx
   (StrayPaw 6); this module keeps the import path every page already uses. */
import { Nav } from "@/site6/Nav";
import "@/sp3/sp3.css";
import "@/sp3/legacy.css";
import "@/sp4/sp4.css";
export { AUDIENCES, PLATFORM, RESOURCES, SOLUTIONS } from "@/sp3/site/nav-data";

export function SiteHeader(props: { tone?: "paper" | "night"; overlay?: boolean; float?: boolean } = {}) {
  void props;
  return <Nav />;
}

export function StrayPawMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/straypaw-mark.png" alt="" width={size} height={size} aria-hidden="true"
      style={{ flexShrink: 0, borderRadius: "50%", display: "block", boxShadow: "0 0 0 1px rgba(11,16,32,0.12)" }} />
  );
}
