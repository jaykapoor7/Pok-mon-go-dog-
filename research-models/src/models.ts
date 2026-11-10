import { snapshot } from "./snapshot.ts";

export const DEFAULT_SEED = 173;
export const TRIALS = 64;
export const SIDE = 20;
export const DOGS = SIDE * SIDE;
export const VACCINATED = 280;
export const MONTHS = 72;
export const DEFAULT_REPORTING = 80;
const historicalMonthlyBites = snapshot.surveillance.biteCaseCounts.reduce((sum, n) => sum + n, 0) / snapshot.surveillance.months;
export const MONTHLY_BITES = Math.round(historicalMonthlyBites / ((0.15 + DEFAULT_REPORTING / 100) / 2));
export const DEFAULT_CAPACITY = snapshot.sterilization.medianFemaleSurgeries;
const concentrationRatio = (snapshot.spatial.vaccinationsInTopCells / snapshot.spatial.vaccinationsInEligibleCells)
  / (snapshot.spatial.topCells / snapshot.spatial.eligibleCells);
export const DEFAULT_CLUSTER = Math.round(100 * Math.min(1, Math.max(0, 0.75 * (concentrationRatio - 1))));
export const WEEKS = 18;

export function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

export function nextSeed(seed: number) {
  return (seed + 1) >>> 0;
}

// Indexed random draws keep the same opportunities aligned across scenarios.
export function random(seed: number, ...keys: number[]) {
  let hash = seed ^ 0x9e3779b9;
  for (const key of keys) {
    hash = Math.imul(hash ^ (key + 1), 0x85ebca6b);
    hash ^= hash >>> 13;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

const indices = Array.from({ length: DOGS }, (_, index) => index);
const neighbors = indices.map(index => {
  const x = index % SIDE;
  const y = Math.floor(index / SIDE);
  return [-1, 0, 1].flatMap(dy => [-1, 0, 1].flatMap(dx =>
    (dx || dy) && x + dx >= 0 && x + dx < SIDE && y + dy >= 0 && y + dy < SIDE
      ? [index + dx + SIDE * dy] : []));
});

export function vaccineLayout(cluster: number, seed: number) {
  const weight = clamp(cluster, 0, 1);
  return new Set(indices.map(index => ({
    index,
    rank: (1 - weight) * random(seed, 1, index) + weight * ((index % SIDE + (Math.floor(index / SIDE) % 4) / 8) / SIDE),
  })).sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, VACCINATED).map(item => item.index));
}

export function spatialRun(vaccinated: Set<number>, seed: number) {
  // The imported infection seeds one susceptible cell, wherever it appears in a shared order.
  const start = indices.reduce((best, i) => vaccinated.has(i) ? best
    : best < 0 || random(seed, 2, i) < random(seed, 2, best) ? i : best, -1);
  const hit = Array<number>(DOGS).fill(-1);
  let frontier = start < 0 ? [] : [start];
  if (start >= 0) hit[start] = 0;
  let generation = 0;
  let count = frontier.length;
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const from of frontier) {
      for (const to of neighbors[from]) {
        if (vaccinated.has(to) || hit[to] >= 0 || random(seed, 3, from, to) >= 0.42) continue;
        hit[to] = generation + 1;
        next.push(to);
      }
    }
    count += next.length;
    frontier = next;
    if (next.length) generation += 1;
  }
  return { hit, count, generation, start };
}

export function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (quantile: number) => sorted[Math.floor(quantile * (sorted.length - 1))];
  return { mean: sorted.reduce((sum, n) => sum + n, 0) / sorted.length, lo: at(0.1), hi: at(0.9) };
}

export function spatialComparison(cluster: number, seed: number) {
  const layoutSeed = 2026;
  return [0, cluster].map(value => {
    const vaccinated = vaccineLayout(value, layoutSeed);
    const runs = Array.from({ length: TRIALS }, (_, i) => spatialRun(vaccinated, (seed + i) >>> 0));
    return { vaccinated, sample: runs[0], distribution: summarize(runs.map(run => run.count)) };
  });
}

