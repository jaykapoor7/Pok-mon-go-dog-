"use client";

/* The demonstration site presents a group's proposed product, not StrayPaw. Text written in the source is renamed
   when the demo compiles (scripts/demo-brand-loader.cjs); this covers what arrives while the page runs: the
   assistant's own messages and names stored in the database, and a StrayPaw logo on a page that draws its own.
   It changes only what is shown, after the page has loaded, and never what is typed or sent. */
import { useEffect } from "react";
import { rebrand } from "@/lib/demo-brand";

const WORD = /\b(StrayPaw|Kaju)\b/;
const LOGO = /\/(icon-192|icon|straypaw-mark|straypaw-symbol|apple-icon)\.(png|svg)(\?|$)/;
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "NOSCRIPT"]);

function fixText(n: Text) { if (WORD.test(n.data) && !SKIP.has(n.parentElement?.tagName ?? "")) n.data = rebrand(n.data); }
function fixTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { fixText(root as Text); return; }
  if (!(root instanceof Element) || SKIP.has(root.tagName)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) fixText(t as Text);
  for (const img of [root, ...root.querySelectorAll("img")]) if (img instanceof HTMLImageElement && LOGO.test(img.getAttribute("src") ?? "")) { img.src = "/demo-mark.svg"; img.srcset = ""; }
  for (const el of root.querySelectorAll("[aria-label], [title], [placeholder]")) for (const a of ["aria-label", "title", "placeholder"]) { const v = el.getAttribute(a); if (v && WORD.test(v)) el.setAttribute(a, rebrand(v)); }
}

export function DemoBrand() {
  useEffect(() => {
    fixTree(document.body);
    if (WORD.test(document.title)) document.title = rebrand(document.title);
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") fixText(m.target as Text);
        else for (const n of m.addedNodes) fixTree(n);
      }
      if (WORD.test(document.title)) document.title = rebrand(document.title);
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    const head = document.querySelector("title");
    const mt = head ? new MutationObserver(() => { if (WORD.test(document.title)) document.title = rebrand(document.title); }) : null;
    if (head) mt?.observe(head, { childList: true, characterData: true, subtree: true });
    return () => { mo.disconnect(); mt?.disconnect(); };
  }, []);
  return null;
}
