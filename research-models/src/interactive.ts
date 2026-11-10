import {
  caseMixRates, clamp, COMMUNITY, DEFAULT_CAPACITY, DEFAULT_CLUSTER, DEFAULT_REPORTING, DEFAULT_SEED, DOGS,
  MONTHLY_BITES, MONTHS, nextSeed, pairedEpidemics,
  population, PREVENTIVE_DOSES, SIDE, spatialComparison, summarize, surveillance, TRIALS, WEEKS,
} from "./models.ts";

const root = document.querySelector<HTMLDivElement>("#experiment")!;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const fmt = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const number = (n: number) => fmt.format(n);
const percent = (n: number) => Math.round(n * 100) + "%";
const query = new URLSearchParams(location.search);
const seedParam = query.get("seed");
const initialSeed = seedParam !== null && /^\d{1,10}$/.test(seedParam) && Number(seedParam) <= 0xffffffff
  ? Number(seedParam) : DEFAULT_SEED;
let seed = initialSeed;
let raf = 0;

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

function startingValue(key: string, fallback: number, min: number, max: number) {
  const raw = query.get(key);
  if (raw === null || !/^\d{1,4}$/.test(raw)) return fallback;
  return clamp(Number(raw), min, max);
}

function shareable(values: Record<string, number>) {
  const url = new URL(location.href);
  url.search = "";
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, String(value));
  history.replaceState(null, "", url);
}

function play(duration: number, draw: (fraction: number) => void, done = () => {}) {
  cancelAnimationFrame(raf);
  if (reducedMotion.matches || duration === 0) {
    draw(1);
    done();
    return;
  }
  const start = performance.now();
  const frame = (now: number) => {
    const progress = reducedMotion.matches ? 1 : clamp((now - start) / duration, 0, 1);
    draw(progress);
    if (progress < 1) raf = requestAnimationFrame(frame);
    else done();
  };
  draw(0);
  raf = requestAnimationFrame(frame);
}

const button = (id: string, label: string, main = false, pressed?: boolean) =>
  `<button type="button" id="${id}" class="button ${main ? "control-primary" : "quiet-button"}"${pressed === undefined ? "" : ` aria-pressed="${pressed}"`}>${label}</button>`;
const legend = (items: [string, string][]) => `<ul class="legend" aria-label="Figure legend">${items.map(([color, label]) =>
  `<li><span class="swatch ${color}"></span>${label}</li>`).join("")}</ul>`;
const range = (label: string, min: number, max: number, step: number, value: number, left: string, right: string) =>
  `<div class="range"><div class="range-heading"><label for="lever">${label}</label><output id="setting" for="lever"></output></div><input id="lever" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><div class="range-ends" aria-hidden="true"><span>${left}</span><span>${right}</span></div></div>`;
const tools = (actions: string, includeSeed = true) => `<div class="board-actions">${actions}<div class="aux-actions">${includeSeed ? '<span class="seed" id="seed"></span>' : ""}
  ${button("reset", "Reset")}${button("share", "Copy link")}</div></div><p class="sr-only" id="status" role="status"></p>`;

function wireShare() {
  element("share").onclick = async () => {
    const value = location.href;
    try {
      await navigator.clipboard.writeText(value);
      element("status").textContent = "Experiment link copied.";
      const share = element("share");
      share.textContent = "Copied";
      setTimeout(() => { share.textContent = "Copy link"; }, 1800);
    } catch {
      window.prompt("Copy this experiment link", value);
    }
  };
}

function updateSeed() {
  const node = document.getElementById("seed");
  if (node) node.textContent = "Seed " + seed;
}

function setRange(value: string, numeric: number) {
  element("setting").textContent = value;
  const input = element<HTMLInputElement>("lever");
  input.value = String(numeric);
  input.setAttribute("aria-valuetext", value);
}

function wireRange(update: (value: number, animate: boolean) => void) {
  const input = element<HTMLInputElement>("lever");
  input.oninput = () => update(input.valueAsNumber, false);
  input.onchange = () => update(input.valueAsNumber, true);
}

