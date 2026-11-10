import assert from "node:assert/strict";
import { test } from "node:test";
import { snapshot } from "../src/snapshot.ts";
import {
  COMMUNITY, DEFAULT_CAPACITY, DEFAULT_CLUSTER, DEFAULT_REPORTING, DEFAULT_SEED, DOGS, MONTHLY_BITES, MONTHS,
  PREVENTIVE_DOSES, TRIALS, VACCINATED, WEEKS, caseMixRates, epidemic, nextSeed, pairedEpidemics, population,
  spatialComparison, spatialRun, summarize, surveillance, vaccineLayout,
} from "../src/models.ts";

test("all five model inputs follow the observed aggregate and declared transformations", () => {
  assert.equal(DEFAULT_CLUSTER, 79);
  assert.equal(DEFAULT_CAPACITY, snapshot.sterilization.medianFemaleSurgeries);
  assert.equal(MONTHLY_BITES, 8);
  assert.equal(COMMUNITY, snapshot.prevention.censusRegisterSize);
  assert.equal(PREVENTIVE_DOSES * 2, COMMUNITY);
  assert.equal(caseMixRates().aggregate[0].total, 383);
});

test("vaccination is always exactly 70% across grouping and seeds", () => {
  for (const seed of [0, 173, 4294967295]) {
    for (const grouping of [-1, 0, .25, .75, 1, 2]) {
      const layout = vaccineLayout(grouping, seed);
      assert.equal(layout.size, VACCINATED);
      assert.equal(layout.size / DOGS, .7);
      assert.ok([...layout].every(index => index >= 0 && index < DOGS));
    }
  }
});

test("spatial outcomes replay, never include vaccinated dogs, and stop with no susceptible seed", () => {
  const layout = vaccineLayout(.8, 2026);
  const run = spatialRun(layout, 77);
  assert.deepEqual(spatialRun(layout, 77), run);
  assert.equal(run.hit.filter(g => g >= 0).length, run.count);
  assert.ok(run.count >= 1 && run.count <= DOGS - VACCINATED);
  for (const dog of layout) assert.equal(run.hit[dog], -1);
  assert.equal(spatialRun(new Set(Array.from({ length: DOGS }, (_, i) => i)), 77).count, 0);
});

test("the spatial summaries are calculated from 64 runs and equal at zero clustering", () => {
  const [first, second] = spatialComparison(0, DEFAULT_SEED);
  assert.deepEqual(first, second);
  const trialCounts = Array.from({ length: TRIALS }, (_, i) => spatialRun(first.vaccinated, DEFAULT_SEED + i).count);
  assert.deepEqual(first.distribution, summarize(trialCounts));
  const [dispersed, grouped] = spatialComparison(DEFAULT_CLUSTER / 100, DEFAULT_SEED);
  assert.ok(grouped.distribution.mean > dispersed.distribution.mean);
  assert.ok(grouped.distribution.lo < grouped.distribution.hi);
});

test("reporting varies independently of true counts and reuses the same case draws", () => {
  const low = surveillance(.15, DEFAULT_SEED);
  const high = surveillance(1, DEFAULT_SEED);
  assert.deepEqual(low, surveillance(.15, DEFAULT_SEED));
  assert.deepEqual(low, surveillance(-1, DEFAULT_SEED));
  assert.deepEqual(high, surveillance(2, DEFAULT_SEED));
  for (const [i, month] of high.entries()) {
    assert.equal(month.actual, MONTHLY_BITES);
    assert.ok(month.reported >= low[i].reported && month.reported <= month.actual);
    assert.equal(month.expected, month.actual * month.probability);
  }
  assert.equal(high.at(-1).reported, MONTHLY_BITES);
  assert.notDeepEqual(high, surveillance(1, nextSeed(DEFAULT_SEED)));
});

test("both types improve and their weighted aggregate declines", () => {
  const { groups, aggregate } = caseMixRates();
  const rate = item => item.followed / item.total;
  for (const [i, group] of groups.entries()) {
    assert.deepEqual(group.periods.map(item => item.total), [snapshot.composition.roadAccident, snapshot.composition.tvt][i]);
    assert.ok(rate(group.periods[1]) > rate(group.periods[0]));
  }
  assert.ok(rate(aggregate[1]) < rate(aggregate[0]));
  assert.deepEqual(aggregate, [{ followed: 292, total: 383 }, { followed: 157, total: 216 }]);
});

test("population compartments conserve dogs and honor capacity boundaries", () => {
  for (const capacity of [0, 278, 1200]) {
    const history = population(capacity);
    assert.equal(history.length, MONTHS + 1);
    assert.equal(history[0].total, 10000);
    for (const [i, current] of history.entries()) {
      assert.ok(Object.values(current).every(value => value >= 0));
      if (i === 0) continue;
      const previous = history[i - 1];
      assert.ok(current.surgeries <= Math.min(capacity, previous.fertile));
      assert.ok(Math.abs(current.total - (previous.total + current.births + current.arrivals - current.deaths)) < 1e-8);
    }
  }
  assert.deepEqual(population(-1), population(0));
  assert.deepEqual(population(1201), population(1200));
  const history = population(DEFAULT_CAPACITY);
  assert.equal(history.slice(1, 13).reduce((sum, month) => sum + month.surgeries, 0), 3336);
  assert.ok(history[12].total > history[0].total);
  assert.ok(history[12].total < population(0)[12].total);
});

test("the paired outbreak shares introductions and obeys epidemic bounds", () => {
  for (const seed of [0, 173, 174, 4294967295]) {
    const pair = pairedEpidemics(seed);
    assert.deepEqual(pair, pairedEpidemics(seed));
    pair.forEach((series, index) => {
      assert.equal(series.length, WEEKS + 1);
      assert.equal(series[0].active, 3);
      assert.equal(series[0].cumulative, 3);
      const doses = index === 0 ? 0 : PREVENTIVE_DOSES;
      for (const [i, week] of series.entries()) {
        assert.ok(week.active >= 0 && week.susceptible >= 0);
        assert.equal(week.susceptible + week.cumulative + doses, COMMUNITY);
        if (i > 0) assert.equal(week.cumulative, series[i - 1].cumulative + week.active);
      }
    });
  }
  assert.notDeepEqual(pairedEpidemics(173), pairedEpidemics(174));
  assert.deepEqual(epidemic(-1, 173), epidemic(0, 173));
  assert.equal(epidemic(COMMUNITY, 173).at(-1).cumulative, 3);
  assert.equal(nextSeed(4294967295), 0);
});
