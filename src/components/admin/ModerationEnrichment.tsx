"use client";

import { useEffect, useState } from "react";
import { WorkbookEnrichment } from "@/components/admin/WorkbookEnrichment";

const KEY = "straypaw.admin_secret";

export function ModerationEnrichment() {
  const [secret, setSecret] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const readModeratorSession = () => {
      if (cancelled) return;
      const saved = window.localStorage.getItem(KEY)?.trim() ?? "";
      if (saved) {
        setSecret(saved);
        return;
      }
      timer = setTimeout(readModeratorSession, 400);
    };

    readModeratorSession();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!secret) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <WorkbookEnrichment secret={secret} />
    </div>
  );
}
