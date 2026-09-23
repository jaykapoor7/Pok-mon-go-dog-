"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DIRECTIONS, SCREENS } from "./screens";
import { SYSTEM_SCREENS } from "./system/screens";

/* Lab chrome only: a small switcher so the three directions can be
   compared screen for screen. `?clean` hides it for screenshots. */
function Bar() {
  const path = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  if (params.has("clean")) return null;
  const [, , dir, screen] = path.split("/");
  return (
    <nav className={`labbar${open ? " open" : ""}`} aria-label="Design lab">
      <button type="button" className="labbar-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <b>LAB</b> {dir === "system" ? "System" : DIRECTIONS.find((d) => d.id === dir)?.letter ?? "—"} · {(dir === "system" ? SYSTEM_SCREENS.find((s) => s.id === screen)?.name : SCREENS.find((s) => s.id === screen)?.name) ?? "Index"}
      </button>
      {open && (
        <div className="labbar-panel">
          <Link href="/lab" onClick={() => setOpen(false)}>All directions</Link>
          <div className="labbar-row">
            <span>Field system · Atlas + Civic</span>
            <div>{SYSTEM_SCREENS.map((s) => <Link key={s.id} href={`/lab/system/${s.id}`} aria-current={dir === "system" && s.id === screen ? "page" : undefined} onClick={() => setOpen(false)}>{s.name}</Link>)}</div>
          </div>
          {DIRECTIONS.map((d) => (
            <div key={d.id} className="labbar-row">
              <span>{d.letter}. {d.name}</span>
              <div>
                {SCREENS.map((s) => (
                  <Link key={s.id} href={`/lab/${d.id}/${s.id}`} aria-current={d.id === dir && s.id === screen ? "page" : undefined} onClick={() => setOpen(false)}>
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}

export function LabBar() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}
