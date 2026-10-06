"use client";

import Link from "next/link";
import { ChevronDown, KeyRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/** One entry point for requesting a personal code or entering one already held. */
export function AuthEntryMenu({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const navigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div className={`auth-entry ${className}`.trim()} ref={root}>
      <button type="button" className="auth-entry-trigger" aria-label="Sign in or use a code" aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen((value) => !value)}>
        <KeyRound size={14} aria-hidden /> <span>Sign in</span><ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div id={`${id}-options`} className="auth-entry-options" role="menu" aria-label="Account options">
          <Link href="/access" role="menuitem" onClick={navigate}><b>Sign up</b><small>Get a personal code by email</small></Link>
          <Link href="/join" role="menuitem" onClick={navigate}><b>I have a code</b><small>Enter the code you were given</small></Link>
        </div>
      )}
    </div>
  );
}
