"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../assets/model.js");

const close = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);

test("release identifies the manuscript package it was built against", () => {
  assert.equal(S.RELEASE.schemaVersion, "flux-selection-design-tool-v3-2026-09-18");
  assert.equal(S.RELEASE.manuscript, "TNS_REMEDIATION_2026-09-17-v76");
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

test("design rule: longest work cycle is 285 ms at theta 0.80 and 5e4", () => {
  const W = S.longestW(0.80, S.SIGMA_CYC.value, 5e4);
  assert.ok(close(W, 0.28527, 1e-3));
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

test("shortest work cycle is 74 to 92 ms at theta 0.80 for tau_d 0.33 to 0.41 s", () => {
  assert.ok(close(S.shortestW(0.80, S.PILEUP.tauD), 0.0741, 2e-3));
  assert.ok(close(S.shortestW(0.80, S.PILEUP.tauDComparisonLET), 0.0924, 2e-3));
});

test("comparison-LET ceiling from sigma_cyc is 1.5 to 1.9e5", () => {
  const hi = S.ceilingFlux(S.SIGMA_CYC.value, S.PILEUP.tauD);
  const lo = S.ceilingFlux(S.SIGMA_CYC.value, S.PILEUP.tauDComparisonLET);
  assert.ok(close(hi, 1.93e5, 1e-2));
  assert.ok(close(lo, 1.54e5, 1e-2));
  // three to six times the flux the builds used
  assert.ok(lo / 5e4 > 3 && hi / 5e4 < 6);
  // sigma_cyc phi tau_d at 5e4 is 0.26 to 0.32, so suppression there is under a third
  assert.ok(S.suppression(S.SIGMA_CYC.value, 5e4, S.PILEUP.tauDComparisonLET) < 1 / 3);
});

test("pileup fit: phi* is 1/(sigma_fit tau_d), about 26,000, and the reset-counter refit moves it under 5%", () => {
  assert.ok(close(S.PILEUP.phiStar, 1 / (S.PILEUP.sigmaFit * S.PILEUP.tauD), 1e-9));
  assert.ok(close(S.PILEUP.phiStar, 26000, 5e-3));
  const shift = Math.abs(S.PILEUP.resetCounter.phiStar - S.PILEUP.phiStar) / S.PILEUP.phiStar;
  assert.ok(shift < 0.05);
  // an illustrative 1 s dead time puts the peak near 8,600
  assert.ok(close(1 / (S.PILEUP.sigmaFit * 1.0), 8600, 1e-2));
});

test("counted rate at phi* sits 63% below the unsuppressed line", () => {
  const s = S.suppression(S.PILEUP.sigmaFit, S.PILEUP.phiStar, S.PILEUP.tauD);
  assert.equal(s.toFixed(2), "0.63");
  const peak = S.countedRate(S.PILEUP.sigmaFit, S.PILEUP.phiStar, S.PILEUP.tauD);
  assert.ok(S.countedRate(S.PILEUP.sigmaFit, S.PILEUP.phiStar * 0.5, S.PILEUP.tauD) < peak);
  assert.ok(S.countedRate(S.PILEUP.sigmaFit, S.PILEUP.phiStar * 2, S.PILEUP.tauD) < peak);
});

test("host-detected rate lies below the fitted rate at the same flux", () => {
  assert.ok(S.SIGMA_CYC.hostDetectedRate < S.SIGMA_CYC.value * 5e4);
});

test("input validation", () => {
  assert.throws(() => S.frontierProduct(1, 1e-5), RangeError);
  assert.throws(() => S.frontierProduct(0.8, 0), RangeError);
  assert.throws(() => S.fluxForW(0.8, 1e-5, 0), RangeError);
  assert.throws(() => S.dutyFactor(0.8, 0.02, -1), RangeError);
  assert.throws(() => S.shortestW(0.8, 0), RangeError);
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