const gridPoints = Array.from({ length: DOGS }, (_, i) => {
  const x = 8 + (i % SIDE) * 11;
  const y = 8 + Math.floor(i / SIDE) * 11;
  return [x, y];
});
function dogGrid() {
  return `<svg class="dog-grid" viewBox="0 0 225 225" aria-hidden="true"><path d="M1 14V1h13m197 0h13v13m0 197v13h-13m-197 0H1v-13" class="grid-brackets"/>${gridPoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join("")}</svg>`;
}

function spatial() {
  let grouping = startingValue("cluster", DEFAULT_CLUSTER, 0, 100);
  const city = (id: string, name: string, label: string) =>
    `<div class="city"><div class="city-label"><div><span class="eyebrow">${name}</span><h2>${label}</h2></div><strong>70%</strong></div>
      ${dogGrid()}<div class="city-count" id="${id}-count"></div><div class="distribution" id="${id}-distribution"></div></div>`;
  root.innerHTML = `${range("Cluster vaccinations in City B", 0, 100, 1, grouping, "Spread across the city", "Concentrate on one side")}
    <div class="spatial-content"><div class="city-pair">${city("a", "City A · fixed", "Dispersed")}${city("b", "City B · adjustable", "Redistributed")}</div>
    ${legend([["blue", "Vaccinated"], ["gray", "Susceptible"], ["orange", "Infected in this run"]])}</div>
    ${tools(button("replay", "Replay outbreak", true) + button("zoom", "Look closer", false, false) + button("new", "New seed"))}`;
  const dots = [...root.querySelectorAll(".dog-grid")].map(grid => [...grid.querySelectorAll("circle")]);
  const names = ["a", "b"];
  const adjustableGrid = root.querySelectorAll(".dog-grid")[1];
  let zoomed = false;
  let zoomFrame = 0;
  let bounds = [0, 0, 225, 225];
  let cached = "";
  let results: ReturnType<typeof spatialComparison>;

  function focusGap(animate: boolean) {
    cancelAnimationFrame(zoomFrame);
    const affected = results[1].sample.hit.flatMap((step, i) => step >= 0 ? [gridPoints[i]] : []);
    const center = (axis: number) => affected.reduce((sum, point) => sum + point[axis], 0) / affected.length;
    const size = 144;
    const target = zoomed
      ? [clamp(center(0) - size / 2, 0, 225 - size), clamp(center(1) - size / 2, 0, 225 - size), size, size]
      : [0, 0, 225, 225];
    const button = element("zoom");
    button.setAttribute("aria-pressed", String(zoomed));
    button.textContent = zoomed ? "Show whole city" : "Look closer";
    const from = [...bounds];
    const started = performance.now();
    const draw = (now: number) => {
      const fraction = animate && !reducedMotion.matches ? clamp((now - started) / 260, 0, 1) : 1;
      bounds = from.map((value, i) => value + (target[i] - value) * (1 - (1 - fraction) ** 3));
      adjustableGrid.setAttribute("viewBox", bounds.join(" "));
      if (fraction < 1) zoomFrame = requestAnimationFrame(draw);
    };
    draw(started);
  }

  const run = (animate: boolean) => {
    updateSeed();
    setRange(grouping + "% clustered", grouping);
    shareable({ cluster: grouping, seed });
    const key = grouping + "/" + seed;
    if (key !== cached) {
      results = spatialComparison(grouping / 100, seed);
      cached = key;
    }
    focusGap(false);
    const generations = Math.max(1, ...results.map(result => result.sample.generation));
    const countNodes = names.map(id => element(id + "-count"));
    const frames = results.map(({ sample }) => {
      const counts = Array<number>(generations + 1).fill(0);
      for (const step of sample.hit) if (step >= 0) counts[step]++;
      for (let i = 1; i < counts.length; i++) counts[i] += counts[i - 1];
      return counts;
    });
    results.forEach(({ vaccinated, sample, distribution }, cityIndex) => {
      dots[cityIndex].forEach((dot, i) => {
        dot.setAttribute("class", vaccinated.has(i) ? "immune" : i === sample.start ? "case origin-dot" : "susceptible");
        dot.setAttribute("r", i === sample.start ? "3.7" : "2.2");
      });
      element(names[cityIndex] + "-distribution").innerHTML = `<b>${decimal.format(distribution.mean)} average</b> across ${TRIALS} runs <span>10th–90th percentile: ${distribution.lo}–${distribution.hi}</span>`;
    });
    let last = -1;
    play(animate ? Math.min(2150, 380 + generations * 110) : 0, progress => {
      const step = Math.floor(progress * generations);
      if (step === last) return;
      last = step;
      results.forEach(({ sample }, cityIndex) => {
        sample.hit.forEach((hit, i) => {
          if (hit > 0 && hit <= step) dots[cityIndex][i].setAttribute("class", "case");
        });
        countNodes[cityIndex].innerHTML = `<strong>${frames[cityIndex][step]}</strong> <span>infected in this run</span>`;
      });
    }, () => { element("status").textContent = `City A: ${results[0].sample.count} infected. City B: ${results[1].sample.count} infected. Both cities vaccinated 280 of 400 dogs.`; });
  };
  wireRange((value, animate) => { grouping = value; run(animate); });
  element("replay").onclick = () => run(true);
  element("zoom").onclick = () => { zoomed = !zoomed; focusGap(true); };
  element("new").onclick = () => { seed = nextSeed(seed); run(true); };
  element("reset").onclick = () => { seed = DEFAULT_SEED; grouping = DEFAULT_CLUSTER; zoomed = false; run(false); };
  wireShare();
  run(true);
}

