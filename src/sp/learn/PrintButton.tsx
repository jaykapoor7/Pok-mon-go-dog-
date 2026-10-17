"use client";
import { Printer } from "lucide-react";
export function PrintButton({ label = "Print this page" }: { label?: string }) {
  return <button type="button" className="btn is-s" onClick={() => window.print()}><Printer size={14} aria-hidden /> {label}</button>;
}
