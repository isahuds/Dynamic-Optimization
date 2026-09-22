"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../assets/model.js");

const close = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);

test("release identifies the manuscript package it was built against", () => {
  assert.equal(S.RELEASE.schemaVersion, "flux-selection-design-tool-v5-2026-09-22");
  assert.equal(S.RELEASE.manuscript, "TNS_REMEDIATION_2026-09-22-v81");
  assert.equal(S.RELEASE.supersedes, "flux-selection-design-tool-v4-2026-09-22");
});

test("sigma_cyc pins the released direct fit", () => {
  assert.ok(close(S.SIGMA_CYC.value, 1.5644e-5, 1e-4));
  assert.ok(close(S.SIGMA_CYC.ci95[0], 1.4411e-5, 1e-4));
  assert.ok(close(S.SIGMA_CYC.ci95[1], 1.6947e-5, 1e-4));
  assert.ok(close(S.SIGMA_CYC.threeBuild, 1.4873e-5, 1e-4));
  // the paper prints 0.78 and 0.74 s^-1 at the nominal matched flux
  assert.equal((S.SIGMA_CYC.value * 5e4).toFixed(2), "0.78");
  assert.equal((S.SIGMA_CYC.threeBuild * 5e4).toFixed(2), "0.74");
});

test("six comparison builds sum to the paper's 588 of 20,459 cycles", () => {
  assert.equal(S.CONFIGS.length, 6);
  const lost = S.CONFIGS.reduce((a, c) => a + c.lost, 0);
  const attempted = S.CONFIGS.reduce((a, c) => a + c.attempted, 0);
  assert.equal(lost, 588);
  assert.equal(attempted, 20459);
  assert.equal(lost, S.CAMPAIGN.lostTotal);
  assert.equal(attempted, S.CAMPAIGN.attemptedTotal);
});

test("measured theta is the direct count and spans 0.51 to 0.98 over a 41-fold W range", () => {
  for (const c of S.CONFIGS) {
    assert.ok(close(c.theta, (c.attempted - c.lost) / c.attempted, 1e-5), c.id);
    assert.ok(c.thetaLo < c.theta && c.theta < c.thetaHi, c.id);
  }
  const W = S.CONFIGS.map((c) => c.W_s);
  assert.ok(Math.max(...W) / Math.min(...W) > 40);
  const th = S.CONFIGS.map((c) => c.theta);
  assert.equal(Math.min(...th).toFixed(2), "0.51");
  assert.equal(Math.max(...th).toFixed(2), "0.98");
});

test("each build's duty factor reproduces from its own theta, W and tau", () => {
  for (const c of S.CONFIGS) {
    assert.ok(close(S.dutyFactor(c.theta, c.W_s, c.tau_s), c.D, 2e-3), c.id);
  }
});

test("clean fraction, frontier product, flux-for-W and longest-W are one relation", () => {
  const sigma = S.SIGMA_CYC.value;
  const theta = 0.8, W = 0.02;
  const phi = S.fluxForW(theta, sigma, W);
  assert.ok(close(S.cleanFraction(sigma, phi, W), theta, 1e-12));
  assert.ok(close(S.longestW(theta, sigma, phi), W, 1e-12));
  assert.ok(close(S.frontierProduct(theta, sigma), phi * W, 1e-12));
});

test("design rule: longest work cycle is 135 ms at theta 0.90 and 5e4", () => {
  const W = S.longestW(0.90, S.SIGMA_CYC.value, 5e4);
  assert.ok(close(W, 0.13469, 1e-3));
  assert.ok(close(W, S.CAMPAIGN.longestW_s_at_design, 1e-3));
});

test("tenfold flux is paid for by a tenfold shorter work cycle", () => {
  const sigma = S.SIGMA_CYC.value;
  assert.ok(close(S.longestW(0.8, sigma, 5e5), S.longestW(0.8, sigma, 5e4) / 10, 1e-12));
});

test("duty factor reduces to theta at tau = 0 and inverts exactly", () => {
  assert.equal(S.dutyFactor(0.8, 0.02, 0), 0.8);
  assert.equal(S.dutyFactor(0.8, 0.02), 0.8);
  const D = S.dutyFactor(0.87, 0.2158, 0.5865);
  assert.ok(close(S.thetaForDuty(D, 0.2158, 0.5865), 0.87, 1e-12));
});

test("recovery charge for FRAM_B1 is close to one: as long recovering as computing", () => {
  const c = S.CONFIGS.find((x) => x.id === "FRAM_B1");
  const charge = S.recoveryCharge(c.theta, c.W_s, c.tau_s);
  assert.ok(charge > 0.9 && charge < 1.0, String(charge));
});

test("pooled sigma_FI matches the paper's five-build functional-interrupt rate", () => {
  assert.ok(close(S.SIGMA_FI.pooled, 9.4e-6, 1e-3));
  assert.equal(S.SIGMA_FI.spreadFold, 1.4);
  assert.equal(S.SIGMA_FI.comparableBuilds, 5);
});

