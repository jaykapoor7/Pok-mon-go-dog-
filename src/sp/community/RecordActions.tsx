"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, FolderLock, Radio, Share2 } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { getMyNgo } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn } from "@/ws/kit";

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
    <div className="rk-actions">
      <Btn aria-pressed={on} onClick={() => toggle(id)} icon={on ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}>{on ? "Following" : "Follow"}</Btn>
      <Btn href={`/community/report?animal=${id}`} icon={<Radio size={14} />}>Report an update</Btn>
      <Btn variant="quiet" onClick={share} icon={<Share2 size={14} />}>{shared ?? "Share"}</Btn>
      {on && <p className="rk-fine">Following is kept on this device. It shows this record in My Activity; it does not send notifications.</p>}
    </div>
  );
}

/** Back to the exact map view this record was opened from. */
export function BackToMap() {
  const [from, setFrom] = useState<string | null>(null);
  useEffect(() => { const f = new URLSearchParams(window.location.search).get("from"); if (f && /^\/(community|city|explore)(\?|$)/.test(f)) setFrom(f); }, []);
  return <Btn small variant="quiet" href={from ?? "/community"} icon={<ArrowLeft size={14} />}>{from ? "Back to the map, as you left it" : "The map"}</Btn>;
}

/** The professional depth of the same animal, for members of the organisation that holds it. */
export function CasefileLink({ id, ngoId }: { id: string; ngoId: string | null }) {
  const { user } = useAuth();
  const [mine, setMine] = useState(false);
  useEffect(() => { if (!user || !ngoId) return; getMyNgo().then((o) => setMine(!!o && o.id === ngoId)).catch(() => {}); }, [user, ngoId]);
  if (!mine) return null;
  return <Btn href={`/ngo/animals/${id}`} icon={<FolderLock size={14} />}>Open your organisation&rsquo;s casefile</Btn>;
}
