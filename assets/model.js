/* Flux-primary design-tool model, plus the calibrated batch-size refinement
 * and prospective Poisson helpers.
 *
 * Primary formula: pick a target clean-cycle fraction theta (probability a
 * work cycle of length W completes without an interruption) and a target
 * fluence. That gives a required interruption rate lambda = -ln(theta)/W,
 * which converts to a flux (held fixed for the whole run) and a wall-clock
 * time estimate. Batch size is not part of this: W is whatever an
 * experimenter's own test measures out to, not a device-specific constant.
 *
 * Secondary refinement: for test architectures that DO support a tunable
 * checkpoint interval, B* = (sqrt(2*W0/lambda) - W0) / ts squeezes extra
 * throughput out of a flux already chosen. Operationally calibrated from the
 * 2026 MSU heavy-ion campaign (W0, ts, and per-config lambda below); this
 * reproduces the measured per-delivered-result cost to 7-20% across three
 * tested batch sizes, but it is optional, not the headline result.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SEE = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var RELEASE = Object.freeze({
    schemaVersion: "flux-primary-design-tool-v2-2026-09-11",
    releaseDate: "2026-09-11",
    status: "operationally_calibrated",
    /* v2 corrects the work-cycle constants, the pileup fit, and the recovery cost.
     * v1 ran on W_ms_v1_published (32.223 ms at B=1), the contaminated work-cycle
     * value this project audited and replaced on 2026-09-05. Beam-off LET0 control
     * runs confirm the corrected W to within 1.5% and reject the old one at
     * 1.57-1.98x. Source of record is the RADECS-26 repository, never this one. */
    supersedes: "flux-primary-design-tool-v1-2026-08-29"
  });

  var ZERO_EVENT_UPPER_COUNT = 2.995732273553991;
  var THETA_DEFAULT = 0.80;
  var FLUENCE_TARGET_DEFAULT = 1e7;

  var FACILITIES = Object.freeze([
    Object.freeze({
      id: "LBNL", label: "LBNL 88-Inch Cyclotron (BASE)",
      fluxMin: null, fluxMax: 1e7,
      source: "facility page (cyclotron.lbl.gov/base-rad-effects/heavy-ions)"
    }),
    Object.freeze({
      id: "BNL", label: "BNL Tandem Van de Graaff (SEU Test Facility)",
      fluxMin: 1e2, fluxMax: 1e5,
      source: "facility page (bnl.gov/tandem/capabilities/seu.php)"
    }),
    Object.freeze({
      id: "MSU", label: "MSU NSCL K500/K1200 (SEETF)",
      fluxMin: 7.7e1, fluxMax: 2.5e5,
      source: "peer-reviewed facility-performance paper"
    })
  ]);

  /* Per-configuration measurements at the reference condition (matched flux near
   * 5e4 cm^-2 s^-1, LET 7.9 MeV cm^2/mg).
   *   lambda      logged rate, n_triggers / beam-on seconds. BIASED LOW, see OPTIMISM.
   *   theta       DIRECT COUNT of cycles carrying no recovery episode. Uses neither
   *               lambda nor W, which is what makes it a test of the relation.
   *   thetaLo/Hi  exact 95% Clopper-Pearson interval on that count.
   *   W_s         measured event-free work-cycle time, seconds.
   *   episodesPerLostCycle  restart attempts per destroyed cycle. Exceeds 1 always.
   *   tau_s       MEAN recovery cost per lost cycle (not the median settle).
   *   dutyFactor  D at that tau.
   * Source: RADECS-26 analysis/theta_validation_v3.csv and duty_factor_v3.csv. */
  var CONFIGS = Object.freeze([
    Object.freeze({ id: "FRAM_B1",           label: "FRAM B=1, 16 MHz",         batchSize: 1,   n: 242, burst_s: 551.359, lambda: 0.438916, W_s: 0.019945, theta: 0.984001, thetaLo: 0.981633, thetaHi: 0.986138, episodesPerLostCycle: 1.2222, tau_s: 1.1745, dutyFactor: 0.5067 }),
    Object.freeze({ id: "FRAM_B1_Throttled", label: "FRAM B=1, 1 MHz",          batchSize: 1,   n: 186, burst_s: 377.917, lambda: 0.492171, W_s: 0.045196, theta: 0.964349, thetaLo: 0.958503, thetaHi: 0.969581, episodesPerLostCycle: 1.1625, tau_s: 0.5773, dutyFactor: 0.6626 }),
    Object.freeze({ id: "SRAM_B1",           label: "SRAM B=1, 16 MHz",         batchSize: 1,   n: 63,  burst_s: 96.725,  lambda: 0.651332, W_s: 0.019770, theta: 0.980685, thetaLo: 0.974811, thetaHi: 0.985499, episodesPerLostCycle: 1.1887, tau_s: 1.2564, dutyFactor: 0.4403 }),
    Object.freeze({ id: "FRAM_B50",          label: "FRAM B=50, 16 MHz",        batchSize: 50,  n: 98,  burst_s: 268.092, lambda: 0.365546, W_s: 0.215846, theta: 0.871212, thetaLo: 0.843232, thetaHi: 0.895818, episodesPerLostCycle: 1.1529, tau_s: 0.5865, dutyFactor: 0.6454 }),
    Object.freeze({ id: "FRAM_B200",         label: "FRAM B=200, 16 MHz",       batchSize: 200, n: 56,  burst_s: 132.659, lambda: 0.422135, W_s: 0.814114, theta: 0.533333, thetaLo: 0.414454, thetaHi: 0.649500, episodesPerLostCycle: 1.6000, tau_s: 0.6099, dutyFactor: 0.3952 }),
    Object.freeze({ id: "SRAM_Mixed_B200",   label: "SRAM/Mixed B=200, 16 MHz", batchSize: 200, n: 142, burst_s: 283.730, lambda: 0.500475, W_s: 0.788551, theta: 0.508621, thetaLo: 0.414158, thetaHi: 0.602632, episodesPerLostCycle: 2.4912, tau_s: 1.2791, dutyFactor: 0.2830 })
  ]);

  /* Two kinds of pooled rate, and they answer different questions.
   *   lambdaLogged  n_triggers / beam-on seconds, pooled. What a recovery log gives.
   *                 BIASED LOW: the log counts restart attempts, not destroyed cycles,
   *                 and counts them over beam time, not working time.
   *   lambdaFitted  one rate fitted to the MEASURED clean-cycle fractions across builds
   *                 whose work cycle spans 41-fold. This validates the exponential form
   *                 (G2 = 7.08, df = 5, p = 0.22, with power to reject a shape departure
   *                 of a quarter on essentially every trial).
   * lambdaFitted CANNOT be computed prospectively: it needs measured theta at several
   * cycle lengths, so it is never a design input. Use it to justify the form, not to
   * plan a campaign.
   * Source: theta_validation_v3.csv; survival_shape_power_v1.json. */
  var POOLED = Object.freeze([
    Object.freeze({ id: "Pooled_all_six", label: "Pooled (all six)", n: 787, burst_s: 1710.482,
      lambda: 0.460104, lambdaLogged: 0.460104,
      lambdaFitted: 0.791623, lambdaFittedCI: Object.freeze([0.729192, 0.857540]),
      G2: 7.0755, df: 5, pValue: 0.2151 }),
    Object.freeze({ id: "Pooled_FRAM16", label: "Pooled (FRAM 16 MHz)", n: 396, burst_s: 952.110,
      lambda: 0.415918, lambdaLogged: 0.415918,
      lambdaFitted: 0.751298, lambdaFittedCI: Object.freeze([0.671600, 0.837100]),
      G2: 3.4309, df: 2, pValue: 0.1799 })
  ]);

  /* Paralyzable dead-time model (Knoll, Radiation Detection and Measurement):
   *   lambda(phi) = k*phi*exp(-k*phi*tau_d),  peak at phi* = 1/(k*tau_d).
   * Fitted per LET group by RADECS-26 analysis/build_pileup_let_stratified_fit.py.
   * These are the LET 2.3-4.1 group, the only one tested far enough past its own
   * peak to validate the shape (R2 = 0.941, leave-one-out moves the peak <= 3.6%).
   * tau_d is MEASURED (occurrence-weighted mean recovery duration), not fitted;
   * only k is fitted. That is why recovery speed moves the ceiling directly.
   * v1 used a pooled 35-run fit in which LET and flux were confounded (R2 = 0.386);
   * that fit was withdrawn. */
  var PILEUP_K = 1.15653e-4;
  var PILEUP_TAU_D = 0.33185;
  var PILEUP = Object.freeze({
    k: PILEUP_K,
    tau: PILEUP_TAU_D,
    peakFlux: 1 / (PILEUP_K * PILEUP_TAU_D),
    r2: 0.941,
    letGroup: "2.3-4.1 MeV cm^2/mg",
    source: "build_pileup_let_stratified_fit.py"
  });

  /* Optimism factor: a rate taken from a recovery log predicts more surviving
   * cycles than occur. Measured as the ratio of predicted to measured
   * work-cycles-per-lost-cycle, geometric mean over the six comparison builds.
   * Source: RADECS-26 analysis/rate_accounting_factors_v1.json, bootstrap
   * 20,000 draws. Apply this when lambda comes from a log rather than from a
   * direct count of clean cycles. */
  var OPTIMISM = Object.freeze({
    factor: 1.6252846011009234,
    ci95: Object.freeze([1.451655259041007, 1.8456599186430174]),
    basis: "predicted / measured work cycles per lost cycle"
  });

  var CAMPAIGN = Object.freeze({
    recoveryAttempts: 4623,
    recoveryGroups: 927,
    /* Success scored against the next work cycle the device actually delivered.
     * The handshake-based criterion both pipelines originally used cannot fail,
     * because the handshake fires on any restart whether or not the application
     * returns. 0.953 is the automatic path on cases the device had a chance to
     * prove; 0.714 scores every censored case as a failure. */
    autoSuccessRate: 0.953,
    autoSuccessRateCensoredAsFailure: 0.714,
    manualSuccessRate: 0.964,
    /* The recovery-duration distribution has two populations. The median is the
     * programmed settle and is blind to the tail that carries the cost. A duty
     * factor needs the mean. Reference runs, n = 794 episodes. */
    medianRecovery_s: 0.165,
    meanRecovery_s: 0.680,
    autoFailureShare: 0.047,
    autoFailureShareOfRecoveryTime: 0.47,
    medianFacilityPause_s: 84.6,
    fluxExponent: -1.0,
    pileupR2: 0.941,
    /* Three event counts exist and must never be conflated, in descending order:
     * device resets > host-detected recovery episodes > destroyed work cycles.
     * FRAM_B1: 298 > 242 > 198. CONFIGS.lambda uses the middle one. */
    eventCountHierarchy: Object.freeze({
      deviceResets: Object.freeze([298, 63, 238, 115, 204, 73]),
      hostEpisodes: Object.freeze([242, 63, 186, 98, 142, 56]),
      destroyedCycles: Object.freeze([198, 53, 160, 85, 57, 35]),
      order: "FRAM_B1, SRAM_B1, FRAM_B1_Throttled, FRAM_B50, SRAM_Mixed_B200, FRAM_B200"
    })
  });

  function requireFinitePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(name + " must be finite and positive");
  }

  function pileupRate(flux) {
    if (!Number.isFinite(flux) || flux < 0) return 0;
    if (flux === 0) return 0;
    return PILEUP.k * flux * Math.exp(-PILEUP.k * flux * PILEUP.tau);
  }

  /* --- Flux-primary formula: theta (clean-cycle fraction) + W (measured,
   * fixed work-cycle time) + target fluence -> required flux + wall time.
   * W here is whatever an experimenter's own bench measurement gives; it is
   * not assumed to decompose into W0 + B*ts the way the batch-size
   * refinement above does. */

  function requiredLambda(theta, W) {
    if (!(theta > 0 && theta < 1)) throw new RangeError("clean-cycle fraction must be strictly between 0 and 1");
    requireFinitePositive(W, "work-cycle time");
    return -Math.log(theta) / W;
  }

  function cleanFraction(lambda, W) {
    requireFinitePositive(lambda, "lambda");
    requireFinitePositive(W, "work-cycle time");
    return Math.exp(-lambda * W);
  }

  function wallClockTime(flux, fluenceTarget) {
    requireFinitePositive(flux, "flux");
    requireFinitePositive(fluenceTarget, "fluence target");
    return fluenceTarget / flux;
  }

  /* --- Recovery extension. Charges a test for the time it spends recovering.
   * D is the share of test time that becomes countable exposure. Setting tau = 0
   * returns D = theta, recovering the published flux-selection relation
   * (Zimmaro et al., RADECS 2022), so this extends that work rather than
   * replacing it. tau is the MEAN cost per lost cycle, not a median. */

  function dutyFactor(theta, W, tau) {
    if (!(theta > 0 && theta <= 1)) throw new RangeError("clean-cycle fraction must lie in (0,1]");
    requireFinitePositive(W, "work-cycle time");
    if (tau == null) tau = 0;
    if (!Number.isFinite(tau) || tau < 0) throw new RangeError("recovery cost must be finite and nonnegative");
    return theta * W / (W + (1 - theta) * tau);
  }

  function thetaForDuty(D, W, tau) {
    if (!(D > 0 && D <= 1)) throw new RangeError("duty factor must lie in (0,1]");
    requireFinitePositive(W, "work-cycle time");
    if (tau == null) tau = 0;
    if (!Number.isFinite(tau) || tau < 0) throw new RangeError("recovery cost must be finite and nonnegative");
    return D * (W + tau) / (W + D * tau);
  }

  /* A rate read off a recovery log predicts fewer lost cycles than occur. Scale
   * the predicted loss by the measured optimism factor. Returns the corrected
   * clean-cycle fraction together with its interval, and never returns a value
   * outside (0,1). */
  function correctLoggedTheta(thetaFromLog) {
    if (!(thetaFromLog > 0 && thetaFromLog < 1)) throw new RangeError("theta must be strictly between 0 and 1");
    var apply = function (f) {
      var loss = (1 - thetaFromLog) * f;
      return loss >= 1 ? 0 : 1 - loss;
    };
    return {
      theta: apply(OPTIMISM.factor),
      thetaLow: apply(OPTIMISM.ci95[1]),
      thetaHigh: apply(OPTIMISM.ci95[0]),
      factor: OPTIMISM.factor,
      note: "logged rates count restart attempts over beam time, not destroyed cycles over working time"
    };
  }

  /* Where the counted rate peaks, given how long the device stays down. This is
   * the ceiling on usable flux, and it moves inversely with recovery time. */
  function pileupPeakFlux(tau_d, k) {
    if (tau_d == null) tau_d = PILEUP.tau;
    if (k == null) k = PILEUP.k;
    requireFinitePositive(tau_d, "dead time");
    requireFinitePositive(k, "rate per unit flux");
    return 1 / (k * tau_d);
  }

  function peakPileupLambda() {
    return pileupRate(PILEUP.peakFlux);
  }

  function fluxFromLambdaViaPileup(targetLambda) {
    requireFinitePositive(targetLambda, "target lambda");
    var peak = peakPileupLambda();
    if (targetLambda >= peak) {
      /* The quality target never binds anywhere in the achievable range for
       * this device: even the pileup peak's interruption rate satisfies it.
       * The real ceiling here is pileup fidelity, not the clean-cycle
       * target, so the honest answer is "as high as the fidelity ceiling
       * allows," not "impossible." */
      return { flux: PILEUP.peakFlux, qualityBinding: false };
    }
    var lo = 0, hi = PILEUP.peakFlux;
    for (var i = 0; i < 100; i += 1) {
      var mid = 0.5 * (lo + hi);
      if (pileupRate(mid) < targetLambda) lo = mid; else hi = mid;
    }
    return { flux: 0.5 * (lo + hi), qualityBinding: true };
  }

  function facilitiesAchieving(flux) {
    requireFinitePositive(flux, "flux");
    return FACILITIES.filter(function (f) {
      var minOk = f.fluxMin == null || flux >= f.fluxMin;
      var maxOk = f.fluxMax == null || flux <= f.fluxMax;
      return minOk && maxOk;
    });
  }

  function fluxPlan(theta, W, fluenceTarget) {
    var lambdaTarget = requiredLambda(theta, W);
    var solved = fluxFromLambdaViaPileup(lambdaTarget);
    var plan = {
      theta: theta,
      W: W,
      fluenceTarget: fluenceTarget,
      lambdaTarget: lambdaTarget,
      flux: solved.flux,
      qualityBinding: solved.qualityBinding,
      wallClock_s: wallClockTime(solved.flux, fluenceTarget),
      facilities: facilitiesAchieving(solved.flux)
    };
    return plan;
  }

  /* --- Poisson / Garwood machinery (unchanged) --- */

  var GATE_KEYS = Object.freeze([
    "poissonEligible",
    "physicalCrossSectionEligible",
    "independenceEstablished",
    "numeratorAvailable",
    "denominatorAvailable",
    "unitWindowCompatible",
    "opportunityObserved"
  ]);

  function failedGates(gates) {
    if (!gates || typeof gates !== "object") throw new TypeError("eligibility gates must be an object");
    return GATE_KEYS.filter(function (key) {
      if (typeof gates[key] !== "boolean") throw new TypeError("eligibility gate " + key + " must be boolean");
      return !gates[key];
    });
  }

  function logGamma(z) {
    var p = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = p[0];
    for (var i = 1; i < p.length; i += 1) x += p[i] / (z + i);
    var t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function regularizedGammaP(a, x) {
    if (!(a > 0) || x < 0 || !Number.isFinite(a) || !Number.isFinite(x)) throw new RangeError("invalid incomplete-gamma arguments");
    if (x === 0) return 0;
    var eps = 1e-14;
    var maxIter = 100000;
    var i;
    if (x < a + 1) {
      var ap = a;
      var sum = 1 / a;
      var delta = sum;
      for (i = 1; i <= maxIter; i += 1) {
        ap += 1;
        delta *= x / ap;
        sum += delta;
        if (Math.abs(delta) <= Math.abs(sum) * eps) break;
      }
      if (i > maxIter) throw new Error("incomplete-gamma series did not converge");
      return Math.min(1, Math.max(0, sum * Math.exp(-x + a * Math.log(x) - logGamma(a))));
    }
    var tiny = 1e-300;
    var b = x + 1 - a;
    var c = 1 / tiny;
    var d = 1 / Math.max(Math.abs(b), tiny) * (b < 0 ? -1 : 1);
    var h = d;
    for (i = 1; i <= maxIter; i += 1) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < tiny) d = tiny;
      c = b + an / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      var change = d * c;
      h *= change;
      if (Math.abs(change - 1) <= eps) break;
    }
    if (i > maxIter) throw new Error("incomplete-gamma continued fraction did not converge");
    var q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
    return Math.min(1, Math.max(0, 1 - q));
  }

  function chiSquareQuantile(probability, degreesOfFreedom) {
    if (!(probability > 0 && probability < 1)) throw new RangeError("chi-square probability must lie in (0,1)");
    requireFinitePositive(degreesOfFreedom, "chi-square degrees of freedom");
    var a = degreesOfFreedom / 2;
    var lo = 0;
    var hi = Math.max(1, degreesOfFreedom);
    while (regularizedGammaP(a, hi / 2) < probability) hi *= 2;
    for (var i = 0; i < 120; i += 1) {
      var mid = 0.5 * (lo + hi);
      if (regularizedGammaP(a, mid / 2) < probability) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function withheld(failed) {
    return {
      kind: "ineligible",
      estimate: null, lower: null, upper: null, upperLimit: null,
      pointEstimate: null, ci95Lower: null, ci95Upper: null,
      zeroEventUpperLimit: null,
      intervalConvention: "not_applied",
      releaseStatus: "withheld:" + (failed.length ? failed.join(",") : "not_releasable"),
      failedGates: failed.slice()
    };
  }

  function poissonRate95(count, exposure, gates) {
    if (count !== null && (typeof count === "boolean" || !Number.isInteger(count) || count < 0)) {
      throw new TypeError("event count must be a nonnegative integer");
    }
    var failed = failedGates(gates);
    if (failed.length) return withheld(failed);
    if (count === null) throw new RangeError("an eligible result requires an available event count");
    if (!Number.isFinite(exposure) || exposure <= 0) throw new RangeError("an eligible result requires a finite positive exposure");
    if (count === 0) {
      return {
        kind: "one_sided_upper_limit_95",
        estimate: null, lower: null, upper: null,
        upperLimit: ZERO_EVENT_UPPER_COUNT / exposure,
        pointEstimate: null, ci95Lower: null, ci95Upper: null,
        zeroEventUpperLimit: ZERO_EVENT_UPPER_COUNT / exposure,
        intervalConvention: "one_sided_95_percent_zero_event_upper_limit",
        releaseStatus: "released_upper_limit",
        failedGates: []
      };
    }
    var lowerCount = 0.5 * chiSquareQuantile(0.025, 2 * count);
    var upperCount = 0.5 * chiSquareQuantile(0.975, 2 * (count + 1));
    return {
      kind: "two_sided_garwood_95",
      estimate: count / exposure, lower: lowerCount / exposure, upper: upperCount / exposure,
      upperLimit: null,
      pointEstimate: count / exposure, ci95Lower: lowerCount / exposure, ci95Upper: upperCount / exposure,
      zeroEventUpperLimit: null,
      intervalConvention: "two_sided_exact_95_percent_garwood",
      releaseStatus: "released_two_sided_interval",
      failedGates: []
    };
  }

  /* --- Formatting / drawing helpers --- */

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
    if (seconds < 1) return (seconds * 1000).toFixed(3).replace(/\.?0+$/, "") + " ms";
    return seconds.toFixed(6).replace(/\.?0+$/, "") + " s";
  }

  function metric(label, value, unit, sub, hero) {
    return '<div class="metric' + (hero ? " hero" : "") + '"><div class="k">' + label +
      '</div><div class="v">' + value + (unit ? "<small>" + unit + "</small>" : "") +
      "</div>" + (sub ? '<div class="sub">' + sub + "</div>" : "") + "</div>";
  }

  function warnBox(title, body, bad) {
    return '<div class="warnbox' + (bad ? " bad" : "") + '"><b>' + title + "</b>" + body + "</div>";
  }

  return Object.freeze({
    RELEASE: RELEASE,
    ZERO_EVENT_UPPER_COUNT: ZERO_EVENT_UPPER_COUNT,
    THETA_DEFAULT: THETA_DEFAULT,
    FLUENCE_TARGET_DEFAULT: FLUENCE_TARGET_DEFAULT,
    FACILITIES: FACILITIES,
    CONFIGS: CONFIGS,
    POOLED: POOLED,
    PILEUP: PILEUP,
    OPTIMISM: OPTIMISM,
    CAMPAIGN: CAMPAIGN,
    GATE_KEYS: GATE_KEYS,
    requiredLambda: requiredLambda,
    cleanFraction: cleanFraction,
    dutyFactor: dutyFactor,
    thetaForDuty: thetaForDuty,
    correctLoggedTheta: correctLoggedTheta,
    pileupPeakFlux: pileupPeakFlux,
    wallClockTime: wallClockTime,
    peakPileupLambda: peakPileupLambda,
    fluxFromLambdaViaPileup: fluxFromLambdaViaPileup,
    facilitiesAchieving: facilitiesAchieving,
    fluxPlan: fluxPlan,
    pileupRate: pileupRate,
    poissonRate95: poissonRate95,
    chiSquareQuantile: chiSquareQuantile,
    sci: sci,
    dur: dur,
    metric: metric,
    warnBox: warnBox
  });
});
