import { ImageResponse } from "next/og";

// Dynamically generated share card — always fetchable by crawlers (fixes the
// gray/blank preview) and fully on-brand (cerulean, no raster dependency).
export const runtime = "nodejs";
export const alt = "StrayPaw — a home for India's street animals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Inline light-blue "Badge" animal tile (pure shapes → no font dependency).
const PAW_TILE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#93c1fd"/><stop offset="45%" stop-color="#3b7de6"/><stop offset="100%" stop-color="#1e50b0"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#g)"/><path d="M 20 56 L 31 15 Q 34 10 38 14 L 49 42" fill="#fff"/><path d="M 80 56 L 69 15 Q 66 10 62 14 L 51 42" fill="#fff"/><circle cx="50" cy="63" r="28" fill="#fff"/><circle cx="41" cy="58" r="3.5" fill="url(#g)"/><circle cx="59" cy="58" r="3.5" fill="url(#g)"/></svg>`
)}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbfdff",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PAW_TILE} width={150} height={150} alt="" />
        <div
          style={{
            marginTop: 34,
            fontSize: 118,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#0f1626",
            lineHeight: 1,
          }}
        >
          StrayPaw
        </div>
        <div style={{ marginTop: 22, fontSize: 40, fontWeight: 700, color: "#3b7de6", textAlign: "center" }}>
          Every stray has a name, a story, and people who care
        </div>
        <div style={{ marginTop: 10, fontSize: 27, fontWeight: 500, color: "#2f63c2", textAlign: "center" }}>
          For the people, by the people.
        </div>
      </div>
    ),
    { ...size }
  );
}