const plot = { left: 66, top: 25, right: 728, bottom: 246 };
type Line = { values: number[]; className: string; points?: boolean };
type Axis = { min: number; max: number; ticks: number[]; label?: (n: number) => string };
function chart(lines: Line[], xLabels: [number, string][], axis: Axis, description: string, progress = 1) {
  const count = lines[0]?.values.length ?? xLabels.at(-1)![0] + 1;
  const x = (i: number) => plot.left + (plot.right - plot.left) * i / (count - 1);
  const y = (n: number) => plot.bottom - (plot.bottom - plot.top) * (n - axis.min) / (axis.max - axis.min);
  const display = axis.label || number;
  const xTicks = xLabels.map(([i, label]) => `<text x="${x(i)}" y="274" text-anchor="${i === 0 ? "start" : i === count - 1 ? "end" : "middle"}">${label}</text>`).join("");
  const yTicks = axis.ticks.map(tick => `<path d="M${plot.left} ${y(tick)}H${plot.right}" class="plot-grid"/><text x="56" y="${y(tick) + 4}" text-anchor="end">${display(tick)}</text>`).join("");
  return `<svg class="chart" viewBox="0 0 750 290" role="img" aria-label="${description}">
    <defs><clipPath id="chart-reveal"><rect x="${plot.left - 4}" width="${(plot.right - plot.left) * progress + 8}" y="0" height="280"/></clipPath></defs>
    ${xTicks}${yTicks}<g clip-path="url(#chart-reveal)">${lines.map(({ values, className, points }) => `<g><polyline class="trace ${className}" points="${values.map((value, i) => x(i).toFixed(1) + "," + y(value).toFixed(1)).join(" ")}"/>${points ? values.map((value, i) => `<circle class="trace-point ${className}" cx="${x(i)}" cy="${y(value)}" r="3.4"/>`).join("") : ""}</g>`).join("")}</g></svg>`;
}

function revealChart(progress: number) {
  root.querySelector("#chart-reveal rect")?.setAttribute("width", String((plot.right - plot.left) * progress + 8));
}

