"use client";

/* ════════════════════════════════════════════════════════════════════
   Site-wide language, without rewriting every page.

   The pages are written in English, inline. When another language is
   chosen, this walks the rendered page and replaces each text node (and
   each placeholder, aria-label, title and alt) whose English matches a
   phrase in that language's dictionary. It keeps the English it replaced,
   so choosing English again restores the page with no reload, and it
   watches the page so text that React renders later — a list that loads,
   a tab that opens, a new route — is translated as it appears.

   It only ever changes the value of a node React already owns, never the
   node itself, so React's own updates keep working: when React writes new
   English into a node, that write is seen and translated in turn.

   What it does not touch: anything marked translate="no", code, and any
   text not in the dictionary — names, localities, IDs and figures read
   from the record stay exactly as recorded.

   Dictionaries load only for the language chosen, so an English visitor
   downloads none of them.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import type { Locale } from "./locales";

type Phrases = Record<string, string>;
type Pattern = { re: RegExp; to: string };

/* A few phrases wrap a value read from the record ("Dog near {0}"). Their
   keys carry numbered slots; the value in each slot is kept as recorded
   and set into the translation's matching slot. A slot written {#0} takes
   only a figure ("{#0} days ago"). Longer literal text is tried first, so
   "{0}: few requests" wins over "{0}: {1} requests". */
const patternCache = new WeakMap<Phrases, Pattern[]>();
function patterns(dict: Phrases): Pattern[] {
  let list = patternCache.get(dict);
  if (list) return list;
  list = Object.keys(dict)
    .filter((k) => /\{#?\d\}/.test(k))
    .sort((a, b) => b.replace(/\{#?\d\}/g, "").length - a.replace(/\{#?\d\}/g, "").length)
    .map((k) => {
      const order: number[] = [];
      const src = k.split(/(\{#?\d\})/).map((part) => {
        const slot = part.match(/^\{(#?)(\d)\}$/);
        if (slot) { order.push(Number(slot[2])); return slot[1] ? "([\\d,.]+)" : "(.+?)"; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("");
      const to = dict[k].replace(/\{#?(\d)\}/g, (_, d) => `{${order.indexOf(Number(d))}}`);
      return { re: new RegExp(`^${src}$`), to };
    });
  patternCache.set(dict, list);
  return list;
}

function lookup(dict: Phrases, key: string): string | undefined {
  const hit = dict[key];
  if (hit) return hit;
  for (const p of patterns(dict)) {
    const m = key.match(p.re);
    if (m) return p.to.replace(/\{(\d)\}/g, (_, i) => m[Number(i) + 1] ?? "");
  }
  return undefined;
}

const LOADERS: Partial<Record<Locale, () => Promise<{ default: Phrases }>>> = {
  hi: () => import("./phrases/hi.json"),
  ta: () => import("./phrases/ta.json"),
  te: () => import("./phrases/te.json"),
  kn: () => import("./phrases/kn.json"),
};

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "svg"]);

/** One key per phrase however it was spaced or broken across lines. */
export const normPhrase = (s: string) => s.replace(/[\s ]+/g, " ").trim();

type Seen = { english: string; written: string };
const textSeen = new WeakMap<Text, Seen>();
const attrSeen = new WeakMap<Element, Record<string, Seen>>();

function skipped(el: Element | null): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (SKIP.has(n.tagName) || n.getAttribute("translate") === "no" || n.hasAttribute("data-no-translate")) return true;
  }
  return false;
}

function translateText(node: Text, dict: Phrases | null) {
  const now = node.nodeValue ?? "";
  const seen = textSeen.get(node);
  /* Our own write coming back as a mutation: nothing to do. */
  if (seen && now === seen.written) return;
  /* Otherwise whatever is there now is English (first sight, or React
     wrote a new value). */
  const english = now;
  const key = normPhrase(english);
  if (!key || !dict) { if (seen) textSeen.delete(node); return; }
  const hit = lookup(dict, key);
  if (!hit) { if (seen) textSeen.delete(node); return; }
  if (skipped(node.parentElement)) return;
  const lead = english.match(/^\s*/)?.[0] ?? "";
  const trail = english.match(/\s*$/)?.[0] ?? "";
  const written = lead + hit + trail;
  textSeen.set(node, { english, written });
  node.nodeValue = written;
}

function translateAttrs(el: Element, dict: Phrases | null) {
  for (const name of ATTRS) {
    const now = el.getAttribute(name);
    if (now === null) continue;
    const rec = attrSeen.get(el) ?? {};
    const seen = rec[name];
    if (seen && now === seen.written) continue;
    const hit = dict ? lookup(dict, normPhrase(now)) : undefined;
    if (!hit || skipped(el)) { if (seen) delete rec[name]; continue; }
    rec[name] = { english: now, written: hit };
    attrSeen.set(el, rec);
    el.setAttribute(name, hit);
  }
}

function walk(root: Node, dict: Phrases | null) {
  if (root.nodeType === Node.TEXT_NODE) { translateText(root as Text, dict); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP.has(el.tagName)) return;
  translateAttrs(el, dict);
  const it = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n as Text, dict);
    else translateAttrs(n as Element, dict);
  }
}

/** Put every replaced phrase back to the English it replaced. */
function restore() {
  const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const seen = textSeen.get(n as Text);
      if (seen && n.nodeValue === seen.written) n.nodeValue = seen.english;
      textSeen.delete(n as Text);
    } else {
      const rec = attrSeen.get(n as Element);
      if (!rec) continue;
      for (const [name, seen] of Object.entries(rec)) if ((n as Element).getAttribute(name) === seen.written) (n as Element).setAttribute(name, seen.english);
      attrSeen.delete(n as Element);
    }
  }
}

export function DomTranslator({ locale }: { locale: Locale }) {
  useEffect(() => {
    const load = LOADERS[locale];
    if (!load) { restore(); return; }
    let dict: Phrases | null = null;
    let live = true;
    let queued: Node[] = [];
    let frame = 0;
    const flush = () => { frame = 0; const batch = queued; queued = []; for (const n of batch) if (n.isConnected) walk(n, dict); };
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") queued.push(r.target);
        else if (r.type === "attributes") queued.push(r.target);
        else r.addedNodes.forEach((n) => queued.push(n));
      }
      if (!frame) frame = requestAnimationFrame(flush);
    });
    load().then((mod) => {
      if (!live) return;
      dict = mod.default;
      walk(document.body, dict);
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    }).catch(() => { /* The page stays in English; nothing breaks. */ });
    return () => { live = false; observer.disconnect(); if (frame) cancelAnimationFrame(frame); restore(); };
  }, [locale]);
  return null;
}
