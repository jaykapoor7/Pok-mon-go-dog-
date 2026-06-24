import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StrayPaw Delhi — Every dog has a story. Start seeing them.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Decorative "map markers" — evokes the product without remote images.
const DOTS = [
  { x: 815, y: 96, c: "#ef4444", r: 13 },
  { x: 980, y: 150, c: "#f59e0b", r: 11 },
  { x: 1080, y: 280, c: "#8b5cf6", r: 12 },
  { x: 905, y: 250, c: "#10b981", r: 10 },
  { x: 1010, y: 410, c: "#ec4899", r: 12 },
  { x: 850, y: 400, c: "#64748b", r: 9 },
  { x: 1110, y: 520, c: "#f59e0b", r: 10 },
  { x: 920, y: 520, c: "#10b981", r: 11 },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#0b0b0c",
          backgroundImage:
            "radial-gradient(800px circle at 8% 0%, rgba(234,88,12,0.22), transparent 55%), radial-gradient(700px circle at 100% 100%, rgba(236,72,153,0.16), transparent 55%)",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* marker motif */}
        {DOTS.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: d.r * 2,
              backgroundColor: d.c,
              border: "3px solid rgba(255,255,255,0.85)",
              boxShadow: `0 0 28px ${d.c}aa`,
              display: "flex",
            }}
          />
        ))}

        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #fb923c, #ea580c)",
              color: "white",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            SP
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5, color: "#e7e5e4" }}>
            StrayPaw Delhi
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3 }}>
            Every dog has a story.
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -3,
              backgroundImage: "linear-gradient(90deg, #fb923c, #ec4899)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Start seeing them.
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 10, height: 10, borderRadius: 10, backgroundColor: "#fb923c" }} />
          <div style={{ fontSize: 27, color: "rgba(255,255,255,0.62)" }}>
            A live community map of Delhi&apos;s street dogs — spot · feed · rescue
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
