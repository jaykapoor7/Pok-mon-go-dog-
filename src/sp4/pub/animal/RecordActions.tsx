"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, FolderLock, Radio, Share2 } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { getMyNgo } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { Btn, LinkBtn } from "../kit";

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
    <div className="an-acts">
      <div className="pb-actions">
        <Btn variant="line" aria-pressed={on} onClick={() => toggle(id)} icon={on ? <BookmarkCheck size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />}>{on ? "Following" : "Follow"}</Btn>
        <LinkBtn variant="flame" href={`/community/report?animal=${id}`} icon={<Radio size={16} aria-hidden />}>Report a sighting</LinkBtn>
        <Btn variant="quiet" onClick={share} icon={<Share2 size={16} aria-hidden />}>{shared ?? "Share"}</Btn>
      </div>
      <p className="pb-fine" aria-live="polite">{on ? "Following is kept on this device. It shows this record in My activity; it does not send notifications." : shared === "Link copied" ? "The link is copied. It opens this public record only: no exact place, no reporter." : null}</p>
    </div>
  );
}

/** Back to the exact map view this record was opened from. */
export function BackToMap() {
  const [from, setFrom] = useState<string | null>(null);
  useEffect(() => { const f = new URLSearchParams(window.location.search).get("from"); if (f && /^\/(community|city|explore)(\/|\?|$)/.test(f)) setFrom(f); }, []);
  return <LinkBtn small variant="quiet" href={from ?? "/community"} icon={<ArrowLeft size={16} aria-hidden />}>{from ? (from.startsWith("/community/stories") ? "Back to the stories" : "Back to the map, as you left it") : "The map"}</LinkBtn>;
}

/** The professional depth of the same animal, only for members of the organisation that holds it (the app checks again). */
export function CasefileLink({ id, ngoId }: { id: string; ngoId: string | null }) {
  const { user } = useAuth();
  const [mine, setMine] = useState(false);
  useEffect(() => { if (!user || !ngoId) { setMine(false); return; } let live = true; getMyNgo().then((o) => { if (live) setMine(!!o && o.id === ngoId); }).catch(() => {}); return () => { live = false; }; }, [user, ngoId]);
  if (!mine) return null;
  return <LinkBtn href={`/next/ngo/animals/${id}`} icon={<FolderLock size={16} aria-hidden />}>Open your organisation&rsquo;s case file</LinkBtn>;
}
