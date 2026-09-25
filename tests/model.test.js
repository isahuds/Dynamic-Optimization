"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../assets/model.js");

const close = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);

test("release identifies the manuscript package it was built against", () => {
  assert.equal(S.RELEASE.schemaVersion, "flux-selection-design-tool-v7-2026-09-25");
  assert.ok(S.RELEASE.manuscript.startsWith("testing-opt.tex"));
  assert.equal(S.RELEASE.supersedes, "flux-selection-design-tool-v6-2026-09-24");
});

test("sigma_cyc pins the released direct fit", () => {
  assert.ok(close(S.SIGMA_CYC.value, 1.5644e-5, 1e-4));
  assert.ok(close(S.SIGMA_CYC.ci95[0], 1.4411e-5, 1e-4));
  assert.ok(close(S.SIGMA_CYC.ci95[1], 1.6947e-5, 1e-4));
  // the paper prints 0.78 s^-1 at the nominal matched flux
  assert.equal((S.SIGMA_CYC.value * 5e4).toFixed(2), "0.78");
  // the three-build fit left the paper in v83 and must not come back unannounced
  assert.equal(S.SIGMA_CYC.threeBuild, undefined);
});

test("sigma_det is printed as 8.3e-6 cm^2 and gives the 0.42 s^-1 host-record rate", () => {
  assert.equal(S.SIGMA_CYC.sigmaDet, 8.3e-6);
  // the printed 8.3e-6 is the unrounded host-record rate over the matched flux, rounded
  assert.equal((S.SIGMA_CYC.hostDetectedRate / 5e4 * 1e6).toFixed(1), "8.3");
  assert.equal(S.SIGMA_CYC.hostDetectedRate.toFixed(2), "0.42");
  // fed to Eq. (1) it predicts a higher surviving share than every build measured
  for (const c of S.CONFIGS) {
    assert.ok(Math.exp(-S.SIGMA_CYC.hostDetectedRate * c.W_s) > c.theta, c.id);
  }
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

test("measured theta is the direct count and spans 0.51 to 0.98 over W from 20 to 814 ms", () => {
  for (const c of S.CONFIGS) {
    assert.ok(close(c.theta, (c.attempted - c.lost) / c.attempted, 1e-5), c.id);
    assert.ok(c.thetaLo < c.theta && c.theta < c.thetaHi, c.id);
  }
  const W = S.CONFIGS.map((c) => c.W_s * 1000);
  assert.equal(Math.round(Math.min(...W)), S.CAMPAIGN.workCycleRange_ms[0]);
  assert.equal(Math.round(Math.max(...W)), S.CAMPAIGN.workCycleRange_ms[1]);
  assert.equal(S.CAMPAIGN.workCycleRangeFold, undefined);
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

test("design rule: longest work cycle is 135 ms at theta 0.90 and 5e4, with the paper's comparisons", () => {
  const E = S.DESIGN_EXAMPLE;
  const W = S.longestW(E.theta, S.SIGMA_CYC.value, E.flux);
  assert.ok(close(W, 0.13469, 1e-3));
  assert.ok(close(W, E.longestW_s, 1e-3));
  assert.equal(S.CONFIGS.filter((c) => c.W_s < W).length, E.buildsUnder);
  const b50 = S.CONFIGS.find((c) => c.id === "FRAM_B50");
  assert.equal((b50.W_s / W).toFixed(1), E.overFactorFRAM_B50.toFixed(1));
  for (const id of ["FRAM_B200", "SRAM_Mixed_B200"]) {
    const c = S.CONFIGS.find((x) => x.id === id);
    assert.equal(Math.round(c.W_s / W), E.overFactorB200, id);
  }
});

test("at 2e5 the longest cycle keeps 8% and the shortest 94%", () => {
  const E = S.DESIGN_EXAMPLE;
  const longest = S.CONFIGS.reduce((a, c) => (c.W_s > a.W_s ? c : a));
  const shortest = S.CONFIGS.reduce((a, c) => (c.W_s < a.W_s ? c : a));
  assert.equal(S.cleanFraction(S.SIGMA_CYC.value, E.highFlux, longest.W_s).toFixed(2), E.thetaLongestAtHighFlux.toFixed(2));
  assert.equal(S.cleanFraction(S.SIGMA_CYC.value, E.highFlux, shortest.W_s).toFixed(2), E.thetaShortestAtHighFlux.toFixed(2));
});

test("form tests carry the paper's printed values", () => {
  assert.deepEqual({ ...S.FORM_TESTS.sharedRate }, { G2: 6.4, dof: 5, p: 0.27, pPureFRAM: 0.56 });
  const b = S.FORM_TESTS.weibullBeta;
  assert.equal(b.all, 0.98);
  assert.deepEqual([...b.allCI], [0.92, 1.04]);
  assert.deepEqual([...b.pureFRAMCI], [0.90, 1.06]);
  assert.ok(b.allCI[0] < 1 && 1 < b.allCI[1], "the constant-rate form sits inside the interval");
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

test("recovery charge for FRAM_B1 is close to one: as long recovering as running cycles", () => {
  const c = S.CONFIGS.find((x) => x.id === "FRAM_B1");
  const charge = S.recoveryCharge(c.theta, c.W_s, c.tau_s);
  assert.ok(charge > 0.9 && charge < 1.0, String(charge));
});

test("to first order W drops out of the charge (model property; not a numeric example in v86)", () => {
  const c = S.CONFIGS.find((x) => x.id === "FRAM_B1");
  const sigma = S.SIGMA_CYC.value;
  const ratio = S.chargeAtFlux(sigma, 5e4, 40 * c.W_s, c.tau_s) / S.chargeAtFlux(sigma, 5e4, c.W_s, c.tau_s);
  assert.equal(ratio.toFixed(2), "0.75");
  // and in the small-loss limit the charge tends to sigma*phi*tau, with no W in it
  assert.ok(close(S.chargeAtFlux(sigma, 5e4, 1e-6, c.tau_s), sigma * 5e4 * c.tau_s, 1e-3));
});

test("FRAM_B1 and SRAM_B1 take about twice as long to recover as the two builds that pass them", () => {
  const tau = (id) => S.CONFIGS.find((x) => x.id === id).tau_s;
  const slow = [tau("FRAM_B1"), tau("SRAM_B1")];
  const fast = [tau("FRAM_B1_Throttled"), tau("FRAM_B50")];
  assert.deepEqual(slow.map((x) => x.toFixed(2)), ["1.17", "1.26"]);
  assert.deepEqual(fast.map((x) => x.toFixed(2)), ["0.58", "0.59"]);
  for (const s of slow) for (const f of fast) assert.ok(s / f > 1.8 && s / f < 2.3);
});

test("pooled sigma_FI matches the paper's five-build functional-interrupt rate", () => {
  assert.ok(close(S.SIGMA_FI.pooled, 9.4e-6, 1e-3));
  assert.equal(S.SIGMA_FI.spreadFactor, 1.4);
  assert.equal(S.SIGMA_FI.comparableBuilds, 5);
  assert.deepEqual({ ...S.SIGMA_FI.sharedRateTest }, { chi2: 12.3, dof: 4, p: 0.016, twoBuildShare: 0.83 });
  assert.deepEqual({ ...S.SIGMA_FI.creditedOnce }, { p: 0.64, spreadFactor: 1.2 });
  assert.deepEqual([...S.SIGMA_FI.counterOverHost], [1.17, 1.44]);
});

test("charged for recovery alone, 34% to 72% of the time running cycles and recovering is uncounted", () => {
  assert.deepEqual([...S.CAMPAIGN.uncountedCycleAndRecoveryShare], [0.34, 0.72]);
  // the same range is 1 - D over the six builds' own theta, W and tau
  const oneMinusD = S.CONFIGS.map((c) => 1 - S.dutyFactor(c.theta, c.W_s, c.tau_s));
  assert.equal(Math.min(...oneMinusD).toFixed(2), "0.34");
  assert.equal(Math.max(...oneMinusD).toFixed(2), "0.72");
});

test("measured over beam-on time, the countable share is 12 to 42%", () => {
  assert.deepEqual([...S.TIME_BUDGET.measuredCountableShare], [0.12, 0.42]);
  // the 58 to 88% complement was commented out of Sec. VI in v83
  assert.equal(S.CAMPAIGN.uncountedBeamOnShare, undefined);
  // by default only the recovery part of dead time is charged to D, so every published D is at least the top of the measured range
  for (const c of S.CONFIGS.filter((x) => ["FRAM_B1", "FRAM_B50", "FRAM_B200", "SRAM_Mixed_B200"].includes(x.id))) {
    assert.ok(c.D >= S.TIME_BUDGET.measuredCountableShare[0], c.id);
  }
});

test("beam-on time budget matches Sec. III-B", () => {
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

test("corruption-event rate is on clean-cycle exposure: a factor of 9.5, 1.09e-6 to 1.04e-5", () => {
  const C = S.CORRUPTION;
  assert.equal(C.spreadFactor, 9.5);
  assert.equal(S.CAMPAIGN.corruptionSpreadFactor, 9.5);
  assert.deepEqual([...C.range], [1.09e-6, 1.04e-5]);
  // the printed endpoints divide to the printed factor
  assert.equal((C.range[1] / C.range[0]).toFixed(1), "9.5");
  assert.equal(C.events, 95);
  assert.equal(C.highest, "SRAM_Mixed_B200");
  assert.deepEqual([...C.levelPair], ["SRAM_B1", "FRAM_B1_Throttled"]);
  assert.equal(C.fiOverCorruptionFold, undefined);
  assert.deepEqual({ ...C.batchTest }, { chi2: 0.6, dof: 2, p: 0.73 });
  assert.deepEqual({ ...C.clockTest }, { chi2: 18.7, dof: 3, pBelow: 0.001, throttledShare: 0.65 });
  assert.equal(S.CAMPAIGN.interruptSpreadFactor, 1.4);
});

test("hidden strikes are carried as the paper's caution, with no estimator", () => {
  const H = S.HIDDEN;
  assert.deepEqual([...H.share], [0.11, 0.13]);
  assert.deepEqual([...H.uncertainty], [0.06, 0.17]);
  assert.ok(H.uncertainty[0] < H.share[0] && H.share[1] < H.uncertainty[1]);
  assert.deepEqual([...H.afterDetectionPoints], [0.02, 0.03]);
  assert.deepEqual([...H.trueRateAboveHost], [0.12, 0.16]);
  assert.deepEqual([...H.trueRateBelowCounter], [0.07, 0.10]);
  assert.deepEqual({ ...H.resetLoops }, { count: 13, atReference: 0, sweepFrom: 4448, sweepTo: 3951 });
  assert.deepEqual({ ...H.zimmaro }, { countedFall: 3.76, fluxRise: 10.5 });
  // v82 made hidden strikes a caution, not a method: no estimator, no phase split
  assert.equal(S.hiddenShare, undefined);
  assert.equal(S.detectionRows, undefined);
  assert.equal(S.DETECTION, undefined);
});

test("recovery statistics match Secs. III-A and IV-B", () => {
  const C = S.CAMPAIGN;
  assert.equal(C.autoSuccessRate, 0.953);
  assert.equal(C.manualSuccessRate, 0.964);
  assert.deepEqual([...C.successDifferenceCI_points], [-5, 3]);
  assert.equal(C.autoSuccessRateCensoredAsFailure, undefined);
  // the slowest-5%-of-episodes and escalated-recovery-mean statistics were cut from v86 (L424)
  assert.equal(C.slowestFivePercentShare, undefined);
  assert.equal(C.escalatedRecoveryMean_s, undefined);
  // v86 L411: first attempts failed in 15% and 22% of recoveries for FRAM_B1 and SRAM_B1,
  // against 6 to 11% for the rest -- replacing (30)'s "~4% for five builds, 16% for SRAM_B1"
  assert.equal(C.resyncFailureShare, undefined);
  assert.equal(C.resyncFailureShareSRAM_B1, undefined);
  assert.equal(C.firstAttemptFailureShare.FRAM_B1, 0.15);
  assert.equal(C.firstAttemptFailureShare.SRAM_B1, 0.22);
  assert.deepEqual([...C.firstAttemptFailureShare.restRange], [0.06, 0.11]);
  assert.equal(C.episodesPerLostCycleSRAM_Mixed, 2.5);
  assert.equal(C.episodesPerLostCycleOthersMax, 1.6);
  assert.equal(Math.round(C.sweepActualFluence / C.sweepPauseFluence), C.sweepExposureFactor);
  assert.equal(C.hostDetections, 787);
  // a failed resync costs thirty to sixty successful recoveries, distinct from the detection latency
  assert.equal(Math.round(C.resyncTimeout_s[0] / C.settle_s / 10) * 10, 30);
  assert.equal(Math.round(C.resyncTimeout_s[1] / C.settle_s / 10) * 10, 60);
});

test("retry exclusion matches Sec. V", () => {
  const R = S.RETRY_EXCLUSION;
  assert.deepEqual([...R.beamOnShareAtB1], [0.01, 0.02]);
  assert.deepEqual([...R.beamOnShareAtB200], [0.29, 0.30]);
  assert.equal(R.sigmaCycRiseIfCounted, 0.09);
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
  assert.throws(() => S.chargeAtFlux(0, 5e4, 0.02, 1), RangeError);
  assert.throws(() => S.chargeAtFlux(1e-5, 5e4, 0.02, -1), RangeError);
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
