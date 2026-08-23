import { ImageResponse } from "next/og";

// Dynamically generated share card — always fetchable by crawlers (fixes the
// gray/blank preview) and fully on-brand (cerulean, no raster dependency).
export const runtime = "nodejs";
export const alt = "StrayPaw — a home for India's street animals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Inline blue animal-head tile (pure shapes → no font dependency in Satori).
const PAW_TILE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b86f0"/><stop offset="1" stop-color="#2842a0"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><path fill="#ffffff" d="M150 96 C158 168 176 196 205 214 C168 244 156 300 190 356 C214 396 254 420 256 420 C258 420 298 396 322 356 C356 300 344 244 307 214 C336 196 354 168 362 96 C318 118 282 150 262 176 C258 168 254 168 250 176 C230 150 194 118 150 96 Z"/><g fill="url(#g)"><ellipse cx="221" cy="250" rx="15" ry="20"/><ellipse cx="291" cy="250" rx="15" ry="20"/></g></svg>`
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
          background: "#FBFCFE",
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
            color: "#3b63e0",
            lineHeight: 1,
          }}
        >
          StrayPaw
        </div>
        <div style={{ marginTop: 22, fontSize: 40, fontWeight: 700, color: "#2842a0", textAlign: "center" }}>
          A home for India&apos;s street animals
        </div>
        <div style={{ marginTop: 10, fontSize: 27, fontWeight: 500, color: "#3b63e0", textAlign: "center" }}>
          For the people, by the people.
        </div>
      </div>
    ),
    { ...size }
  );
}
