"use client";

/* ════════════════════════════════════════════════════════════════════
   A photograph that may show an injured animal stays blurred until the
   viewer chooses to see it.

   Wrap any image: the content is blurred and dimmed, with a quiet note
   and a "View" control on top. Pressing it reveals that photo for the
   rest of the session (remembered by its key, usually the image URL),
   so a person who has chosen to look is not asked again on the next
   card. The control stops the click from reaching a surrounding link,
   so tapping a blurred card never opens the record by accident.

   On small thumbnails only an icon is shown. Unknown is not treated as
   safe by callers: see lib/sensitive-photo for who is blurred.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "sp.revealed.v1";

function revealedSet(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as string[]); } catch { return new Set(); }
}

export function SensitiveVeil({
  sensitive,
  id,
  children,
  className,
  compact = false,
  note = "May show an injured animal",
}: {
  sensitive: boolean;
  /** What to remember the reveal by, usually the image URL. */
  id?: string | null;
  children: ReactNode;
  className?: string;
  /** Icon only, for thumbnails under about 80px. */
  compact?: boolean;
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (sensitive && id && revealedSet().has(id)) setOpen(true); }, [sensitive, id]);

  if (!sensitive || open) return <>{children}</>;

  const reveal = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    if (id) { try { const s = revealedSet(); s.add(id); sessionStorage.setItem(KEY, JSON.stringify([...s].slice(-200))); } catch { /* ok */ } }
  };

  return (
    <div className={cn("sv", compact && "is-compact", className)}>
      <div className="sv-media" aria-hidden>{children}</div>
      <button type="button" className="sv-cover" onClick={reveal} aria-label={`${note}. Show photo`}>
        <EyeOff size={compact ? 14 : 18} aria-hidden />
        {!compact && <span className="sv-note">{note}</span>}
        {!compact && <span className="sv-go">Tap to view</span>}
      </button>
    </div>
  );
}