function bites() {
  let reporting = startingValue("reporting", DEFAULT_REPORTING, 15, 100);
  let revealed = query.get("actual") === "1";
  root.innerHTML = `${range("Reporting completeness by December", 15, 100, 1, reporting, "15% of incidents", "100% of incidents")}
    <div class="chart-content"><div class="figure-heading"><span class="eyebrow">Bite-related animal-care cases / month</span><span class="eyebrow">A simulated year</span></div>
    <div id="chart"></div><div id="legend"></div><div id="chart-reading" class="chart-reading"></div></div>
    ${tools(button("reveal", "Reveal simulated actual cases", true, revealed) + button("new", "Resample reports"))}`;
  const render = (animate: boolean) => {
    updateSeed();
    setRange(reporting + "% recorded", reporting);
    shareable({ reporting, actual: Number(revealed), seed });
    const data = surveillance(reporting / 100, seed);
    const lines: Line[] = [{ values: data.map(month => month.reported), className: "orange", points: true }];
    if (revealed) lines.unshift({ values: data.map(month => month.actual), className: "blue dashed" });
    element("chart").innerHTML = chart(lines, [[0, "JAN"], [3, "APR"], [6, "JUL"], [9, "OCT"], [11, "DEC"]],
      { min: 0, max: MONTHLY_BITES * 1.12, ticks: [...new Set([0, 0.25, 0.5, 0.75, 1].map(part => Math.round(part * MONTHLY_BITES)))] },
      `Simulated reports by month: ${data.map(month => month.reported).join(", ")}.${revealed ? ` Simulated actual cases: ${MONTHLY_BITES} in each month.` : ""}`);
    element("legend").innerHTML = legend(revealed ? [["orange", "Simulated reports"], ["blue dashed", "Simulated actual cases"]] : [["orange", "Simulated reports"]]);
    const first = data[0].reported, last = data.at(-1)!.reported;
    element("chart-reading").innerHTML = `<div><strong>${first} → ${last}</strong><span>simulated reports, January to December</span></div>${revealed ? `<div><strong>${MONTHLY_BITES} → ${MONTHLY_BITES}</strong><span>simulated actual cases, January to December</span></div>` : ""}`;
    const reveal = element("reveal");
    reveal.textContent = revealed ? "Hide simulated actual cases" : "Reveal simulated actual cases";
    reveal.setAttribute("aria-pressed", String(revealed));
    element("status").textContent = `${first} reports in January and ${last} in December.${revealed ? ` The model held actual cases steady at ${MONTHLY_BITES} per month.` : ""}`;
    play(animate ? 570 : 0, revealChart);
  };
  wireRange((value, animate) => { reporting = value; render(animate); });
  element("reveal").onclick = () => { revealed = !revealed; render(false); };
  element("new").onclick = () => { seed = nextSeed(seed); render(true); };
  element("reset").onclick = () => { reporting = DEFAULT_REPORTING; seed = DEFAULT_SEED; revealed = false; render(false); };
  wireShare();
  render(true);
}

function simpson() {
  let separated = query.get("split") === "1";
  const data = caseMixRates();
  const row = (period: { followed: number; total: number }, label: string) => `<div class="ward-period"><span class="eyebrow">${label}</span><strong>${percent(period.followed / period.total)}</strong><span>${period.followed} of ${period.total} followed up</span></div>`;
  root.innerHTML = `<div class="ward-content"><div class="ward-title eyebrow">Overall follow-up completion · illustrative</div>
    <div class="city-total">${row(data.aggregate[0], "2024")}<span aria-hidden="true" class="ward-arrow">→</span>${row(data.aggregate[1], "2025")}</div>
    <div class="ward-detail" id="ward-detail" hidden>
      <div class="ward-split">${data.groups.map(ward => `<div><div class="ward-title eyebrow">${ward.name}</div><div class="ward-numbers">${row(ward.periods[0], "2024")}${row(ward.periods[1], "2025")}</div></div>`).join("")}</div>
      <div class="composition"><div class="ward-title eyebrow">Observed case mix in the archive</div>${data.aggregate.map((period, index) => {
        const a = data.groups[0].periods[index].total / period.total;
        const b = 1 - a;
        return `<div class="mix-row"><span>${2024 + index}</span><div class="mix" aria-label="Road accidents ${percent(a)}; TVT ${percent(b)}"><b style="--share:${percent(a)}">${percent(a)}</b><b style="--share:${percent(b)}">${percent(b)}</b></div></div>`;
      }).join("")}${legend([["blue", "Road accidents"], ["orange", "TVT cases"]])}</div>
    </div></div>
    ${tools(button("wards", "Separate by case type", true, separated), false)}`;
  const draw = () => {
    const details = element("ward-detail");
    details.hidden = !separated;
    const control = element("wards");
    control.textContent = separated ? "Show overall only" : "Separate by case type";
    control.setAttribute("aria-pressed", String(separated));
    control.setAttribute("aria-controls", "ward-detail");
    shareable({ split: Number(separated) });
    const rates = (periods: { followed: number; total: number }[]) =>
      periods.map(({ followed, total }) => percent(followed / total)).join(" to ");
    element("status").textContent = separated
      ? data.groups.map(group => group.name + " improved from " + rates(group.periods) + ".").join(" ")
      : "Overall completion fell from " + rates(data.aggregate) + ".";
  };
  element("wards").onclick = () => { separated = !separated; draw(); };
  element("reset").onclick = () => { separated = false; draw(); };
  wireShare();
  draw();
}

