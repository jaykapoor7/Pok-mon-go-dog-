"use client";

import { Children, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useCalm, type ResultState } from "./hooks";
import { DUR, EASE } from "./tokens";

/** Plain text of a label, for the screen-reader announcement. */
export function plain(node: ReactNode): string {
  return Children.toArray(node).map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? plain(c.props.children) : "")).join("").trim();
}

/** A check that draws itself once, at the moment something becomes true. */
export function CheckDraw({ size = 14, stroke = 2.4, className }: { size?: number; stroke?: number; className?: string }) {
  const calm = useCalm();
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden className={`mo-check ${className ?? ""}`}>
      <motion.path d="M3.5 8.6 6.6 11.6 12.6 4.6" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
        initial={calm ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={calm ? { duration: 0 } : { duration: 0.26, ease: EASE, delay: 0.06 }} />
    </svg>
  );
}

/** Content that crossfades when its key changes: a status chip's label and colour, a count, a receipt replacing a
    button. The first render is never animated. */
export function Swap({ k, children, className, inline = true }: { k: string; children: ReactNode; className?: string; inline?: boolean }) {
  const calm = useCalm();
  const T = inline ? motion.span : motion.div;
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <T key={k} className={`mo-swap ${className ?? ""}`} initial={calm ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4, scale: 0.98 }} transition={calm ? { duration: 0 } : { duration: DUR.state, ease: EASE }}>
        {children}
      </T>
    </AnimatePresence>
  );
}

type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { state: ResultState; children: ReactNode; busy?: ReactNode; done: ReactNode };

/** A button that becomes its own result: "Save" → "Saving…" → "Saved ✓", then back to rest. Use it where the button is
    where the person is looking; keep a toast where the result needs an Undo. The three labels share one cell, so the
    button never changes width, and the result is announced to screen readers. */
export function ResultButton({ state, children, busy = "Saving…", done, className, disabled, ...rest }: BtnProps) {
  return (
    <>
      <button {...rest} className={`${className ?? ""} mo-res`} data-state={state} disabled={disabled || state === "busy"} aria-busy={state === "busy" || undefined}>
        <span className="mo-res-s">
          <span className="mo-res-l" data-on={state === "idle" || undefined} aria-hidden={state !== "idle" || undefined}>{children}</span>
          <span className="mo-res-l" data-on={state === "busy" || undefined} aria-hidden={state !== "busy" || undefined}><Loader2 size={14} className="nx-spin" aria-hidden />{busy}</span>
          <span className="mo-res-l" data-on={state === "done" || undefined} aria-hidden={state !== "done" || undefined}>{state === "done" ? <CheckDraw /> : <span className="mo-check" />}{done}</span>
        </span>
      </button>
      <span className="mo-sr" role="status">{state === "done" ? plain(done) : ""}</span>
    </>
  );
}
