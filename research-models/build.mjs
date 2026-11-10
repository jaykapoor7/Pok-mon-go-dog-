import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { dirname } from "node:path";
import { models, portfolio, references, siteName, straypaw } from "./src/editorial.mjs";
import { random } from "./src/models.ts";
import { snapshot } from "./src/snapshot.ts";

const site = new URL(process.env.SITE_URL || "https://straypaw-research-models.vercel.app");
const base = site.pathname.replace(/\/$/, "");
const origin = site.origin + base;
const htmlPaths = process.env.SITE_STATIC_HTML === "1";
const publishedPath = path => htmlPaths ? (path === "/" ? "/index.html" : path + ".html") : path;

function localLinks(html) {
  return html.replace(/(href|src)="(\/(?!\/)[^"#]*)(#[^"]*)?"/g, (_, attr, path, fragment = "") => {
    const isAsset = /\.[a-z0-9]+$/i.test(path);
    return attr + '="' + base + (isAsset ? path : publishedPath(path)) + fragment + '"';
  });
}
const description = "Five interactive experiments in public health, from the geography of vaccination to the outbreaks we never see.";
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const modelPath = model => "/models/" + model.slug;
const notePath = model => "/notes/" + model.slug;
const arrow = '<span aria-hidden="true">↗&#xfe0e;</span>';
const mark = '<svg class="mark" width="25" height="25" viewBox="0 0 25 25" aria-hidden="true"><path d="M3 19 11 5m3 15 8-14M4 12h17" fill="none" stroke="currentColor" stroke-width="1.35"/><circle cx="11" cy="5" r="2.3" fill="currentColor"/><circle cx="14" cy="20" r="2.3" fill="currentColor"/></svg>';

function layout(path, title, subtitle, body, page, script = "") {
  const name = title ? title + " · " + siteName : siteName;
  const canonical = origin + publishedPath(path);
  const current = key => page === key ? ' aria-current="page"' : "";
  return localLinks(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(name)}</title><meta name="description" content="${escape(subtitle)}">
<link rel="canonical" href="${escape(canonical)}"><meta name="theme-color" content="#f5f2eb">
<meta property="og:type" content="website"><meta property="og:site_name" content="${siteName}">
<meta property="og:title" content="${escape(name)}"><meta property="og:description" content="${escape(subtitle)}">
<meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${origin}/social.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="StrayPaw Research Models. Five experiments in public health.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css">
${script ? `<script type="module" src="/${script}"></script>` : ""}
</head>
<body class="page-${page}">
<a class="skip" href="#main">Skip to content</a>
<header class="mast wrap">
  <a class="brand" href="/" aria-label="StrayPaw Research Models home">${mark}<span><b>STRAYPAW</b><small>RESEARCH MODELS</small></span></a>
  <nav aria-label="Main navigation"><a href="/#experiments"${current("home")}>Experiments</a><a href="/notes"${current("notes")}>Research notes</a><a href="/about"${current("about")}>About</a></nav>
</header>
<main id="main">${body}</main>
<footer class="site-foot wrap"><a class="brand" href="/">${mark}<span><b>STRAYPAW</b><small>RESEARCH MODELS</small></span></a><span>Public health experiments grounded in StrayPaw data.</span><nav aria-label="More from Jay Kapoor"><a href="${portfolio}">Jay’s portfolio ${arrow}</a><a href="${straypaw}">StrayPaw.org ${arrow}</a></nav></footer>
</body></html>`);
}

function field() {
  const circles = Array.from({ length: 390 }, (_, i) => {
    const col = i % 26, row = Math.floor(i / 26);
    const x = 36 + col * 17.6, y = 36 + row * 17.6;
    const dx = col - 17, dy = row - 7;
    const radius = Math.hypot(dx * 0.78, dy);
    const intensity = random(31, i);
    const lit = radius < 5.5 && intensity > 0.22;
    const active = lit && (Math.abs(radius - 2.4) < 1.3 || radius < 1);
    const className = active ? "spark" : lit ? "halo" : "field-dot";
    const r = active ? 2.7 : lit ? 2.05 : intensity < 0.12 ? 2 : 1.2;
    return `<circle class="${className}" cx="${x}" cy="${y}" r="${r}" style="--d:${(radius * 0.19 + intensity * 0.33).toFixed(2)}s"/>`;
  }).join("");
  return `<svg viewBox="0 0 512 320" class="field" aria-hidden="true">
    <path class="field-lines" d="M21 19h470v284H21z M21 73h470M21 144h470M21 215h470M21 286h470M89 19v284m88-284v284m88-284v284m88-284v284m88-284v284"/>
    <circle class="orbit" cx="335" cy="159" r="40"/><circle class="orbit" cx="335" cy="159" r="74"/><circle class="orbit" cx="335" cy="159" r="104"/>
    <path class="field-cross" d="M21 26v-7h7m456 0h7v7m0 270v7h-7m-456 0h-7v-7M302 159h66m-33-33v66"/>
    ${circles}
  </svg>`;
}

function motif(index) {
  const content = [
    '<path d="M8 7h1m7 0h1m7 0h1m7 0h1M8 15h1m7 0h1m7 0h1m7 0h1M8 23h1m7 0h1m7 0h1m7 0h1M8 31h1m7 0h1m7 0h1m7 0h1" stroke-width="3" stroke-linecap="round"/><circle cx="24.5" cy="15" r="9" opacity=".46"/>',
    '<path d="M4 31h32M5 29l7-10 6 3 7-9 9-6M5 7h31" stroke-dasharray="0"/><circle cx="34" cy="7" r="2.7" fill="currentColor"/>',
    '<path d="M5 33h30M8 27v-9h5v9m5 0V10h5v17m5 0V5h5v22"/>',
    '<path d="M5 29c10-18 17-15 30-23M5 29c11-15 18-9 30-3"/><path d="M5 34h30" opacity=".5"/>',
    '<path d="M4 27c10 0 12-14 19-18s10-4 13-4M4 27c10 0 17 4 32 4"/><circle cx="11" cy="25" r="2.5" fill="currentColor"/>',
  ][index];
  return `<svg class="motif" viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">${content}</svg>`;
}