function dogs() {
  let capacity = startingValue("capacity", DEFAULT_CAPACITY, 0, 1200);
  const baseline = population(0);
  root.innerHTML = `${range("Female sterilization capacity / month", 0, 1200, 1, capacity, "0 surgeries", "1,200 surgeries")}
    <div class="chart-content"><div class="figure-heading"><span class="eyebrow">Dogs in the city</span><span id="month-label" class="eyebrow">Month 0 / 72</span></div>
    <div id="chart"></div>${legend([["blue", "With selected capacity"], ["gray dashed", "No new surgeries"]])}
    <div class="demography"><div class="population-strip"><div class="age-bands" id="age-bands" role="img" aria-label="Population composition"></div><span>1 dot ≈ 250 dogs</span></div>
      ${legend([["blue", "Fertile adult females"], ["periwinkle", "Sterilized adult females"], ["gray", "Adult males"], ["orange", "Juveniles"]])}
      <div class="flows" id="flows"></div></div>
    <div class="chart-reading" id="chart-reading"></div></div>
    ${tools(button("replay", "Replay six years", true), false)}`;
  const draw = (animate: boolean) => {
    setRange(number(capacity) + " surgeries", capacity);
    shareable({ capacity });
    const data = population(capacity);
    const last = data.at(-1)!;
    const surgeries = data.slice(1, 13).reduce((sum, month) => sum + month.surgeries, 0);
    element("chart").innerHTML = chart([
      { values: baseline.map(month => month.total), className: "gray dashed" },
      { values: data.map(month => month.total), className: "blue" },
    ], [[0, "START"], [12, "YR 1"], [36, "YR 3"], [60, "YR 5"], [72, "YR 6"]],
      { min: 7000, max: 17000, ticks: [8000, 10000, 12000, 14000, 16000], label: n => n / 1000 + "k" },
      `Both scenarios begin at 10,000 dogs. At year one there are ${number(data[12].total)} dogs with the chosen capacity. At year six there are ${number(last.total)} with the chosen capacity and ${number(baseline.at(-1)!.total)} without new surgeries.`);
    element("chart-reading").innerHTML = `<div><strong>${number(surgeries)}</strong><span>surgeries in year one</span></div>
      <div><strong>${number(data[12].total)}</strong><span>dogs after one year · started at 10,000</span></div>
      <div><strong>${number(last.total)}</strong><span>dogs after six years</span></div>`;
    let previous = -1;
    play(animate ? 1850 : 0, progress => {
      revealChart(progress);
      const month = Math.floor(progress * MONTHS);
      if (month === previous) return;
      previous = month;
      element("month-label").textContent = "Month " + month + " / " + MONTHS;
      const { fertile, sterile, male, juvenile, births, deaths, arrivals, surgeries: done } = data[month];
      const bands = element("age-bands");
      const groups: [string, string, number][] = [["Fertile adult females", "blue", fertile], ["Sterilized adult females", "periwinkle", sterile], ["Adult males", "gray", male], ["Juveniles", "orange", juvenile]];
      let represented = 0;
      let assigned = 0;
      const visible = groups.flatMap(([, color, value]) => {
        represented += value;
        const cumulativeDots = Math.round(represented / 250);
        const dots = Array<string>(cumulativeDots - assigned).fill(color);
        assigned = cumulativeDots;
        return dots;
      });
      bands.innerHTML = Array.from({ length: 72 }, (_, i) => `<span class="${visible[i] || "unfilled"}"></span>`).join("");
      bands.setAttribute("aria-label", groups.map(([label, , value]) => label + ": " + number(value)).join("; "));
      element("flows").innerHTML = `<span>Births <b>+${number(births)}</b></span><span>Deaths <b>−${number(deaths)}</b></span><span>Arrivals <b>+${number(arrivals)}</b></span><span>Surgeries <b>${number(done)}</b></span>`;
    }, () => { element("status").textContent = `${number(surgeries)} surgeries in year one. Dog population after year one: ${number(data[12].total)}. After six years: ${number(last.total)}.`; });
  };
  wireRange((value, animate) => { capacity = value; draw(animate); });
  element("replay").onclick = () => draw(true);
  element("reset").onclick = () => { capacity = DEFAULT_CAPACITY; draw(false); };
  wireShare();
  draw(true);
}

