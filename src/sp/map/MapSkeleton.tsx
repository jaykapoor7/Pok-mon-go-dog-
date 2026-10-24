/* A paper-ground placeholder shown while FieldMap's chunk hydrates and the
   first tiles arrive. Matches the map's shell colour and header spacing so
   the swap is a cross-fade, not a layout jump. A reader never sees a blank
   page: the ground is already there, the search bar is already there, and
   a status line names what is happening. */

import "./field-map.css";
import "./map-skeleton.css";
import { Reading } from "../ui/Reading";

export function MapSkeleton({ label = "Opening the map" }: { label?: string }) {
  return (
    <div className="fm fm-skeleton" role="status" aria-live="polite">
      <div className="fm-skeleton-ground" aria-hidden>
        <svg viewBox="0 0 220 240" preserveAspectRatio="xMidYMid meet" aria-hidden focusable="false">
          {/* A soft India silhouette, hand-drawn in two paths so neither has
              to be exact: a reader sees "this is India" without noticing the
              outline. The map that arrives replaces it precisely. */}
          <path d="M78 14 C96 10, 126 14, 142 22 C156 30, 172 42, 180 60 C188 80, 190 100, 184 118 C178 134, 170 148, 164 164 C158 180, 150 196, 132 210 C118 222, 104 228, 92 224 C80 220, 72 208, 68 194 C64 180, 68 164, 62 152 C56 140, 44 134, 40 122 C36 108, 42 92, 48 76 C54 60, 62 42, 70 28 C72 22, 74 18, 78 14 Z"
            fill="#efe6d6" stroke="rgba(11, 30, 61, 0.14)" strokeWidth="0.6" />
        </svg>
      </div>
      <div className="fm-skeleton-head" aria-hidden>
        <span className="fm-skeleton-pill" style={{ width: 220 }} />
        <span className="fm-skeleton-pill" style={{ width: 130, opacity: 0.65, marginTop: 10 }} />
      </div>
      <div className="fm-skeleton-tools" aria-hidden>
        <span className="fm-skeleton-pill" style={{ width: 160 }} />
        <span className="fm-skeleton-pill" style={{ width: 44, height: 44, borderRadius: 999 }} />
      </div>
      <p className="fm-skeleton-say"><Reading>{label}</Reading></p>
    </div>
  );
}
