"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../assets/model.js");

function eligible(overrides = {}) {
  return Object.assign(Object.fromEntries(S.GATE_KEYS.map((key) => [key, true])), overrides);
}

test("calibrated timing constants", () => {
  assert.equal(S.W0, 0.025145);
  assert.equal(S.TS, 0.007077);
  assert.ok(Math.abs(S.workCycle(1) - 0.032222) < 1e-6);
  assert.ok(Math.abs(S.workCycle(50) - 0.379) < 0.001);
  assert.ok(Math.abs(S.workCycle(200) - 1.440545) < 1e-6);
});

test("B* formula reproduces the calibrated optimum", () => {
  const lambda = S.POOLED[1].lambda;
  assert.equal(lambda, 0.415918);
  const bstar = S.bstarFormula(lambda);
  assert.ok(Math.abs(bstar - 45.580) < 0.01, "B* should be approximately 45.58");
  const wstar = S.wstarFormula(lambda);
  assert.ok(Math.abs(wstar - 0.347728) < 0.001, "W* should be approximately 347.7 ms");
});

test("exact integer optimum is near the formula B*", () => {
  const lambda = S.POOLED[1].lambda;
  const result = S.optimalBatchExact(lambda);
  assert.ok(result.batch >= 44 && result.batch <= 47, "exact integer B* should be near 46");
  assert.ok(Math.abs(result.bstarContinuous - 45.580) < 0.01);
});

test("throughput is positive and has a maximum", () => {
  const lambda = S.POOLED[1].lambda;
  const t1 = S.throughput(1, lambda);
  const t46 = S.throughput(46, lambda);
  const t200 = S.throughput(200, lambda);
  assert.ok(t1 > 0);
  assert.ok(t46 > t1, "throughput at B*=46 should exceed B=1");
  assert.ok(t46 > t200, "throughput at B*=46 should exceed B=200");
});

test("cost per result decreases then increases around B*", () => {
  const lambda = S.POOLED[1].lambda;
  const c1 = S.costPerResult(1, lambda, 0.165);
  const c46 = S.costPerResult(46, lambda, 0.165);
  const c200 = S.costPerResult(200, lambda, 0.165);
  assert.ok(c46 < c1, "cost at B*=46 should be less than B=1");
  assert.ok(c46 < c200, "cost at B*=46 should be less than B=200");
});

test("per-configuration trigger rates", () => {
  assert.equal(S.CONFIGS.length, 6);
  assert.equal(S.POOLED.length, 2);
  S.CONFIGS.forEach((cfg) => {
    assert.ok(Math.abs(cfg.lambda - cfg.n / cfg.burst_s) < 0.001,
      cfg.id + " lambda should equal n/burst_s");
  });
  S.POOLED.forEach((cfg) => {
    assert.ok(Math.abs(cfg.lambda - cfg.n / cfg.burst_s) < 0.001,
      cfg.id + " lambda should equal n/burst_s");
  });
});

test("pileup model", () => {
  assert.ok(Math.abs(S.PILEUP.peakFlux - 1 / (S.PILEUP.k * S.PILEUP.tau)) < 100);
  const ratePeak = S.pileupRate(S.PILEUP.peakFlux);
  assert.ok(ratePeak > 0);
  const rateBelow = S.pileupRate(1000);
  const rateAbove = S.pileupRate(100000);
  assert.ok(ratePeak > rateBelow, "peak rate should exceed low-flux rate");
  assert.ok(ratePeak > rateAbove, "peak rate should exceed high-flux rate");
  assert.equal(S.pileupRate(0), 0);
});

test("B* at flux via pileup model", () => {
  const bstarLow = S.bstarAtFlux(1000);
  const bstarPeak = S.bstarAtFlux(S.PILEUP.peakFlux);
  const bstarHigh = S.bstarAtFlux(100000);
  assert.ok(bstarPeak < bstarLow, "B* at peak flux should be smaller (higher lambda)");
  assert.ok(Number.isFinite(bstarPeak));
  assert.ok(Number.isFinite(bstarLow));
});

test("validation data matches paper", () => {
  assert.equal(S.VALIDATION.length, 3);
  assert.ok(Math.abs(S.VALIDATION[0].error - (-0.195)) < 0.001);
  assert.ok(Math.abs(S.VALIDATION[1].error - 0.072) < 0.001);
  assert.ok(Math.abs(S.VALIDATION[2].error - 0.151) < 0.001);
});

test("campaign summary data", () => {
  assert.equal(S.CAMPAIGN.episodes, 107);
  assert.equal(S.CAMPAIGN.admittedVectors, 1303);
  assert.equal(S.CAMPAIGN.recoveryAttempts, 4623);
  assert.ok(Math.abs(S.CAMPAIGN.autoSuccessRate - 0.961) < 0.001);
});

