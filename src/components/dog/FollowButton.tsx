"use client";

import { Star } from "lucide-react";
import { useFollows } from "@/lib/follows";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * Follow/unfollow a dog (kept on-device). Styled to sit on the dark cover photo.
 */
export function FollowButton({ dogId, className }: { dogId: string; className?: string }) {
  const { isFollowing, toggle } = useFollows();
  const on = isFollowing(dogId);

  return (
    <button
      onClick={() => {
        toggle(dogId);
        haptic(on ? "select" : "success");
      }}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold shadow-warm transition-colors active:scale-95",
        on ? "bg-paw-500 text-white" : "bg-white/90 text-bark-800 hover:bg-white",
        className
      )}
    >
      <Star className={cn("h-4 w-4", on && "fill-current")} />
      {on ? "Following" : "Follow"}
    </button>
  );
}