function prevention() {
  let played = query.get("run") === "1";
  let result: ReturnType<typeof pairedEpidemics> | undefined;
  let distribution: ReturnType<typeof summarize> | undefined;
  root.innerHTML = `<div class="chart-content"><div class="figure-heading"><span class="eyebrow">Cumulative infections / week</span><span class="eyebrow">Two possible futures</span></div>
    <div class="future-labels"><span><i class="swatch orange"></i> No campaign <small>0 vaccinated</small></span><span><i class="swatch blue"></i> Campaign <small>${PREVENTIVE_DOSES} of ${COMMUNITY} vaccinated</small></span></div>
    <div id="chart"></div><div class="chart-reading" id="chart-reading"></div><p id="paired-range" class="paired-range" hidden></p></div>
    ${tools(button("run", "Run both futures", true) + button("replay", "Replay this seed"))}`;
  const draw = (animate: boolean) => {
    shareable({ run: Number(played), seed });
    updateSeed();
    const first = result?.[0][0].cumulative ?? 3;
    const points = result ? result.map(series => series.map(week => week.cumulative)) : [Array(WEEKS + 1).fill(first), Array(WEEKS + 1).fill(first)];
    const final = points.map(values => values.at(-1)!);
    element("chart").innerHTML = chart(played ? [
      { values: points[0], className: "orange" }, { values: points[1], className: "blue dashed" },
    ] : [], [[0, "START"], [4, "WK 4"], [8, "WK 8"], [12, "WK 12"], [18, "WK 18"]],
      { min: 0, max: COMMUNITY, ticks: [0, 100, 200, 300, 400] },
      played ? `After 18 weeks, ${final[0]} infections with no campaign and ${final[1]} with a campaign.` : "Two simulated futures awaiting an outbreak run.");
    element("run").textContent = played ? "Run a new pair" : "Run both futures";
    element<HTMLButtonElement>("replay").hidden = !played;
    const pairedRange = element("paired-range");
    pairedRange.hidden = true;
    if (!played) {
      cancelAnimationFrame(raf);
      element("chart-reading").innerHTML = '<p>Both futures begin with the same three imported infections.</p>';
      return;
    }
    element("chart-reading").innerHTML = '<div><strong id="difference">0</strong><span>fewer infections with vaccination in this run</span></div><div><strong id="pair">3 / 3</strong><span>no campaign / campaign</span></div>';
    play(animate ? 1420 : 0, progress => {
      revealChart(progress);
      const week = Math.floor(progress * WEEKS);
      const difference = points[0][week] - points[1][week];
      element("difference").textContent = number(Math.abs(difference));
      element("difference").nextElementSibling!.textContent = difference < 0 ? "more infections with vaccination in this run" : "fewer infections with vaccination in this run";
      element("pair").textContent = points[0][week] + " / " + points[1][week];
    }, () => {
      element("status").textContent = `Seed ${seed}: ${final[0]} infections with no campaign and ${final[1]} with a campaign after 18 weeks.`;
      if (distribution) {
        pairedRange.textContent = `Across ${TRIALS} paired runs, the middle 80% of modeled differences were ${distribution.lo} to ${distribution.hi} infections averted by week 18.`;
        pairedRange.hidden = false;
      }
    });
  };
  const run = () => {
    result = pairedEpidemics(seed);
    distribution = summarize(Array.from({ length: TRIALS }, (_, i) => {
      const [untreated, treated] = pairedEpidemics((seed + i) >>> 0);
      return untreated[WEEKS].cumulative - treated[WEEKS].cumulative;
    }));
    played = true;
    draw(true);
  };
  element("run").onclick = () => { if (played) seed = nextSeed(seed); run(); };
  element("replay").onclick = () => run();
  element("reset").onclick = () => { seed = DEFAULT_SEED; played = false; result = undefined; draw(false); };
  wireShare();
  if (played) run();
  else draw(false);
}

const experiment = { spatial, surveillance: bites, simpson, population: dogs, prevention };
const id = root.dataset.model as keyof typeof experiment;
experiment[id]();
