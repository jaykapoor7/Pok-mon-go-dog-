import { ImageResponse } from "next/og";

// Dynamically generated share card — always fetchable by crawlers (fixes the
// gray/blank preview) and fully on-brand (cerulean, no raster dependency).
export const runtime = "nodejs";
export const alt = "StrayPaw — a home for India's street animals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Inline cerulean paw tile (pure shapes → no font dependency in Satori).
const PAW_TILE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f8fe0"/><stop offset="1" stop-color="#0d5488"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><g fill="#ffffff"><ellipse cx="256" cy="322" rx="98" ry="82"/><ellipse cx="150" cy="250" rx="39" ry="50"/><ellipse cx="214" cy="192" rx="37" ry="48"/><ellipse cx="298" cy="192" rx="37" ry="48"/><ellipse cx="362" cy="250" rx="39" ry="50"/></g></svg>`
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
          background: "#FAF7F0",
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
            color: "#0e7bcc",
            lineHeight: 1,
          }}
        >
          StrayPaw
        </div>
        <div style={{ marginTop: 22, fontSize: 40, fontWeight: 700, color: "#0d5488", textAlign: "center" }}>
          A home for India&apos;s street animals
        </div>
        <div style={{ marginTop: 10, fontSize: 27, fontWeight: 500, color: "#0e7bcc", textAlign: "center" }}>
          For the people, by the people.
        </div>
      </div>
    ),
    { ...size }
  );
}
