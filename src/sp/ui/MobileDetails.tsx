"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Desktop keeps its full workspace. On a phone supporting tools have a named door. */
export function MobileDetails({ label, children, className = "", active = false }: { label: string; children: ReactNode; className?: string; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className={`mobile-details ${className}`} data-open={open ? "true" : "false"}>
    <button type="button" className="mobile-details-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}><span className="mobile-details-label">{label}</span>{active && <span className="mobile-details-active">Active</span>}<ChevronDown size={17} aria-hidden /></button>
    <div id={id} className="mobile-details-content">{children}</div>
  </div>;
}
