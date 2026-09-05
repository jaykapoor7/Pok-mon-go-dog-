"use client";

import { useEffect } from "react";
import { track, type EventName } from "@/lib/analytics";

/** Records one view for a server-rendered page. Renders nothing. */
export function PageView({
  name,
  props,
}: {
  name: EventName;
  props?: Record<string, unknown>;
}) {
  useEffect(() => {
    track(name, props ?? {}, { once: true });
    // Fires once per mount; `once` also covers React's development double mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  return null;
}
