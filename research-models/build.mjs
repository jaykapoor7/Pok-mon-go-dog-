import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { dirname } from "node:path";
import { models, portfolio, references, siteName, straypaw } from "./src/editorial.mjs";
import { snapshot } from "./src/snapshot.ts";

const site = new URL(process.env.SITE_URL || "https://straypaw-research-models.vercel.app");
const base = site.pathname.replace(/\/$/, "");
const origin = site.origin + base;
const trailingSlash = process.env.SITE_TRAILING_SLASH === "1";
const publishedPath = path => trailingSlash && path !== "/" ? path + "/" : path;

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
const arrow = '<svg class="arrow-glyph" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
<link rel="canonical" href="${escape(canonical)}"><meta name="theme-color" content="#242722">
<meta property="og:type" content="website"><meta property="og:site_name" content="${siteName}">
<meta property="og:title" content="${escape(name)}"><meta property="og:description" content="${escape(subtitle)}">
<meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${origin}/social.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="StrayPaw Research Models. Five experiments in public health.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css">
${script ? `<script type="module" src="/${script}"></script>` : ""}
</head>
<body class="page-${page}">
<a class="skip" href="#main">Skip to content</a>
<header class="mast"><div class="mast-inner wrap">
  <a class="brand" href="/" aria-label="StrayPaw Research Models home"><span class="brand-mark">${mark}</span><span><b>StrayPaw</b><small>Research Models</small></span></a>
  <nav aria-label="Main navigation"><a href="/#experiments"${current("home")}>Models</a><a href="/notes"${current("notes")}>Notes</a><a href="/about"${current("about")}>About</a></nav>
  <a class="portfolio-link" href="${portfolio}">Jay Kapoor ${arrow}</a>
