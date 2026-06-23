import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StrayPaw Delhi — Every dog has a story. Start seeing them.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card used for every page (X / WhatsApp / iMessage etc).
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
          background:
            "linear-gradient(135deg, #f97316 0%, #ea580c 45%, #db2777 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: 24,
              background: "white",
              color: "#ea580c",
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            SP
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            StrayPaw Delhi
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Every dog has a story.
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#ffedd5",
            }}
          >
            Start seeing them.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {["Spot", "Feed", "Vaccinate", "Sterilise", "Rescue"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