test("charged for recovery alone, 34% to 72% of in-cycle plus recovery time is uncounted", () => {
  assert.deepEqual([...S.CAMPAIGN.uncountedCycleAndRecoveryShare], [0.34, 0.72]);
  // the same range is 1 - D over the six builds' own theta, W and tau
  const oneMinusD = S.CONFIGS.map((c) => 1 - S.dutyFactor(c.theta, c.W_s, c.tau_s));
  assert.equal(Math.min(...oneMinusD).toFixed(2), "0.34");
  assert.equal(Math.max(...oneMinusD).toFixed(2), "0.72");
});

test("measured over beam-on time, the countable share is 12 to 42% (58 to 88% uncounted)", () => {
  assert.deepEqual([...S.TIME_BUDGET.measuredCountableShare], [0.12, 0.42]);
  assert.deepEqual([...S.CAMPAIGN.uncountedBeamOnShare], [0.58, 0.88]);
  assert.ok(close(1 - S.TIME_BUDGET.measuredCountableShare[1], S.CAMPAIGN.uncountedBeamOnShare[0], 1e-9));
  assert.ok(close(1 - S.TIME_BUDGET.measuredCountableShare[0], S.CAMPAIGN.uncountedBeamOnShare[1], 1e-9));
  // D charges recovery alone, so every published D is at least the top of the measured range
  for (const c of S.CONFIGS.filter((x) => ["FRAM_B1", "FRAM_B50", "FRAM_B200", "SRAM_Mixed_B200"].includes(x.id))) {
    assert.ok(c.D >= S.TIME_BUDGET.measuredCountableShare[0], c.id);
  }
});

test("beam-on time budget matches v81 Sec. III-B", () => {
  const T = S.TIME_BUDGET;
  assert.deepEqual([...T.inCycle], [0.24, 0.43]);
  assert.deepEqual([...T.recovery], [0.14, 0.36]);
  assert.equal(T.detectionWaitMax, 0.29);
  assert.deepEqual([...T.rerunAtB1], [0.01, 0.02]);
  assert.equal(T.rerunAtB200, 0.40);
  assert.deepEqual([...T.waitPerLostCycle_s], [0.7, 1.1]);
  assert.deepEqual([...T.dWithWaitGap], [0.02, 0.05]);
});

test("adding the detection wait to tau reproduces the paper's 0.39 for FRAM_B1", () => {
  const c = S.CONFIGS.find((x) => x.id === "FRAM_B1");
  const T = S.TIME_BUDGET;
  // the low end of the printed 0.7 to 1.1 s wait reproduces the printed D with the wait
  assert.equal(S.dutyFactor(c.theta, c.W_s, c.tau_s + T.waitPerLostCycle_s[0]).toFixed(2),
    T.exampleFRAM_B1.dWithWait.toFixed(2));
  // and the gap to the directly measured 0.37 sits inside the printed 0.02 to 0.05
  const gap = T.exampleFRAM_B1.dWithWait - T.exampleFRAM_B1.measured;
  assert.ok(gap >= T.dWithWaitGap[0] - 1e-9 && gap <= T.dWithWaitGap[1] + 1e-9, String(gap));
});

test("corruption-event rate is on clean-cycle exposure: 9.5-fold, 1.1e-6 to 1.0e-5", () => {
  const C = S.CORRUPTION;
  assert.equal(C.spreadFold, 9.5);
  assert.equal(S.CAMPAIGN.corruptionSpreadFold, 9.5);
  assert.deepEqual([...C.range], [1.1e-6, 1.0e-5]);
  // the printed endpoints round to a spread consistent with the printed fold
  assert.ok(Math.abs(C.range[1] / C.range[0] - C.spreadFold) < 0.6);
  assert.equal(C.events, 95);
  assert.equal(C.highest, "SRAM_Mixed_B200");
  assert.deepEqual([...C.levelPair], ["SRAM_B1", "FRAM_B1_Throttled"]);
  assert.deepEqual([...C.fiOverCorruptionFold], [3, 8]);
  assert.deepEqual({ ...C.batchTest }, { chi2: 0.6, dof: 2, p: 0.73 });
  assert.deepEqual({ ...C.clockTest }, { chi2: 18.7, dof: 3, pBelow: 0.001 });
  // the functional-interrupt spread is untouched by the basis change
  assert.equal(S.CAMPAIGN.interruptSpreadFold, 1.4);
});