</div></header>
<main id="main">${body}</main>
<footer class="site-foot wrap"><span>StrayPaw Research Models</span><nav aria-label="More from Jay Kapoor"><a href="${portfolio}">Jay’s portfolio ${arrow}</a><a href="${straypaw}">StrayPaw.org ${arrow}</a></nav></footer>
</body></html>`);
}

const shortNames = ["Vaccine coverage", "Case reporting", "Case mix", "Sterilization", "Prevention"];
const cardQuestions = [
  "Can two cities with 70% coverage face different outbreaks?",
  "Can reports rise while the number of cases holds steady?",
  "Can both groups improve while their average falls?",
  "Why can a falling birth rate leave dog counts unchanged at first?",
  "How do you count infections that never happened?",
];

function motif(index) {
  const figures = [
    '<defs><pattern id="atlas-dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.7" fill="currentColor"/></pattern></defs><path fill="url(#atlas-dots)" stroke="none" d="M0 0h120v60H0z"/><path d="M83 5c20 7 9 21 24 29 8 6 10 13 7 23H68c12-10 4-19 14-30 5-6 5-14 1-22Z" fill="var(--surface)" fill-opacity=".9"/><path d="M83 5c20 7 9 21 24 29 8 6 10 13 7 23" stroke-width="1.4"/>',
    '<path d="M8 51h104M8 11h104" stroke-dasharray="3 3" opacity=".6"/><path d="M12 51V42h11v9m6 0V33h11v18m6 0V37h11v14m6 0V29h11v22m6 0V23h11v28m6 0V15h11v36" fill="currentColor" stroke="none"/><circle cx="102" cy="11" r="2.5" fill="currentColor"/>',
    '<path d="M7 11h82v15H7zM7 34h45v15H7z" fill="currentColor" stroke="none"/><path d="M89 11h24v15H89zM52 34h61v15H52z" fill="none"/><path d="m91 23 10-10m-3 11 10-10m-50 32 10-10m-2 10 10-10m-2 10 10-10m-2 10 10-10m-2 10 10-10m-2 10 10-10" opacity=".6"/>',
    '<path d="M6 51h108" opacity=".5"/><path d="M8 47C34 44 41 22 66 24s28 5 44-13" stroke-width="2"/><path d="M8 47c27-3 39-16 59-14s31 8 43 1" stroke-width="2" stroke-dasharray="4 3"/><path d="M65 7v47" stroke-dasharray="2 3" opacity=".7"/><circle cx="65" cy="24" r="3" fill="currentColor"/>',
    '<path d="M7 49c22-1 30-22 48-30 14-6 29-9 56-9v30c-21-2-36 7-56 8-14 1-34 1-48 1Z" fill="currentColor" opacity=".18"/><path d="M7 49c22-1 30-22 48-30 14-6 29-9 56-9M7 49c14 0 34 0 48-1 20-1 35-10 56-8" stroke-width="2"/><circle cx="7" cy="49" r="3" fill="currentColor"/>',
  ][index];
  return `<svg class="motif" viewBox="0 0 120 60" width="120" height="60" fill="none" stroke="currentColor" aria-hidden="true">${figures}</svg>`;
}

function modelSelector(active) {
  return `<nav class="model-selector" aria-label="Choose an experiment">
    ${models.map((model, index) => `<a href="${modelPath(model)}" data-study="${model.id}"${model.id === active ? ' aria-current="page"' : ""}><span>${model.number}</span>${shortNames[index]}</a>`).join("")}
  </nav>`;
}

function board(model) {
  return `<section class="experiment-board" aria-label="Interactive model">
    <div class="board-top"><span>${model.field}</span><span>Simulated results</span></div>
    <div id="experiment" data-model="${model.id}"><noscript><p class="noscript">Enable JavaScript to run the experiment. <a href="${notePath(model)}">Read the model and its assumptions.</a></p></noscript></div>
  </section>`;
}

function bench(model, index, home = false) {
  return `<div class="bench" data-study="${model.id}">
    <header class="study-intro">
      <div class="study-id"><span>Model ${model.number} / 05</span>${home ? '<span>Field notebook</span>' : ""}</div>
      <div class="study-copy">
        <h1>${home ? "Same 70%.<br> Different<br> outbreaks." : cardQuestions[index]}</h1>
        <p>${model.setup}</p>
      </div>
      <div class="study-source">
        <span class="eyebrow">From the StrayPaw register</span>
        ${model.evidenceValue ? `<strong>${model.evidenceValue}</strong><p>${model.evidenceLabel}</p>` : `<p>${model.evidenceMethod}</p>`}
        <a href="${notePath(model)}#data">How we use this data ${arrow}</a>
      </div>
    </header>
    ${board(model)}
  </div>`;
}

function home() {
  return `<div class="workbench wrap">
    ${modelSelector("spatial")}
    ${bench(models[0], 0, true)}
    <section class="index" id="experiments">
      <div class="section-heading"><h2>Explore the models</h2><a href="/notes">Research notes ${arrow}</a></div>
      <ol class="experiment-list">${models.map((model, index) => `<li data-study="${model.id}"><a href="${modelPath(model)}"><span class="tile-id"><span>${model.number} / 05</span>${arrow}</span><span class="tile-figure">${motif(index)}</span><strong>${model.title}</strong><span class="list-question">${cardQuestions[index]}</span></a></li>`).join("")}</ol>
    </section>
  </div>`;
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
  return `<article class="model wrap workbench">
    ${modelSelector(model.id)}
    ${bench(model, index)}
    <div class="discovery"><span class="eyebrow">What this shows</span><p>${model.discovery}</p></div>
    <details class="method"><summary>Assumptions and methodology</summary><p>${model.parameters}</p>${equations(model)}<p>${model.limitations}</p><a href="${notePath(model)}">Read the full research note ${arrow}</a></details>
    <nav class="model-nav" aria-label="Experiment navigation">
      <a href="${back ? modelPath(back) : "/#experiments"}"><span class="eyebrow">← ${back ? "Previous experiment" : "Index"}</span><strong>${back ? back.title : "All experiments"}</strong></a>
      <a href="${next ? modelPath(next) : "/notes"}"><span class="eyebrow">${next ? "Next experiment" : "Notebook"} →</span><strong>${next ? next.title : "Research notes"}</strong></a>
    </nav>
  </article>`;
}

function notebook() {
  return `<section class="notebook wrap"><header class="article-head"><div class="eyebrow">Methods / 01–05</div><h1>Research notes</h1><p>What each experiment calculates, where its assumptions come from, and how far its conclusions go.</p></header>
    <ol class="note-index">${models.map((model, index) => `<li data-study="${model.id}"><a href="${notePath(model)}"><span class="list-no">${model.number}</span>${motif(index)}<div><span class="eyebrow">${model.field}</span><strong>${model.title}</strong></div><span class="list-arrow" aria-hidden="true">${arrow}</span></a></li>`).join("")}</ol>
    <section class="bibliography" id="bibliography"><h2>Bibliography</h2>${sourceList(Object.keys(references))}</section>
  </section>`;
}

function note(model, index) {
  return `<article class="note wrap" data-study="${model.id}">
  <header class="article-head"><a href="/notes" class="back">← Research notes</a><div class="eyebrow">Note ${model.number} / ${model.field}</div><h1>${model.title}</h1><p>${model.question}</p><a class="button primary" href="${modelPath(model)}">Open experiment ${model.number} ${arrow}</a></header>
  <div class="note-layout"><aside aria-label="Note figure"><div class="note-figure">${motif(index)}<span class="eyebrow">FIG ${model.number}</span></div><nav aria-label="On this page"><a href="#question">Question</a><a href="#data">Data</a><a href="#model">Model</a><a href="#limits">Limits</a><a href="#systems">In practice</a><a href="#sources">Sources</a></nav></aside>
  <div class="note-prose"><section id="question"><h2>The question</h2><p>${model.questionNote}</p></section>
  <section id="data"><h2>From the StrayPaw register</h2><p>${model.evidenceMethod}</p><p class="snapshot-date">Snapshot ${snapshot.date} · <a href="${model.evidenceLink}">Source record or catalogue ${arrow}</a></p></section>
  <section id="model"><h2>How the model works</h2><p>${model.parameters}</p>${equations(model)}</section>
  <section id="limits"><h2>How far the result goes</h2><p>${model.limitations}</p></section>
  <section id="systems"><h2>What to measure in practice</h2><p>${model.implication}</p></section>
  <section id="sources"><h2>Sources</h2>${sourceList(model.refs)}</section></div></div></article>`;
}

function about() {
  return `<article class="about wrap"><header class="article-head"><div class="eyebrow">Project notes</div><h1>Public health in five models</h1><p>Built by Jay Kapoor as a companion to StrayPaw.</p></header>
  <div class="note-prose"><p>StrayPaw works on making animal birth control and rabies vaccination records easier to verify. Building that software raises questions a register alone cannot answer. Where did a campaign miss dogs? When did a change in reporting look like a change in incidence? How would we tell whether an intervention made a difference?</p>
  <p>These experiments make those questions tangible. Each model starts from an aggregate in StrayPaw’s Supabase register. The notes show how those inputs are calculated, where hypothetical assumptions enter, and what extra evidence would be needed to make a real-world estimate.</p><div class="about-links"><a href="${portfolio}">Jay Kapoor’s portfolio ${arrow}</a><a href="${straypaw}">StrayPaw.org ${arrow}</a><a href="/notes">Research notes ${arrow}</a></div></div></article>`;
}

const output = "dist";
await rm(output, { recursive: true, force: true });
await mkdir(output);
await cp("public", output, { recursive: true });
for (const file of ["snapshot", "models", "interactive"]) {
  const source = await readFile("src/" + file + ".ts", "utf8");
  await writeFile(output + "/" + file + ".js", stripTypeScriptTypes(source.replaceAll(/from "(\.\/[^"]+)\.ts"/g, 'from "$1.js"')).replace(/^[ \t]+$/gm, ""));
}
const routes = [
  ["/", "", description, home(), "home", "interactive.js"],
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
