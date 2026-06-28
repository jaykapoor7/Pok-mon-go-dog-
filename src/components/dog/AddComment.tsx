"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { addComment } from "@/lib/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { haptic } from "@/lib/haptics";

/** Add a community note to a dog. Open to everyone (name optional). */
export function AddComment({ dogId }: { dogId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await addComment(dogId, body, user?.name);
      setText("");
      haptic("success");
      router.refresh();
    } catch {
      haptic("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        placeholder="Add a note about this dog…"
        className="min-h-[44px] flex-1 resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900"
      />
      <button
        onClick={submit}
        disabled={busy || !text.trim()}
        aria-label="Post note"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paw-500 text-white disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}
