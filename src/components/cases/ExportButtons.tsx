"use client";

import { Download, Printer } from "lucide-react";

export function ExportButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <a href="/api/cases/export" className="btn-ghost px-4 py-2.5 text-sm" download>
        <Download className="h-4 w-4" /> Export CSV
      </a>
      <button onClick={() => window.print()} className="btn-ghost px-4 py-2.5 text-sm">
        <Printer className="h-4 w-4" /> Print report
      </button>
    </div>
  );
}