function home() {
  return `<section class="hero wrap">
    <div class="hero-copy"><div class="eyebrow"><i></i> An interactive field notebook</div>
    <h1>What if the<br class="wide"> numbers are right,<br class="wide"> but the conclusion<br class="wide"> is <em>wrong?</em></h1>
    <p>Five interactive experiments in public health, grounded in the StrayPaw register.</p>
    <a class="button primary" href="${modelPath(models[0])}">Start with experiment 01 <span aria-hidden="true">↗&#xfe0e;</span></a></div>
    <a class="hero-field" href="${modelPath(models[0])}" aria-label="Open experiment 01, The 70% Paradox">
      <div class="plate-top"><span><i></i> FIELD STUDY 01</span><span>SPATIAL TRANSMISSION</span></div>
      ${field()}
      <div class="plate-bottom"><span>FIG 01 <b>·</b> CONTACT NETWORK</span><span aria-hidden="true">↗&#xfe0e;</span></div>
    </a>
  </section>
  <section class="index wrap" id="experiments">
    <div class="section-heading"><div><div class="eyebrow">The field notebook</div><h2>Five experiments.</h2></div><span class="eyebrow index-count">01 — 05</span></div>
    <ol class="experiment-list">${models.map((model, index) => `<li><a href="${modelPath(model)}"><span class="list-no">${model.number}</span>${motif(index)}<div><span class="eyebrow list-field">${model.field}</span><strong>${model.title}</strong><span class="list-question">${model.question}</span></div><span class="list-arrow" aria-hidden="true">↗&#xfe0e;</span></a></li>`).join("")}</ol>
    <p class="below-index">Curious how it’s calculated? <a href="/notes">Read the research notes <span aria-hidden="true">↗&#xfe0e;</span></a></p>
  </section>`;
}

function sourceList(ids) {
  return `<ol class="source-list">${ids.map(key => {
    const [author, title, url] = references[key];
    return `<li><span>${author}</span><a href="${url}">${title} ${arrow}</a></li>`;
  }).join("")}</ol>`;
}

function equations(model) {
  return model.equations.map(([title, equation, detail]) => `<div class="equation"><span class="eyebrow">${title}</span><p>${equation}</p>${detail ? `<small>${detail}</small>` : ""}</div>`).join("");
}

function experiment(model, index) {
  const back = models[index - 1];
  const next = models[index + 1];
  return `<article class="model wrap">
    <header class="model-head">
      <a href="/#experiments" class="back">← All experiments</a>
      <div class="eyebrow"><i></i> Experiment ${model.number} <b> / </b> ${model.field}</div>
      <h1>${model.question}</h1><p>${model.setup}</p>
    </header>
    <section class="experiment-board" aria-label="Interactive model">
      <div class="board-top"><span><i></i> ${model.title}</span><span>Simulation · StrayPaw data</span></div>
      <div id="experiment" data-model="${model.id}"><noscript><p class="noscript">Enable JavaScript to run the experiment. <a href="${notePath(model)}">Read the model and its assumptions.</a></p></noscript></div>
    </section>
    <div class="discovery"><span class="eyebrow">What this shows</span><p>${model.discovery}</p></div>
    <div class="data-anchor"><span class="eyebrow">From the StrayPaw register</span><p><strong>${model.evidenceValue}</strong> ${model.evidenceLabel}</p><a href="${notePath(model)}#data">How we use this data ${arrow}</a></div>
    <details class="method"><summary>Assumptions and methodology</summary><p>${model.parameters}</p>${equations(model)}<p>${model.limitations}</p><a href="${notePath(model)}">Read the full research note ${arrow}</a></details>
    <nav class="model-nav" aria-label="Experiment navigation">
      <a href="${back ? modelPath(back) : "/#experiments"}"><span class="eyebrow">← ${back ? "Previous experiment" : "Index"}</span><strong>${back ? back.title : "All experiments"}</strong></a>
      <a href="${next ? modelPath(next) : "/notes"}"><span class="eyebrow">${next ? "Next experiment" : "Notebook"} →</span><strong>${next ? next.title : "Research notes"}</strong></a>
    </nav>
  </article>`;
}

function notebook() {
  return `<section class="notebook wrap"><header class="article-head"><div class="eyebrow"><i></i> The methods behind the models</div><h1>Research notes.</h1><p>Five short accounts of what each experiment calculates, where its assumptions come from, and how far its conclusions go.</p></header>
    <ol class="note-index">${models.map((model, index) => `<li><a href="${notePath(model)}"><span class="list-no">${model.number}</span>${motif(index)}<div><span class="eyebrow">${model.field}</span><strong>${model.title}</strong></div><span class="list-arrow" aria-hidden="true">↗&#xfe0e;</span></a></li>`).join("")}</ol>
    <section class="bibliography" id="bibliography"><h2>Bibliography</h2>${sourceList(Object.keys(references))}</section>
  </section>`;
}

function note(model, index) {
  return `<article class="note wrap">
  <header class="article-head"><a href="/notes" class="back">← Research notes</a><div class="eyebrow"><i></i> Note ${model.number} <b> / </b> ${model.field}</div><h1>${model.title}</h1><p>${model.question}</p><a class="button primary" href="${modelPath(model)}">Open experiment ${model.number} ${arrow}</a></header>
  <div class="note-layout"><aside aria-label="Note figure"><div class="note-figure">${motif(index)}<span class="eyebrow">FIG ${model.number}</span></div><nav aria-label="On this page"><a href="#question">Question</a><a href="#data">Data</a><a href="#model">Model</a><a href="#limits">Limits</a><a href="#systems">In practice</a><a href="#sources">Sources</a></nav></aside>
  <div class="note-prose"><section id="question"><h2>The question</h2><p>${model.questionNote}</p></section>
  <section id="data"><h2>From the StrayPaw register</h2><p>${model.evidenceMethod}</p><p class="snapshot-date">Snapshot ${snapshot.date} · <a href="${model.evidenceLink}">Source record or catalogue ${arrow}</a></p></section>
  <section id="model"><h2>How the model works</h2><p>${model.parameters}</p>${equations(model)}</section>
  <section id="limits"><h2>How far the result goes</h2><p>${model.limitations}</p></section>
  <section id="systems"><h2>What to measure in practice</h2><p>${model.implication}</p></section>
  <section id="sources"><h2>Sources</h2>${sourceList(model.refs)}</section></div></div></article>`;
}

function about() {
  return `<article class="about wrap"><header class="article-head"><div class="eyebrow"><i></i> About the project</div><h1>Public health<br>in five small models.</h1><p>Built by Jay Kapoor as a companion to StrayPaw.</p></header>
  <div class="note-prose"><p>StrayPaw works on making animal birth control and rabies vaccination records easier to verify. Building that software raises questions a register alone cannot answer. Where did a campaign miss dogs? When did a change in reporting look like a change in incidence? How would we tell whether an intervention made a difference?</p>
  <p>These experiments make those questions tangible. Each model starts from an aggregate in StrayPaw’s Supabase register. The notes show how those inputs are calculated, where hypothetical assumptions enter, and what extra evidence would be needed to make a real-world estimate.</p><div class="about-links"><a href="${portfolio}">Jay Kapoor’s portfolio ${arrow}</a><a href="${straypaw}">StrayPaw.org ${arrow}</a><a href="/notes">Research notes ${arrow}</a></div></div></article>`;
}

const output = "dist";
await rm(output, { recursive: true, force: true });
await mkdir(output);
await cp("public", output, { recursive: true });
for (const file of ["snapshot", "models", "interactive"]) {
  const source = await readFile("src/" + file + ".ts", "utf8");
  await writeFile(output + "/" + file + ".js", stripTypeScriptTypes(source.replaceAll(/from "(\.\/[^"]+)\.ts"/g, 'from "$1.js"')));
}
const routes = [
  ["/", "", description, home(), "home"],
  ["/notes", "Research notes", "Methods, assumptions and sources for the five StrayPaw research models.", notebook(), "notes"],
  ["/about", "About", "About Jay Kapoor’s interactive public-health notebook and its relationship to StrayPaw.", about(), "about"],
  ...models.flatMap((model, index) => [
    [modelPath(model), model.title, model.question, experiment(model, index), "model", "interactive.js"],
    [notePath(model), model.title + " — research note", model.question, note(model, index), "notes"],
  ]),
];
for (const [path, title, subtitle, body, page, script] of routes) {
  const file = output + (path === "/" ? "/index" : path) + ".html";
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, layout(path, title, subtitle, body, page, script));
}
await writeFile(output + "/404.html", layout("/404", "Page not found", description, '<section class="wrap article-head"><h1>Page not found.</h1><p><a href="/#experiments">Browse the experiments →</a></p></section>', "about"));
await writeFile(output + "/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + routes.map(([path]) => `<url><loc>${escape(origin + publishedPath(path))}</loc></url>`).join("") + "</urlset>");
await writeFile(output + "/robots.txt", "User-agent: *\nAllow: /\nSitemap: " + origin + "/sitemap.xml\n");
console.log(`Built ${routes.length} pages and a 404 in ${output}/`);
