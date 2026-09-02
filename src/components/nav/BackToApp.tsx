"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BackToApp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("fromApp") === "1") {
        setShow(true);
        sessionStorage.removeItem("fromApp");
      }
    } catch {
      // sessionStorage unavailable (private mode etc) — no-op
    }
  }, []);

  if (!show) return null;

  return (
    <Link
      href="/map"
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        zIndex: 200,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "rgba(7,11,17,0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(233,172,66,0.28)",
        borderRadius: 8,
        padding: "8px 15px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.06em",
        color: "#e9ac42",
        textDecoration: "none",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      ← Back to app
    </Link>
  );
}
