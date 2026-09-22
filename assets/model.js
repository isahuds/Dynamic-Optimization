/* Flux-selection design model for dynamic SEE testing.
 *
 * One cross section, sigma_cyc, the cross section for losing a work cycle, fitted
 * to a direct count of surviving cycles. A cycle of length W at flux phi survives
 * with probability theta = exp(-sigma_cyc * phi * W). A target theta therefore fixes
 * the product phi*W, which is read either as a flux for a fixed work cycle or as the
 * longest work cycle for a fixed flux.
 *
 * The survival form follows Young (1974) and Daly (2006); the flux-selection framing
 * follows Zimmaro et al. (RADECS 2022). The recovery charge (duty factor D) and the
 * hidden-interrupt estimate are the companion paper's extensions. A second strike that
 * lands before the host detects the first reset causes another reset that is never
 * counted, so a counted interrupt rate can sit below the true one by a share that grows
 * with flux and with detection latency. That share never touches sigma_cyc, theta or the
 * corruption-event rate, which are counted only on cycles that survived.
 *
 * Every number here traces to the RADECS-26 repository (analysis/k_direct_fit_v1.json,
 * survival_measurement_v3.csv, duty_factor_v3.csv) and to manuscript package v80. A prior
 * package fitted a maximum counted rate from a dead time and a strike cross section, with
 * a matching minimum work-cycle time; that fit was withdrawn in v80 and replaced with a
 * direct, unfitted measurement of how often a second strike hides inside the host's
 * detection latency. If this file and the paper disagree, the paper wins.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SEE = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var RELEASE = Object.freeze({
    schemaVersion: "flux-selection-design-tool-v4-2026-09-22",
    releaseDate: "2026-09-22",
    manuscript: "TNS_REMEDIATION_2026-09-22-v80",
    supersedes: "flux-selection-design-tool-v3-2026-09-18"
  });

  var THETA_DEFAULT = 0.90;
  var FLUENCE_TARGET_DEFAULT = 1e7;
  var W_DEFAULT_S = 0.200;
  var FLUX_DEFAULT = 5e4;

  /* Cross section for losing a work cycle, fitted on the six comparison builds at
   * their own flux and W (analysis/k_direct_fit_v1.json). The three-build value is the
   * same estimator on the pure-FRAM 16 MHz builds alone. hostDetectedRate is what the
   * host's recovery record gives at the same flux, sigma_det*phi; it lies above every
   * measured point and is shown only as a caution. */
  var SIGMA_CYC = Object.freeze({
    value: 1.5644340325602356e-5,
    ci95: Object.freeze([1.4410600588730562e-5, 1.6946950484699895e-5]),
    threeBuild: 1.4872554999742147e-5,
    threeBuildCI: Object.freeze([1.3294701983988342e-5, 1.6571031703796958e-5]),
    nominalFlux: 5e4,
    hostDetectedRate: 0.4159,
    let: "7.9 MeV cm^2/mg",
    source: "analysis/k_direct_fit_v1.json"
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

  /* Functional-interrupt cross section from the device's own reset counter, over
   * beam-on exposure. Comparable on five of the six builds (SRAM_B1's counter could not
   * be reconstructed). pooled is the count-weighted rate across those five; range is the
   * per-build spread. This is the sigma_FI that feeds hiddenShare below, not sigma_cyc. */
  var SIGMA_FI = Object.freeze({
    pooled: 9.4e-6,
    range: Object.freeze([7.7e-6, 11.1e-6]),
    spreadFold: 1.4,
    comparableBuilds: 5,
    source: "testing-opt.tex Sec. III-B (functional-interrupt comparison)"
  });

  /* Hidden interrupts: a second, independent strike that lands after one reset but
   * before the host has resynchronized causes another reset that opens no new recovery
   * episode, so it is never counted (the counting loss known from radiation detectors,
   * Knoll). The device's reset counter records these hidden resets but also credits
   * repeated resets after a single event, so its excess over the host's count is not all
   * hidden strikes. DETECTION is the campaign's measured phase split at the comparison
   * condition, four FRAM builds: reset during computation, host reads within
   * milliseconds; reset outside computation, host waits t_det for a pulse; a timeout,
   * which cannot be split around detection; and resynchronizing under beam after
   * detection. hiddenShare below is the unfitted expectation for the first two phases if
   * every hidden reset were an independent strike landing inside t_det. */
  var DETECTION = Object.freeze({
    duringComputation: Object.freeze({ hidden: 0, of: 150 }),
    waitingOnPulse: Object.freeze({ hidden: 62, of: 338 }),
    timeout: Object.freeze({ hidden: 19, of: 75 }),
    resyncUnderBeam: Object.freeze({ approx: 0.02, detail: "3 of 150 and 8 of 338" }),
    tDetDefault_s: 0.25,
    oneInEleven: 1 / 11,
    resetLoops: Object.freeze({ count: 14, lo: 21, hi: 62 }),
    magnitudeRange: Object.freeze([0.06, 0.15]),
    afterDetectionPoints: 0.02,
    source: "testing-opt.tex Sec. IV-B (recovery time in the flux choice)"
  });

  var CAMPAIGN = Object.freeze({
    attemptedTotal: 20459,
    lostTotal: 588,
    workCycleRangeFold: 41,
    thetaRange: Object.freeze([0.51, 0.98]),
    longestW_s_at_design: 0.13469,       /* theta 0.90, phi 5e4, sigma_cyc; the paper prints 135 ms */
    testTimeNoExposure: Object.freeze([0.34, 0.72]),
    inCycleShare: Object.freeze([0.32, 0.56]),
    settle_s: 0.165,
    resyncFailureShare: 0.04,
    resyncFailureShareSRAM_B1: 0.16,
    hostTimeout_s: Object.freeze([5, 10]),
    autoSuccessRate: 0.953,
    manualSuccessRate: 0.964,
    autoSuccessRateCensoredAsFailure: 0.714,
    facilityPauseMedian_s: 84.6,
    escalatedRecoveryMean_s: 93.7,
    corruptionSpreadFold: 6.1,
    interruptSpreadFold: 1.4,
    cyclesPerLostCycleSpreadFold: 31
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

  /* --- Hidden interrupts. The expectation that an interrupt hides a second, independent
   * strike, if every hidden reset were an independent strike landing inside the
   * detection latency t_det. This is an unfitted expectation, not a fit: it uses the
   * pooled sigma_FI directly, the way sigma_cyc*phi is a rate with no fitted parameter.
   * The campaign's measured 18% after a fixed 0.25 s wait runs above this estimate,
   * because it also includes repeated resets after a single event. --- */
  function hiddenShare(sigmaFI, phi, tDet) {
    requirePositive(sigmaFI, "sigma_FI"); requirePositive(phi, "flux");
    if (!Number.isFinite(tDet) || tDet < 0) throw new RangeError("detection latency must be finite and nonnegative");
    return 1 - Math.exp(-sigmaFI * phi * tDet);
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
  /* Renders DETECTION as the phase-split table rows used on recovery.html and
   * background.html, so both pages read the same numbers from one place. */
  function detectionRows() {
    var d = DETECTION;
    function cell(hidden, of) {
      if (hidden === 0) return "0 of " + of;
      return Math.round((hidden / of) * 100) + "% (" + hidden + " of " + of + ")";
    }
    return "<tr><td>Reset during computation, host reads within milliseconds</td><td>" +
        cell(d.duringComputation.hidden, d.duringComputation.of) + "</td></tr>" +
      "<tr><td>Reset outside computation, host waits " + d.tDetDefault_s + " s for a pulse</td><td>" +
        cell(d.waitingOnPulse.hidden, d.waitingOnPulse.of) + "</td></tr>" +
      "<tr><td>Timeout of 5 or 10 s, not split around detection</td><td>" +
        cell(d.timeout.hidden, d.timeout.of) + "</td></tr>" +
      "<tr><td>Resynchronizing under beam, after detection</td><td>about " +
        Math.round(d.resyncUnderBeam.approx * 100) + "% (" + d.resyncUnderBeam.detail + ")</td></tr>";
  }

  return Object.freeze({
    RELEASE: RELEASE,
    THETA_DEFAULT: THETA_DEFAULT,
    FLUENCE_TARGET_DEFAULT: FLUENCE_TARGET_DEFAULT,
    W_DEFAULT_S: W_DEFAULT_S,
    FLUX_DEFAULT: FLUX_DEFAULT,
    SIGMA_CYC: SIGMA_CYC,
    SIGMA_FI: SIGMA_FI,
    CONFIGS: CONFIGS,
    DETECTION: DETECTION,
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
    hiddenShare: hiddenShare,
    facilitiesAchieving: facilitiesAchieving,
    sci: sci, dur: dur, metric: metric, warnBox: warnBox, detectionRows: detectionRows
  });
});
