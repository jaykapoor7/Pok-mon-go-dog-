"use client";

/* Opens one evidence file. Files kept in StrayPaw's private store are read
   through a signed link that expires after five minutes, so the link is
   fetched when the person asks for it, not when the page is drawn. */

import { useState, type ReactNode } from "react";
import { evidenceLink, isStoredEvidence } from "@/lib/abc";

export function EvidenceLink({ url, children = "Open" }: { url: string; children?: ReactNode }) {
  const [err, setErr] = useState<string | null>(null);
  if (!isStoredEvidence(url)) return <a href={url} target="_blank" rel="noreferrer noopener">{children}</a>;
  const open = async () => {
    setErr(null);
    /* Open the tab inside the click so phones do not block it, then point it at the signed link. */
    const tab = window.open("about:blank", "_blank");
    try {
      const link = await evidenceLink(url);
      if (tab) { tab.opener = null; tab.location.href = link; } else window.location.href = link;
    } catch (e) { tab?.close(); setErr((e as Error).message); }
  };
  return (
    <>
      <button type="button" className="abc-linkbtn" onClick={open}>{children}</button>
      {err && <small className="abc-err-inline" role="alert">{err}</small>}
    </>
  );
}
