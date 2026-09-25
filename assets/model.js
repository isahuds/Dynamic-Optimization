/* Flux-selection design model for dynamic SEE testing.
 *
 * One cross section, sigma_cyc, the cross section for a lost work cycle, fitted to a
 * direct count of surviving cycles. A cycle of length W at flux phi survives with
 * probability theta = exp(-sigma_cyc * phi * W). A target theta therefore fixes the
 * product phi*W, which is read either as a flux for a fixed work cycle or as the
 * longest work cycle for a fixed flux.
 *
 * The survival form follows Young (1974) and Daly (2006); the flux-selection framing
 * follows Zimmaro et al. (RADECS 2022). The duty factor D is the companion paper's
 * extension to dead time: the beam-on time from an interrupt until the device resumes
 * work, in which the host cannot observe it. Dead time has two parts, the detection
 * latency and the recovery that follows; tau here is measured as the recovery part, and
 * adding the detection latency to it is a check on D against the directly measured share.
 * Hidden strikes are carried only as the paper's caution, never as a method.
 *
 * Every number here traces to the RADECS-26 repository (analysis/k_direct_fit_v1.json,
 * survival_measurement_v3.csv, duty_factor_v3.csv, corruption_cross_sections_clean_cycle_v1.json,
 * call_time_budget_v1.json, storm_filter_impact_v2.json) and to testing-opt.tex, package
 * TNS_FINAL_2026-09-25-v86, the final copy. If this file and the paper disagree, the paper wins.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SEE = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var RELEASE = Object.freeze({
    schemaVersion: "flux-selection-design-tool-v7-2026-09-25",
    releaseDate: "2026-09-25",
    manuscript: "testing-opt.tex, package TNS_FINAL_2026-09-25-v86, the final copy",
    supersedes: "flux-selection-design-tool-v6-2026-09-24"
  });

  var THETA_DEFAULT = 0.90;
  var FLUENCE_TARGET_DEFAULT = 1e7;
  var W_DEFAULT_S = 0.200;
  var FLUX_DEFAULT = 5e4;

  /* Cross section for a lost work cycle, fitted on the six comparison builds at their own
   * flux and W (analysis/k_direct_fit_v1.json). sigmaDet is the host-detected cross
   * section over beam-on exposure, printed in Sec. IV-A; at the matched flux it gives
   * hostDetectedRate, which predicts a higher surviving share than every build measured,
   * so it is shown only as a caution. */
  var SIGMA_CYC = Object.freeze({
    value: 1.5644340325602356e-5,
    ci95: Object.freeze([1.4410600588730562e-5, 1.6946950484699895e-5]),
    nominalFlux: 5e4,
    sigmaDet: 8.3e-6,
    hostDetectedRate: 0.4159,
    let: "7.9 MeV cm^2/mg",
    source: "analysis/k_direct_fit_v1.json"
  });

  /* The two assumptions behind carrying sigma_cyc from one work cycle to another (Sec. IV-A).
   * One shared value serves every build (likelihood ratio), and a cycle's risk is constant
   * while it runs (a free Weibull shape returns beta near 1). */
  var FORM_TESTS = Object.freeze({
    sharedRate: Object.freeze({ G2: 6.4, dof: 5, p: 0.27, pPureFRAM: 0.56 }),
    weibullBeta: Object.freeze({ all: 0.98, allCI: Object.freeze([0.92, 1.04]),
                                 pureFRAM: 0.98, pureFRAMCI: Object.freeze([0.90, 1.06]) })
  });

  /* The worked example and the flux-family contrast of Sec. IV-A and Fig. 4. */
  var DESIGN_EXAMPLE = Object.freeze({
    theta: 0.90,
    flux: 5e4,
    longestW_s: 0.13469,               /* the paper prints 135 ms */
    buildsUnder: 3,
    overFactorFRAM_B50: 1.6,
    overFactorB200: 6,                 /* "roughly 6" */
    highFlux: 2e5,
    thetaLongestAtHighFlux: 0.08,      /* FRAM_B200 */
    thetaShortestAtHighFlux: 0.94      /* FRAM_B1 */
  });

  /* Six comparison builds at the reference condition (flux within 11% of 5e4,
   * LET 7.9). theta is a direct count of cycles with no host-detected interrupt, with
   * an exact 95% binomial interval. tau is the MEAN recovery time per lost cycle.
   * D is the duty factor at that tau. */
  var CONFIGS = Object.freeze([
    Object.freeze({ id: "FRAM_B1",           label: "FRAM, B=1, 16 MHz",          W_s: 0.019945, phi: 52676, attempted: 12376, lost: 198, theta: 0.984001, thetaLo: 0.981633, thetaHi: 0.986138, tau_s: 1.1745, D: 0.5067 }),
    Object.freeze({ id: "SRAM_B1",           label: "SRAM, B=1, 16 MHz",          W_s: 0.019770, phi: 46891, attempted: 2744,  lost: 53,  theta: 0.980685, thetaLo: 0.974811, thetaHi: 0.985499, tau_s: 1.2564, D: 0.4403 }),
    Object.freeze({ id: "FRAM_B1_Throttled", label: "FRAM, B=1, 1 MHz compute",   W_s: 0.045196, phi: 51400, attempted: 4488,  lost: 160, theta: 0.964349, thetaLo: 0.958503, thetaHi: 0.969581, tau_s: 0.5773, D: 0.6626 }),
    Object.freeze({ id: "FRAM_B50",          label: "FRAM, B=50, 16 MHz",         W_s: 0.215846, phi: 47218, attempted: 660,   lost: 85,  theta: 0.871212, thetaLo: 0.843232, thetaHi: 0.895818, tau_s: 0.5865, D: 0.6454 }),
    Object.freeze({ id: "SRAM_Mixed_B200",   label: "SRAM/mixed, B=200, 16 MHz",  W_s: 0.788551, phi: 51782, attempted: 116,   lost: 57,  theta: 0.508621, thetaLo: 0.414158, thetaHi: 0.602632, tau_s: 1.2791, D: 0.2830 }),
    Object.freeze({ id: "FRAM_B200",         label: "FRAM, B=200, 16 MHz",        W_s: 0.814114, phi: 48448, attempted: 75,    lost: 35,  theta: 0.533333, thetaLo: 0.414454, thetaHi: 0.649500, tau_s: 0.6099, D: 0.3952 })
  ]);

  /* Functional-interrupt cross section from the device's own reset counter, over beam-on
   * exposure. Comparable on five of the six builds (SRAM_B1's counter could not be
   * reconstructed). The one-shared-rate test rejects (FRAM_B50 and SRAM_Mixed_B200 carry
   * 83% of the statistic), but the rejection depends on how multi-reset gaps are credited:
   * crediting each such gap once leaves p = 0.64 and narrows the spread from 1.4 to 1.2. */
  var SIGMA_FI = Object.freeze({
    pooled: 9.4e-6,
    range: Object.freeze([7.7e-6, 11.1e-6]),
    spreadFactor: 1.4,
    comparableBuilds: 5,
    sharedRateTest: Object.freeze({ chi2: 12.3, dof: 4, p: 0.016, twoBuildShare: 0.83 }),
    creditedOnce: Object.freeze({ p: 0.64, spreadFactor: 1.2 }),
    counterOverHost: Object.freeze([1.17, 1.44]),
    escalatedCredits: 16,
    source: "testing-opt.tex (v86) Secs. III-B and V, Table III"
  });

  /* Corruption-event cross section, divided by the fluence delivered during the work
   * cycles that returned a clean result (in-cycle exposure times theta, Table III),
   * because it can only be read off a delivered result. Only printed values are carried
   * here; per-build rates appear only graphically, in the paper's Fig. 2. */
  var CORRUPTION = Object.freeze({
    basis: "fluence during work cycles that returned a clean result (in-cycle exposure x theta)",
    range: Object.freeze([1.09e-6, 1.04e-5]),
    spreadFactor: 9.5,
    events: 95,
    highest: "SRAM_Mixed_B200",
    levelPair: Object.freeze(["SRAM_B1", "FRAM_B1_Throttled"]),
    batchTest: Object.freeze({ chi2: 0.6, dof: 2, p: 0.73 }),
    clockTest: Object.freeze({ chi2: 18.7, dof: 3, pBelow: 0.001, throttledShare: 0.65 }),
    source: "testing-opt.tex (v86) Sec. III-B; analysis/corruption_cross_sections_clean_cycle_v1.json"
  });

  /* Where beam-on time went inside a call (Sec. III-B), and how the duty factor compares
   * with the directly measured countable share (Sec. IV-B). By default only the recovery
   * part of dead time is charged to D, so it is an upper bound. Adding the measured
   * detection latency per lost cycle to tau brings D close to the measured share at
   * B <= 50. Ranges only, as printed. */
  var TIME_BUDGET = Object.freeze({
    inCycle: Object.freeze([0.24, 0.43]),
    recovery: Object.freeze([0.14, 0.36]),
    detectionWaitMax: 0.29,
    rerunAtB1: Object.freeze([0.01, 0.02]),
    rerunAtB200: 0.40,                               /* "about 40%" */
    measuredCountableShare: Object.freeze([0.12, 0.42]),
    waitPerLostCycle_s: Object.freeze([0.7, 1.1]),
    dWithWaitGap: Object.freeze([0.02, 0.05]),       /* at B <= 50 */
    exampleFRAM_B1: Object.freeze({ dWithWait: 0.39, measured: 0.37 }),
    source: "testing-opt.tex (v86) Secs. III-B and IV-B; analysis/call_time_budget_v1.json"
  });

  /* Retried executions are dropped from the counted cycles and their exposure (Sec. V).
   * Counting them as attempts instead would raise sigma_cyc by 9%. */
  var RETRY_EXCLUSION = Object.freeze({
    beamOnShareAtB1: Object.freeze([0.01, 0.02]),
    beamOnShareAtB200: Object.freeze([0.29, 0.30]),
    sigmaCycRiseIfCounted: 0.09
  });

  /* Hidden strikes, as the paper's caution (Sec. IV-B, V, VI). A second strike that lands
   * before the host has detected and recovered from the first resets the device again but
   * opens no new recovery episode. The reset counter records it; the host does not. The
   * share below is for the four FRAM builds at the reference condition. uncertainty is the
   * range Sec. V gives once the estimate's own uncertainty is allowed for. */
  var HIDDEN = Object.freeze({
    share: Object.freeze([0.11, 0.13]),
    uncertainty: Object.freeze([0.06, 0.17]),
    afterDetectionPoints: Object.freeze([0.02, 0.03]),
    trueRateAboveHost: Object.freeze([0.12, 0.16]),
    trueRateBelowCounter: Object.freeze([0.07, 0.10]),
    resetLoops: Object.freeze({ count: 13, atReference: 0, sweepFrom: 4448, sweepTo: 3951 }),
    zimmaro: Object.freeze({ countedFall: 3.76, fluxRise: 10.5 }),
    source: "testing-opt.tex (v86) Secs. IV-B, V, VI; analysis/storm_filter_impact_v2.json"
  });

  var CAMPAIGN = Object.freeze({
    attemptedTotal: 20459,
    lostTotal: 588,
    hostDetections: 787,
    workCycleRange_ms: Object.freeze([20, 814]),
    thetaRange: Object.freeze([0.51, 0.98]),
    /* 1 - D over the six builds: the share of the time spent running cycles and recovering
     * that yields no countable exposure, when only the recovery part of dead time is
     * charged. Not a share of beam-on time. */
    uncountedCycleAndRecoveryShare: Object.freeze([0.34, 0.72]),
    settle_s: 0.165,
    /* Share of recoveries whose first attempt failed (Sec. IV-B): the recovery needed further
     * attempts or, when resynchronization failed outright, the fixed timeout below. Most
     * recovery time goes to these. FRAM_B1 and SRAM_B1 run higher than the rest. */
    firstAttemptFailureShare: Object.freeze({ FRAM_B1: 0.15, SRAM_B1: 0.22, restRange: Object.freeze([0.06, 0.11]) }),
    /* The fixed cost of an episode that fails to resynchronize (Sec. IV-B), the time of
     * thirty to sixty successful recoveries. Distinct from the detection latency. */
    resyncTimeout_s: Object.freeze([5, 10]),
    episodesPerLostCycleSRAM_Mixed: 2.5,
    episodesPerLostCycleOthersMax: 1.6,
    autoSuccessRate: 0.953,
    manualSuccessRate: 0.964,
    successDifferenceCI_points: Object.freeze([-5, 3]),
    facilityPauseMedian_s: 84.6,
    /* The LET sweep: pausing the beam at every host detection, at the median manual pause,
     * would have delivered this fluence instead of what was accumulated (Sec. III-A). */
    sweepPauseFluence: 1.45e7,
    sweepActualFluence: 2.56e8,
    sweepExposureFactor: 18,
    corruptionSpreadFactor: 9.5,
    interruptSpreadFactor: 1.4
  });

  var FACILITIES = Object.freeze([
    Object.freeze({ id: "LBNL", label: "LBNL 88-Inch Cyclotron (BASE)", fluxMin: null, fluxMax: 1e7,
      source: "facility page (cyclotron.lbl.gov/base-rad-effects/heavy-ions)" }),
    Object.freeze({ id: "BNL", label: "BNL Tandem Van de Graaff (SEU Test Facility)", fluxMin: 1e2, fluxMax: 1e5,
      source: "facility page (bnl.gov/tandem/capabilities/seu.php)" }),
    Object.freeze({ id: "MSU", label: "MSU NSCL K500/K1200 (SEETF)", fluxMin: 7.7e1, fluxMax: 2.5e5,
      source: "peer-reviewed facility-performance paper" })
  ]);

  function requirePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(name + " must be finite and positive");
  }
  function requireTheta(theta) {
    if (!(theta > 0 && theta < 1)) throw new RangeError("clean-cycle fraction must be strictly between 0 and 1");
  }

  /* --- Eq. (1): theta = exp(-sigma phi W) --- */
  function cleanFraction(sigma, phi, W) {
    requirePositive(sigma, "sigma_cyc"); requirePositive(phi, "flux"); requirePositive(W, "work-cycle time");
    return Math.exp(-sigma * phi * W);
  }

  /* --- Eq. (2): phi W = -ln(theta) / sigma --- */
  function frontierProduct(theta, sigma) {
    requireTheta(theta); requirePositive(sigma, "sigma_cyc");
    return -Math.log(theta) / sigma;
  }
  function fluxForW(theta, sigma, W) {
    requirePositive(W, "work-cycle time");
    return frontierProduct(theta, sigma) / W;
  }
  function longestW(theta, sigma, phi) {
    requirePositive(phi, "flux");
    return frontierProduct(theta, sigma) / phi;
  }
  function wallClockTime(phi, fluenceTarget) {
    requirePositive(phi, "flux"); requirePositive(fluenceTarget, "fluence target");
    return fluenceTarget / phi;
  }

  /* --- Eq. (3), (4): duty factor and its inverse. tau = 0 returns D = theta. --- */
  function dutyFactor(theta, W, tau) {
    if (!(theta > 0 && theta <= 1)) throw new RangeError("clean-cycle fraction must lie in (0,1]");
    requirePositive(W, "work-cycle time");
    if (tau == null) tau = 0;
    if (!Number.isFinite(tau) || tau < 0) throw new RangeError("recovery time must be finite and nonnegative");
    return theta * W / (W + (1 - theta) * tau);
  }
  function thetaForDuty(D, W, tau) {
    if (!(D > 0 && D <= 1)) throw new RangeError("duty factor must lie in (0,1]");
    requirePositive(W, "work-cycle time");
    if (tau == null) tau = 0;
    if (!Number.isFinite(tau) || tau < 0) throw new RangeError("recovery time must be finite and nonnegative");
    return D * (W + tau) / (W + D * tau);
  }
  /* The charge a build pays, (1-theta) tau / W. W cancels once theta comes from Eq. (1). */
  function recoveryCharge(theta, W, tau) {
    if (!(theta > 0 && theta <= 1)) throw new RangeError("clean-cycle fraction must lie in (0,1]");
    requirePositive(W, "work-cycle time");
    if (!Number.isFinite(tau) || tau < 0) throw new RangeError("recovery time must be finite and nonnegative");
    return (1 - theta) * tau / W;
  }

  /* The charge at a given flux, with theta taken from Eq. (1). To first order W drops out
   * and the charge is sigma_cyc*phi*tau; at larger phi*W it falls below that. This is a
   * check on the model's own W-independence, not a numeric example v86 prints. */
  function chargeAtFlux(sigma, phi, W, tau) {
    return recoveryCharge(cleanFraction(sigma, phi, W), W, tau);
  }

  function facilitiesAchieving(flux) {
    requirePositive(flux, "flux");
    return FACILITIES.filter(function (f) {
      return (f.fluxMin == null || flux >= f.fluxMin) && (f.fluxMax == null || flux <= f.fluxMax);
    });
  }

  /* --- Formatting helpers --- */
  function sup(n) {
    var map = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(n).split("").map(function (c) { return map[c] || c; }).join("");
  }
  function stripTrailingZeros(s) {
    if (s.indexOf(".") === -1) return s;
    return s.replace(/0+$/, "").replace(/\.$/, "");
  }
  function sci(value, digits) {
    if (value == null || !Number.isFinite(value)) return "—";
    if (value === 0) return "0";
    digits = digits == null ? 3 : digits;
    var exponent = Math.floor(Math.log10(Math.abs(value)));
    if (exponent >= -2 && exponent < 4) return stripTrailingZeros(value.toFixed(Math.max(0, Math.min(6, digits - exponent))));
    return stripTrailingZeros((value / Math.pow(10, exponent)).toFixed(digits)) + "×10" + sup(exponent);
  }
  function dur(seconds) {
    if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
    if (seconds < 1) return (seconds * 1000).toFixed(2).replace(/\.?0+$/, "") + " ms";
    if (seconds < 120) return seconds.toFixed(2).replace(/\.?0+$/, "") + " s";
    if (seconds < 7200) return (seconds / 60).toFixed(1) + " min";
    return (seconds / 3600).toFixed(2) + " h";
  }
  function metric(label, value, unit, sub, hero) {
    return '<div class="metric' + (hero ? " hero" : "") + '"><div class="k">' + label +
      '</div><div class="v">' + value + (unit ? "<small>" + unit + "</small>" : "") +
      "</div>" + (sub ? '<div class="sub">' + sub + "</div>" : "") + "</div>";
  }
  function warnBox(title, body, bad) {
    return '<div class="warnbox' + (bad ? " bad" : "") + '"><b>' + title + "</b>" + body + "</div>";
  }
  /* Renders TIME_BUDGET as table rows for recovery.html and background.html: where beam-on
   * time inside a call went, as ranges over the six builds (Sec. III-B). */
  function timeBudgetRows() {
    var t = TIME_BUDGET;
    function range(a) { return Math.round(a[0] * 100) + " to " + Math.round(a[1] * 100) + "%"; }
    return "<tr><td>Inside work cycles</td><td>" + range(t.inCycle) + "</td></tr>" +
      "<tr><td>Recovery</td><td>" + range(t.recovery) + "</td></tr>" +
      "<tr><td>The host's wait to detect an interrupt</td><td>up to " +
        Math.round(t.detectionWaitMax * 100) + "%</td></tr>" +
      "<tr><td>Re-running the cycles that interrupts cut short</td><td>" + range(t.rerunAtB1) +
        " at B = 1, about " + Math.round(t.rerunAtB200 * 100) + "% at B = 200</td></tr>";
  }

  return Object.freeze({
    RELEASE: RELEASE,
    THETA_DEFAULT: THETA_DEFAULT,
    FLUENCE_TARGET_DEFAULT: FLUENCE_TARGET_DEFAULT,
    W_DEFAULT_S: W_DEFAULT_S,
    FLUX_DEFAULT: FLUX_DEFAULT,
    SIGMA_CYC: SIGMA_CYC,
    FORM_TESTS: FORM_TESTS,
    DESIGN_EXAMPLE: DESIGN_EXAMPLE,
    SIGMA_FI: SIGMA_FI,
    CORRUPTION: CORRUPTION,
    TIME_BUDGET: TIME_BUDGET,
    RETRY_EXCLUSION: RETRY_EXCLUSION,
    HIDDEN: HIDDEN,
    CONFIGS: CONFIGS,
    CAMPAIGN: CAMPAIGN,
    FACILITIES: FACILITIES,
    cleanFraction: cleanFraction,
    frontierProduct: frontierProduct,
    fluxForW: fluxForW,
    longestW: longestW,
    wallClockTime: wallClockTime,
    dutyFactor: dutyFactor,
    thetaForDuty: thetaForDuty,
    recoveryCharge: recoveryCharge,
    chargeAtFlux: chargeAtFlux,
    facilitiesAchieving: facilitiesAchieving,
    sci: sci, dur: dur, metric: metric, warnBox: warnBox,
    timeBudgetRows: timeBudgetRows
  });
});
