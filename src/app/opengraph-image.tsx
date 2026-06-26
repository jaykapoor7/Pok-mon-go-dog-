import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Dynamically generated share card — always fetchable by crawlers (fixes the
// gray/blank X preview) and on-brand. If public/logo.png exists it's used as the
// hero; otherwise a clean olive wordmark stands in.
export const runtime = "nodejs";
export const alt = "StrayPaw — Every dog has a story";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function loadLogo(): string | null {
  for (const name of ["logo.png", "logo.jpg", "logo.jpeg"]) {
    try {
      const buf = readFileSync(join(process.cwd(), "public", name));
      const mime = name.endsWith("png") ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

export default function OpengraphImage() {
  const logo = loadLogo();
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
          background: "#FBF8EE",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        {logo ? (
          <img
            src={logo}
            width={560}
            height={420}
            alt=""
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              fontSize: 132,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#515C30",
              lineHeight: 1,
            }}
          >
            STRAYPAW
          </div>
        )}
        <div
          style={{
            marginTop: 26,
            fontSize: 40,
            fontWeight: 700,
            color: "#515C30",
            textAlign: "center",
          }}
        >
          Open-sourcing stray-dog care
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 28,
            fontWeight: 500,
            color: "#6E7A45",
            textAlign: "center",
          }}
        >
          For the people, by the people.
        </div>
      </div>
    ),
    { ...size }
  );
}