test("hiddenShare is the independent-strike expectation over a detection window", () => {
  // pinned to the task's worked example: sigma_FI 9.4e-6, phi 5e4, t_det 0.25 s -> ~0.111
  assert.ok(close(S.hiddenShare(9.4e-6, 5e4, 0.25), 0.111, 1e-2));
  // a much shorter detection latency hides almost nothing: t_det 0.001 s -> ~0.00047
  assert.ok(close(S.hiddenShare(9.4e-6, 5e4, 0.001), 0.00047, 1e-2));
  assert.equal(S.hiddenShare(9.4e-6, 5e4, 0), 0);
  // matches the pooled sigma_FI and the design flux used elsewhere on the site
  assert.ok(close(S.hiddenShare(S.SIGMA_FI.pooled, S.FLUX_DEFAULT, S.DETECTION.tDetDefault_s), 0.111, 1e-2));
});

test("DETECTION reproduces the v2 phase split at the comparison condition", () => {
  assert.equal(S.DETECTION.duringComputation.hidden, 0);
  assert.equal(S.DETECTION.duringComputation.of, 150);
  assert.equal(Math.round((S.DETECTION.waitingOnPulse.hidden / S.DETECTION.waitingOnPulse.of) * 100), 18);
  // v2 census: each build's own host timeouts keep run 22 in the class, 20 of 76 (was 19 of 75)
  assert.equal(S.DETECTION.timeout.hidden, 20);
  assert.equal(S.DETECTION.timeout.of, 76);
  assert.equal(Math.round((S.DETECTION.timeout.hidden / S.DETECTION.timeout.of) * 100), 26);
  assert.deepEqual([...S.DETECTION.timeout.wait_s], [2, 20]);
  assert.equal(S.DETECTION.tDetDefault_s, 0.25);
});

test("storm census v2 and the hidden-strike loss match v81 Sec. IV-B", () => {
  const D = S.DETECTION;
  assert.deepEqual([...D.counterExcess], [0.17, 0.44]);
  assert.deepEqual({ ...D.resetLoops }, { count: 13, lo: 21, hi: 62, atComparison: 0 });
  assert.deepEqual([...D.magnitudeRange], [0.06, 0.17]);
  assert.deepEqual([...D.afterDetectionPoints], [0.02, 0.03]);
  assert.deepEqual([...D.trueRateAboveHost], [0.12, 0.16]);
  assert.deepEqual([...D.trueRateBelowCounter], [0.07, 0.10]);
  // "a tenth to an eighth" sits inside the 6 to 17% range
  assert.ok(D.magnitudeRange[0] < 1 / 10 && 1 / 8 < D.magnitudeRange[1]);
});

test("detectionRows renders one row per phase with the exact counted figures", () => {
  const rows = S.detectionRows();
  assert.ok(rows.includes("0 of 150"));
  assert.ok(rows.includes("18% (62 of 338)"));
  assert.ok(rows.includes("26% (20 of 76)"));
  assert.ok(rows.includes("host wait up to 2 to 20 s by build"));
  assert.ok(rows.includes("about 2% (3 of 150 and 8 of 338)"));
  // the v1 label was wrong: the configured waits were 2 to 20 s, not 5 or 10 s
  assert.ok(!rows.includes("5 or 10"));
  assert.ok(!rows.includes("19 of 75"));
});

test("timeBudgetRows renders the v81 Sec. III-B ranges", () => {
  const rows = S.timeBudgetRows();
  assert.ok(rows.includes("24 to 43%"));
  assert.ok(rows.includes("14 to 36%"));
  assert.ok(rows.includes("up to 29%"));
  assert.ok(rows.includes("1 to 2% at B = 1, about 40% at B = 200"));
});

test("host-detected rate lies below the fitted rate at the same flux", () => {
  assert.ok(S.SIGMA_CYC.hostDetectedRate < S.SIGMA_CYC.value * 5e4);
});

test("input validation", () => {
  assert.throws(() => S.frontierProduct(1, 1e-5), RangeError);
  assert.throws(() => S.frontierProduct(0.8, 0), RangeError);
  assert.throws(() => S.fluxForW(0.8, 1e-5, 0), RangeError);
  assert.throws(() => S.dutyFactor(0.8, 0.02, -1), RangeError);
  assert.throws(() => S.hiddenShare(0, 5e4, 0.25), RangeError);
  assert.throws(() => S.hiddenShare(9.4e-6, 5e4, -1), RangeError);
});

test("facilities filter is inclusive on both bounds", () => {
  const ids = (f) => S.facilitiesAchieving(f).map((x) => x.id).sort();
  assert.deepEqual(ids(1e5), ["BNL", "LBNL", "MSU"]);
  assert.deepEqual(ids(1e6), ["LBNL"]);
  assert.deepEqual(ids(2e7), []);
});

test("formatting helpers", () => {
  assert.equal(S.sci(1.5644e-5), "1.564×10⁻⁵");
  assert.equal(S.sci(50000), "5×10⁴");
  assert.equal(S.sci(285.27), "285.3");
  assert.equal(S.dur(0.28527), "285.27 ms");
  assert.equal(S.dur(200), "3.3 min");
  assert.equal(S.dur(10000), "2.78 h");
});
