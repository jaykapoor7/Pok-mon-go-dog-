"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flag, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const REASONS = [
  "Not a street dog / off-topic",
  "Contains a person without consent",
  "Private or sensitive information",
  "Graphic or distressing imagery",
  "Spam or misleading",
  "Other",
];

export default function ReportContentPage() {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 pt-28 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-status-vaccinated/15 text-status-vaccinated">
          <Check className="h-8 w-8" />
        </span>
        <h1 className="font-display text-2xl font-extrabold">Report received</h1>
        <p className="mt-2 text-sm text-bark-500">
          Thank you. Our team will review this and take action if it breaks our
          Community Guidelines.
        </p>
        <Link href="/" className="btn-primary mt-5 px-6 py-3">
          Back to the map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>
      <h1 className="font-display text-3xl font-extrabold">Report content</h1>
      <p className="mt-1 text-sm text-bark-500">
        Flag a sighting or photo that breaks our guidelines. Reports are
        confidential.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold">Reason</label>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  "chip border transition-colors",
                  reason === r
                    ? "border-paw-300 bg-paw-500 text-white"
                    : "border-bark-200 bg-white text-bark-600 hover:border-paw-300"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Link to the content{" "}
            <span className="font-normal text-bark-400">(optional)</span>
          </label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Paste the dog profile or sighting link"
            className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Details</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder="Tell us what's wrong…"
            className="w-full resize-none rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100"
          />
        </div>

        <button
          onClick={() => setSent(true)}
          disabled={!reason}
          className="btn-primary w-full py-4 text-base"
        >
          <Flag className="h-5 w-5" /> Submit report
        </button>
      </div>
    </div>
  );
}
