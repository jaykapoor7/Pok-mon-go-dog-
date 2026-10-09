"use client";

/* The record's sections as tabs, so the profile stays one or two screens
   long instead of one tall scroll. Panels are rendered on the server and
   passed in; this only chooses which one is shown. */

import { useState, type ReactNode } from "react";

export function DossierTabs({ tabs }: { tabs: { id: string; label: string; count?: number; panel: ReactNode }[] }) {
  const [on, setOn] = useState(tabs[0]?.id);
  return (
    <div className="dt">
      <div className="dt-bar" role="tablist" aria-label="Record sections">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`dt-${t.id}`} aria-selected={on === t.id} aria-controls={`dtp-${t.id}`} onClick={() => setOn(t.id)}>
            {t.label}{t.count ? <span>{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`dtp-${t.id}`} aria-labelledby={`dt-${t.id}`} hidden={on !== t.id} className="dt-panel">{t.panel}</div>
      ))}
    </div>
  );
}
