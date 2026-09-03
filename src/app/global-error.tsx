"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, where the
 * normal error boundary never mounts. It has to render its own <html>/<body>
 * and cannot rely on the app's fonts or stylesheet, so everything here is
 * inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#0b1020",
          color: "#f4f5f7",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main style={{ maxWidth: 460 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-monospace, monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#ff6a4f",
            }}
          >
            Error / application
          </p>
          <h1
            style={{
              margin: "14px 0 0",
              fontSize: 34,
              lineHeight: 1.05,
              fontWeight: 500,
              letterSpacing: "-0.03em",
            }}
          >
            StrayPaw failed to start.
          </h1>
          <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.6, color: "#b3bccb" }}>
            Something went wrong before the app could load. Reloading usually
            clears it.
          </p>
          {error.digest && (
            <p
              style={{
                margin: "16px 0 0",
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                color: "#7d8794",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 28,
              padding: "12px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: "#0b1020",
              background: "#8fb7ff",
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