test("eligible positive count uses exact two-sided 95 percent Garwood", () => {
  const result = S.poissonRate95(3, 1e7, eligible());
  assert.equal(result.pointEstimate, 3e-7);
  assert.ok(Math.abs(result.ci95Lower - 6.186721228956013e-8) < 1e-20);
  assert.ok(Math.abs(result.ci95Upper - 8.767273069742324e-7) < 1e-20);
  assert.equal(result.zeroEventUpperLimit, null);
  assert.equal(result.intervalConvention, "two_sided_exact_95_percent_garwood");
});

test("eligible zero reports only the conventional one-sided upper limit", () => {
  const result = S.poissonRate95(0, 2e6, eligible());
  assert.equal(result.pointEstimate, null);
  assert.equal(result.ci95Lower, null);
  assert.equal(result.ci95Upper, null);
  assert.equal(result.zeroEventUpperLimit, 2.995732273553991 / 2e6);
  assert.equal(result.intervalConvention, "one_sided_95_percent_zero_event_upper_limit");
});

test("ineligible and no-opportunity rows are fully blank", () => {
  for (const gates of [eligible({ independenceEstablished: false }), eligible({ opportunityObserved: false })]) {
    const result = S.poissonRate95(0, null, gates);
    assert.equal(result.pointEstimate, null);
    assert.equal(result.zeroEventUpperLimit, null);
    assert.equal(result.intervalConvention, "not_applied");
  }
});

test("all seven gates are real booleans", () => {
  assert.equal(S.GATE_KEYS.length, 7);
  assert.throws(() => S.poissonRate95(1, 1, eligible({ poissonEligible: "false" })), /must be boolean/);
  assert.throws(() => S.poissonRate95(1.5, 1, eligible()), /nonnegative integer/);
});

test("legacy scenario APIs are absent", () => {
  assert.equal(S.HAZARDS, undefined);
  assert.equal(S.RECOVERIES, undefined);
  assert.equal(S.BRANCHES, undefined);
  assert.equal(S.scenarioRows, undefined);
  assert.equal(S.optimize, undefined);
  assert.equal(S.boundaryCoefficient, undefined);
});

test("required lambda from clean-cycle-fraction target", () => {
  assert.ok(Math.abs(S.requiredLambda(0.8, 1) - 0.2231435513142097) < 1e-9);
  assert.throws(() => S.requiredLambda(1, 1), /between 0 and 1/);
  assert.throws(() => S.requiredLambda(0, 1), /between 0 and 1/);
});

test("clean fraction is the inverse of required lambda", () => {
  const lambda = S.requiredLambda(0.8, 1);
  assert.ok(Math.abs(S.cleanFraction(lambda, 1) - 0.8) < 1e-9);
});

test("wall-clock time is fluence over flux", () => {
  assert.equal(S.wallClockTime(2e4, 1e7), 500);
});

test("flux-from-lambda inversion is monotonic on the rising branch", () => {
  const thetas = [0.5, 0.7, 0.8, 0.9, 0.95];
  const fluxes = thetas.map((t) => S.fluxFromLambdaViaPileup(S.requiredLambda(t, 1)).flux);
  for (let i = 1; i < fluxes.length; i += 1) {
    assert.ok(fluxes[i] < fluxes[i - 1],
      "flux should strictly decrease as theta (stricter quality target) increases");
  }
  fluxes.forEach((flux) => assert.ok(flux <= S.PILEUP.peakFlux, "solved flux must stay on the rising branch"));
});

test("quality target that never binds is capped at the pileup peak, not reported unachievable", () => {
  const solved = S.fluxFromLambdaViaPileup(S.requiredLambda(0.8, S.workCycle(1)));
  assert.equal(solved.qualityBinding, false);
  assert.equal(solved.flux, S.PILEUP.peakFlux);
});

test("fluxPlan reports facilities achieving the recommended flux", () => {
  const plan = S.fluxPlan(0.8, 1, 1e7);
  assert.ok(plan.flux > 0);
  assert.ok(plan.wallClock_s > 0);
  assert.ok(Array.isArray(plan.facilities) && plan.facilities.length > 0);
  assert.equal(S.FACILITIES.length, 3);
});

test("sci() does not eat a genuine trailing zero from a fixed-point integer", () => {
  assert.equal(S.sci(2330), "2330");
  assert.equal(S.sci(1035), "1035");
  assert.equal(S.sci(100000), "1×10⁵");
  assert.ok(Math.abs(S.sci(45.581579183599956).length) > 0 && S.sci(45.581579183599956) === "45.58");
});
