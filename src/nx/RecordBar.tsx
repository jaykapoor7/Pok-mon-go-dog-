"use client";

import { useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Sheet } from "./Phone";
import { usePhone } from "./PhoneList";
import "./css/list-phone.css";

/* A record's actions on a phone (docs/rebuild/MOBILE.md, "Records"): one primary action and a "More" sheet in a bar
   at the bottom of the page, above the phone bar, instead of a row that scrolls sideways under the title. The record
   head's own action row is hidden on a phone while this bar is shown. Nothing renders on a desktop. */

export function RecordBar({ primary, more, label = "More actions" }: { primary?: ReactNode; more?: ReactNode; label?: string }) {
  const phone = usePhone();
  const [open, setOpen] = useState(false);
  if (!phone || (!primary && !more)) return null;
  /* The sheet sits beside the bar, not in it: the bar is sticky, and a sheet inside it would stack under the phone bar. */
  return <>
    <div className="rb-bar" role="group" aria-label="Actions on this record">
      {primary ? <div className="rb-primary">{primary}</div> : null}
      {more ? <button type="button" className={`rb-more-b ${primary ? "" : "is-alone"}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><MoreHorizontal size={20} aria-hidden /><span>More</span></button> : null}
    </div>
    <Sheet open={open} onClose={() => setOpen(false)} label={label}>
      <div className="rb-more" onClick={(e) => { if ((e.target as HTMLElement).closest("a[href], [data-close]")) setOpen(false); }}>{more}</div>
    </Sheet>
  </>;
}
