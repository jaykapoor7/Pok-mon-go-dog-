"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";
import type { NGO } from "@/lib/types";
import { SITE_URL } from "@/lib/site-url";

type CopyKind = "widget" | "profile" | "message" | null;

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
export function WebsiteWidget({ org }: { org: NGO }) {
  const [copied, setCopied] = useState<CopyKind>(null);
  if (!org.slug) {
    return (
      <section className="card p-5">
        <h3 className="font-display text-lg tracking-tightest text-bark-900 dark:text-bark-50">Website widget</h3>
        <p className="mt-2 text-sm leading-relaxed text-bark-500">Your public profile needs a website address before a widget can be created.</p>
      </section>
    );
  }

  const embedUrl = SITE_URL + "/embed/" + org.slug;
  const publicUrl = SITE_URL + "/org/" + org.slug;
  const title = org.name + " live animal welfare records";
  const iframeCode = [
    "<iframe",
    '  src="' + embedUrl + '"',
    '  width="400"',
    '  height="400"',
    '  style="border:0;max-width:100%;"',
    '  loading="lazy"',
    '  title="' + title + '"',
    "></iframe>",
  ].join("\n");
  const websiteMessage = [
    "Hi, please add our live StrayPaw impact widget to our website.",
    "",
    "Add an Embed or Custom HTML block and paste the code below.",
    "",
    "The numbers update automatically, so nothing needs to be maintained after it is added.",
    "",
    iframeCode,
  ].join("\n");

  async function copy(kind: Exclude<CopyKind, null>, value: string) {
    try {
      await copyText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => current === kind ? null : current), 3500);
    } catch {
      setCopied(null);
    }
  }

  const actionLabel = (kind: Exclude<CopyKind, null>, normal: string) =>
    copied === kind ? "Copied" : normal;

  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b border-black/[0.07] px-5 py-5 dark:border-white/10">
        <h3 className="font-display text-lg tracking-tightest text-bark-900 dark:text-bark-50">Show your live records on your website</h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-bark-500">Your numbers update automatically as your StrayPaw records change.</p>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bark-400">Your website widget</p>
          <div className="max-w-[400px] overflow-hidden border border-black/[0.08] bg-white dark:border-white/10">
            <iframe
              src={embedUrl}
              width="400"
              height="400"
              loading="lazy"
              title={title}
              className="block h-auto w-full aspect-square border-0"
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-2.5">
            <button type="button" onClick={() => void copy("widget", iframeCode)} className="btn-primary min-h-11 justify-center px-4 text-sm sm:justify-start">
              {copied === "widget" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {actionLabel("widget", "Copy website widget")}
            </button>
            {copied === "widget" && <p className="text-sm text-status-vaccinated">Copied. Paste this into an Embed or Custom HTML block on your website.</p>}

            <button type="button" onClick={() => void copy("profile", publicUrl)} className="btn-ghost min-h-11 justify-center px-4 text-sm sm:justify-start">
              {copied === "profile" ? <Check className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              {actionLabel("profile", "Copy public profile link")}
            </button>
            {copied === "profile" && <p className="text-sm text-bark-500">You can also add this link behind an “Our impact”, “Our records” or “View our work” button.</p>}

            <button type="button" onClick={() => void copy("message", websiteMessage)} className="btn-ghost min-h-11 justify-center px-4 text-sm sm:justify-start">
              {copied === "message" ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {actionLabel("message", "Send to website person")}
            </button>
            {copied === "message" && <p className="text-sm text-bark-500">A ready-to-send message and the website widget were copied.</p>}
          </div>

          <div className="mt-6 border-t border-black/[0.07] pt-5 dark:border-white/10">
            <h4 className="text-sm font-semibold text-bark-900 dark:text-bark-50">Adding it to your website</h4>
            <div className="mt-3 grid gap-3 text-sm text-bark-600 dark:text-bark-300 sm:grid-cols-2">
              <p><strong className="block text-bark-900 dark:text-bark-50">WordPress</strong>Add a Custom HTML block → paste → publish.</p>
              <p><strong className="block text-bark-900 dark:text-bark-50">Wix</strong>Add Embed Code → Embed HTML → paste → publish.</p>
              <p><strong className="block text-bark-900 dark:text-bark-50">Squarespace</strong>Add a Code block → paste → save.</p>
              <p><strong className="block text-bark-900 dark:text-bark-50">Webflow</strong>Add an Embed element → paste → publish.</p>
            </div>
            <p className="mt-4 text-sm text-bark-500">Other website: send the copied widget to whoever manages your website.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
