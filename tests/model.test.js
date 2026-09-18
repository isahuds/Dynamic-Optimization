"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../assets/model.js");

function eligible(overrides = {}) {
  return Object.assign(Object.fromEntries(S.GATE_KEYS.map((key) => [key, true])), overrides);
}

/* REGRESSION GUARD, replacing the W0 + B*ts decomposition guard that went with the
 * batch calculator. The v1 release computed on W_ms_v1_published (32.223 ms for
 * FRAM_B1), the contaminated work-cycle value RADECS-26 audited and replaced on
 * 2026-09-05. Beam-off LET0 controls confirm the corrected values to within 1.5%.
 * Pinning them here makes that class of drift fail loudly. */
test("per-build work-cycle times match the corrected release, not the superseded one", () => {
  const expected = {
    FRAM_B1: 0.019945, SRAM_B1: 0.019770, FRAM_B1_Throttled: 0.045196,
    FRAM_B50: 0.215846, SRAM_Mixed_B200: 0.788551, FRAM_B200: 0.814114
  };
  const superseded = { FRAM_B1: 0.032223, SRAM_B1: 0.028539, FRAM_B1_Throttled: 0.071895 };
  S.CONFIGS.forEach((c) => {
    assert.ok(Math.abs(c.W_s - expected[c.id]) < 1e-6, `${c.id}: W is ${c.W_s}, expected ${expected[c.id]}`);
    if (superseded[c.id]) {
      assert.ok(Math.abs(c.W_s - superseded[c.id]) > 1e-3, `${c.id}: W reverted to the superseded value`);
    }
  });
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

test("campaign summary data", () => {
  assert.equal(S.CAMPAIGN.recoveryAttempts, 4623);
  assert.equal(S.CAMPAIGN.recoveryGroups, 927);
  assert.ok(Math.abs(S.CAMPAIGN.autoSuccessRate - 0.953) < 0.001);
  assert.ok(Math.abs(S.CAMPAIGN.autoSuccessRateCensoredAsFailure - 0.714) < 0.001);
  assert.ok(Math.abs(S.CAMPAIGN.pileupR2 - 0.941) < 0.001);
  /* the median is the programmed settle; a duty factor needs the mean */
  assert.ok(S.CAMPAIGN.meanRecovery_s > S.CAMPAIGN.medianRecovery_s * 3);
});

test("event-count hierarchy is strictly ordered for every build", () => {
  const h = S.CAMPAIGN.eventCountHierarchy;
  assert.equal(h.deviceResets.length, 6);
  for (let i = 0; i < 6; i += 1) {
    assert.ok(
      h.deviceResets[i] >= h.hostEpisodes[i] && h.hostEpisodes[i] > h.destroyedCycles[i],
      `build ${i}: resets >= episodes > destroyed cycles must hold`
    );
  }
});

test("measured theta sits inside its own Clopper-Pearson interval, and D reproduces the release", () => {
  S.CONFIGS.forEach((c) => {
    assert.ok(c.thetaLo < c.theta && c.theta < c.thetaHi, `${c.id}: theta outside its interval`);
    assert.ok(c.episodesPerLostCycle >= 1, `${c.id}: cannot have fewer than one episode per lost cycle`);
    const d = S.dutyFactor(c.theta, c.W_s, c.tau_s);
    assert.ok(Math.abs(d - c.dutyFactor) < 5e-4, `${c.id}: D ${d.toFixed(4)} vs released ${c.dutyFactor}`);
  });
});

test("duty factor reduces to theta when recovery is free, and inverts cleanly", () => {
  const c = S.CONFIGS[0];
  assert.ok(Math.abs(S.dutyFactor(c.theta, c.W_s, 0) - c.theta) < 1e-12);
  const d = S.dutyFactor(c.theta, c.W_s, c.tau_s);
  assert.ok(Math.abs(S.thetaForDuty(d, c.W_s, c.tau_s) - c.theta) < 1e-12);
  /* charging a real recovery cost can only lower the share of useful test time */
  assert.ok(d < c.theta);
});

test("the pileup ceiling moves inversely with how long the device stays down", () => {
  assert.ok(Math.abs(S.pileupPeakFlux() - S.PILEUP.peakFlux) < 1e-6);
  assert.ok(Math.abs(S.pileupPeakFlux(S.PILEUP.tau / 2) - 2 * S.PILEUP.peakFlux) < 1e-6);
  /* this campaign ran near 5e4, above the peak it located */
  assert.ok(S.PILEUP.peakFlux < 5e4);
});

test("correcting a logged theta always loses more cycles, and stays in range", () => {
  [0.999, 0.99, 0.95, 0.8, 0.6, 0.51].forEach((t) => {
    const c = S.correctLoggedTheta(t);
    assert.ok(c.theta < t, `corrected theta must be lower than the logged ${t}`);
    assert.ok(c.theta >= 0 && c.theta < 1);
    assert.ok(c.thetaLow <= c.theta && c.theta <= c.thetaHigh, "interval must bracket the point estimate");
  });
  assert.ok(S.OPTIMISM.factor > 1);
  assert.ok(S.OPTIMISM.ci95[0] > 1, "the whole interval sits above unity");
});

test("the fitted pooled rate exceeds the logged one, as the optimism factor implies", () => {
  S.POOLED.forEach((p) => {
    assert.ok(p.lambdaFitted > p.lambdaLogged, `${p.id}: fitted rate must exceed the logged one`);
    assert.ok(p.lambdaFittedCI[0] < p.lambdaFitted && p.lambdaFitted < p.lambdaFittedCI[1]);
    assert.ok(p.pValue > 0.05, `${p.id}: the shared-rate fit is not rejected`);
  });
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
  /* 19.945 ms is FRAM_B1's measured work cycle. At that length an 80% clean-cycle
   * target demands a rate far above anything reachable, so the pileup ceiling is
   * what binds, not the quality target. */
  const solved = S.fluxFromLambdaViaPileup(S.requiredLambda(0.8, 0.019945));
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