export function surveillance(maxReporting: number, seed: number) {
  return Array.from({ length: 12 }, (_, month) => {
    const probability = 0.15 + (clamp(maxReporting, 0.15, 1) - 0.15) * month / 11;
    let reported = 0;
    for (let i = 0; i < MONTHLY_BITES; i++) {
      if (random(seed, 10, month, i) < probability) reported++;
    }
    return { probability, reported, actual: MONTHLY_BITES, expected: MONTHLY_BITES * probability };
  });
}

export const caseGroups = [
  { name: "Road accidents", periods: snapshot.composition.roadAccident.map((total, index) => ({ followed: Math.round(total * [0.90, 0.92][index]), total })) },
  { name: "TVT cases", periods: snapshot.composition.tvt.map((total, index) => ({ followed: Math.round(total * [0.40, 0.42][index]), total })) },
];

export function caseMixRates() {
  const aggregate = [0, 1].map(period => caseGroups.reduce((sum, group) => ({
    followed: sum.followed + group.periods[period].followed,
    total: sum.total + group.periods[period].total,
  }), { followed: 0, total: 0 }));
  return { groups: caseGroups, aggregate };
}

export function population(capacity: number) {
  let fertile = 3600;
  let sterile = 400;
  let male = 4000;
  let juvenile = 2000;
  const total = () => fertile + sterile + male + juvenile;
  const state = (births = 0, deaths = 0, arrivals = 0, surgeries = 0, matured = 0) =>
    ({ total: total(), fertile, sterile, male, juvenile, births, deaths, arrivals, surgeries, matured });
  const history = [state()];
  for (let month = 1; month <= MONTHS; month++) {
    const density = clamp(1 - total() / 18000, 0, 1);
    const surgeries = Math.min(fertile, clamp(capacity, 0, 1200));
    fertile -= surgeries;
    sterile += surgeries;
    const births = 0.16 * fertile * density;
    const deaths = 0.012 * (fertile + sterile + male) + 0.075 * juvenile;
    fertile *= 0.988;
    sterile *= 0.988;
    male *= 0.988;
    juvenile *= 0.925;
    const matured = juvenile / 6;
    juvenile += births - matured;
    const arrivals = 105;
    fertile += (matured + arrivals) / 2;
    male += (matured + arrivals) / 2;
    history.push(state(births, deaths, arrivals, surgeries, matured));
  }
  return history;
}

export const COMMUNITY = snapshot.prevention.censusRegisterSize;
const INTRODUCTIONS = 3;
export const PREVENTIVE_DOSES = Math.floor(COMMUNITY / 2);

export function epidemic(vaccinated: number, seed: number) {
  // The same three imported infections are present in both worlds.
  const doses = Math.round(clamp(vaccinated, 0, COMMUNITY - INTRODUCTIONS));
  const state = Array<number>(COMMUNITY).fill(0);
  for (let i = 0; i < INTRODUCTIONS; i++) state[i] = 2;
  const candidates = Array.from({ length: COMMUNITY - INTRODUCTIONS }, (_, i) => i + INTRODUCTIONS);
  if (doses) {
    candidates.sort((a, b) => random(seed, 20, a) - random(seed, 20, b) || a - b);
    for (const person of candidates.slice(0, doses)) state[person] = 1;
  }
  let active = INTRODUCTIONS;
  let cumulative = active;
  const path = [{ active, cumulative, susceptible: COMMUNITY - doses - active }];
  for (let week = 1; week <= WEEKS; week++) {
    const probability = 1 - Math.exp(-1.85 * active / COMMUNITY);
    let next = 0;
    for (let person = 0; person < COMMUNITY; person++) {
      if (state[person] === 2) state[person] = 1;
      else if (state[person] === 0 && random(seed, 21, week, person) < probability) {
        state[person] = 2;
        next++;
      }
    }
    active = next;
    cumulative += active;
    path.push({ active, cumulative, susceptible: COMMUNITY - doses - cumulative });
  }
  return path;
}

export function pairedEpidemics(seed: number) {
  return [epidemic(0, seed), epidemic(PREVENTIVE_DOSES, seed)] as const;
}
