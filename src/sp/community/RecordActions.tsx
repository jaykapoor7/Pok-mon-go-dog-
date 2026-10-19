"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, FolderLock, Radio, Share2 } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { getMyNgo } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";

/** Follow (kept on this device), report an update, share a safe link. */
export function RecordActions({ id, label }: { id: string; label: string }) {
  const { isFollowing, toggle } = useFollows();
  const [shared, setShared] = useState<string | null>(null);
  const on = isFollowing(id);
  const share = async () => {
    const url = `${window.location.origin}/animal/${id}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${label} on StrayPaw`, url }); setShared("Shared"); }
      else { await navigator.clipboard.writeText(url); setShared("Link copied"); }
    } catch { setShared(null); }
  };
  return (
    <div className="ar-actions">
      <button type="button" className={`btn${on ? " is-ink" : ""}`} aria-pressed={on} onClick={() => toggle(id)}>{on ? <BookmarkCheck size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />}{on ? "Following" : "Follow"}</button>
      <Link className="btn" href={`/community/report?animal=${id}`}><Radio size={16} aria-hidden /> Report an update</Link>
      <button type="button" className="btn is-ghost" onClick={share}><Share2 size={16} aria-hidden /> {shared ?? "Share"}</button>
      {on && <p className="small ar-note">Following is kept on this device. It shows this record in My Activity; it does not send notifications.</p>}
    </div>
  );
}

/** Back to the exact map view this record was opened from. */
export function BackToMap() {
  const [from, setFrom] = useState<string | null>(null);
  useEffect(() => { const f = new URLSearchParams(window.location.search).get("from"); if (f && /^\/(community|city)(\?|$)/.test(f)) setFrom(f); }, []);
  return <Link className="btn is-ghost is-s" href={from ?? "/community"}><ArrowLeft size={15} aria-hidden /> {from ? "Back to the map, as you left it" : "The map"}</Link>;
}

/** The professional depth of the same animal, for members of the organisation that holds it. */
export function CasefileLink({ id, ngoId }: { id: string; ngoId: string | null }) {
  const { user } = useAuth();
  const [mine, setMine] = useState(false);
  useEffect(() => { if (!user || !ngoId) return; getMyNgo().then((o) => setMine(!!o && o.id === ngoId)).catch(() => {}); }, [user, ngoId]);
  if (!mine) return null;
  return <Link className="btn is-s" href={`/ngo/animals/${id}`}><FolderLock size={15} aria-hidden /> Open your organisation&rsquo;s casefile</Link>;
}
