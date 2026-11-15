"use client";

import type { ReactNode } from "react";
import type { Tone, Trust } from "./fixtures";

export function Chip({ tone = "plain", children, bare }: { tone?: Tone; children: ReactNode; bare?: boolean }) {
  return <span className={`nx-chip ${tone === "plain" ? "" : `t-${tone}`} ${bare ? "is-plain" : ""}`}>{children}</span>;
}

/** How far a record has been checked. Imported, recorded, reviewed and verified are different claims. */
const TRUST: Record<Trust, Tone> = { Imported: "plain", Recorded: "plain", Reviewed: "accent", Verified: "ok" };
export const TrustChip = ({ trust }: { trust: Trust }) => <Chip tone={TRUST[trust]}>{trust}</Chip>;

export const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function Check({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={`nx-check ${done ? "is-done" : ""}`} aria-pressed={done} aria-label={label} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2.5 6.4 5 8.8 9.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export const Sample = () => <span className="nx-sample"><Chip bare>Sample data</Chip></span>;
