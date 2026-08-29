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
    schemaVersion: "flux-primary-design-tool-v1-2026-08-29",
    releaseDate: "2026-08-29",
    status: "operationally_calibrated"
  });

  var W0 = 0.025145;
  var TS = 0.007077;
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

  var CONFIGS = Object.freeze([
    Object.freeze({ id: "FRAM_B1",            label: "FRAM B=1, 16 MHz",        batchSize: 1,   n: 242, burst_s: 551.359, lambda: 0.438916 }),
    Object.freeze({ id: "FRAM_B1_Throttled",  label: "FRAM B=1, 1 MHz",         batchSize: 1,   n: 186, burst_s: 377.9,   lambda: 0.492 }),
    Object.freeze({ id: "SRAM_B1",            label: "SRAM B=1, 16 MHz",        batchSize: 1,   n: 63,  burst_s: 96.725,  lambda: 0.651332 }),
    Object.freeze({ id: "FRAM_B50",           label: "FRAM B=50, 16 MHz",       batchSize: 50,  n: 98,  burst_s: 268.092, lambda: 0.365546 }),
    Object.freeze({ id: "FRAM_B200",          label: "FRAM B=200, 16 MHz",      batchSize: 200, n: 56,  burst_s: 132.659, lambda: 0.422135 }),
    Object.freeze({ id: "SRAM_Mixed_B200",    label: "SRAM/Mixed B=200, 16 MHz",batchSize: 200, n: 142, burst_s: 283.730, lambda: 0.500475 })
  ]);

  var POOLED = Object.freeze([
    Object.freeze({ id: "Pooled_all_six",  label: "Pooled (all six)",      n: 787, burst_s: 1710.482, lambda: 0.460104 }),
    Object.freeze({ id: "Pooled_FRAM16",   label: "Pooled (FRAM 16 MHz)",  n: 396, burst_s: 952.110,  lambda: 0.415918 })
  ]);

  var PILEUP = Object.freeze({
    k: 1.0688e-4,
    tau: 0.4406,
    peakFlux: 21234
  });

  var VALIDATION = Object.freeze([
    Object.freeze({ config: "FRAM_B1",   batchSize: 1,   predicted_ms: 34.666, measured_ms: 43.065, error: -0.195 }),
    Object.freeze({ config: "FRAM_B50",  batchSize: 50,  predicted_ms: 8.774,  measured_ms: 8.181,  error: 0.072 }),
    Object.freeze({ config: "FRAM_B200", batchSize: 200, predicted_ms: 10.542, measured_ms: 9.161,  error: 0.151 })
  ]);

  var CAMPAIGN = Object.freeze({
    episodes: 107,
    admittedVectors: 1303,
    attributedFloor: 50,
    dispositionSensitivity: 167,
    recoveryAttempts: 4623,
    recoveryGroups: 927,
    autoSuccessRate: 0.961,
    medianRecovery_s: 0.165290,
    medianFacilityPause_s: 84.6,
    framSramRatio: 4.30,
    framSramRatioCI: [2.87, 6.40],
    fluxExponent: -0.96,
    pileupR2: 0.37
  });

  function requireFinitePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(name + " must be finite and positive");
  }

  function workCycle(batchSize) {
    requireFinitePositive(batchSize, "batch size");
    return W0 + TS * batchSize;
  }

  function bstarFormula(lambda) {
    requireFinitePositive(lambda, "lambda");
    return (Math.sqrt(2 * W0 / lambda) - W0) / TS;
  }

  function wstarFormula(lambda) {
    requireFinitePositive(lambda, "lambda");
    return Math.sqrt(2 * W0 / lambda);
  }

  function throughput(batchSize, lambda) {
    requireFinitePositive(batchSize, "batch size");
    requireFinitePositive(lambda, "lambda");
    var w = workCycle(batchSize);
    return batchSize * lambda / Math.expm1(lambda * w);
  }

  function costPerResult(batchSize, lambda, recoveryProxy) {
    requireFinitePositive(batchSize, "batch size");
    requireFinitePositive(lambda, "lambda");
    if (recoveryProxy == null) recoveryProxy = 0;
    if (!Number.isFinite(recoveryProxy) || recoveryProxy < 0) throw new RangeError("recovery proxy must be finite and nonnegative");
    var w = workCycle(batchSize);
    return Math.expm1(lambda * w) * (1 / lambda + recoveryProxy) / batchSize;
  }

  function optimalBatchExact(lambda, bMax) {
    if (bMax == null) bMax = 500;
    requireFinitePositive(lambda, "lambda");
    var bestB = 1;
    var bestT = throughput(1, lambda);
    for (var b = 2; b <= bMax; b++) {
      var t = throughput(b, lambda);
      if (t > bestT) { bestT = t; bestB = b; }
    }
    return {
      batch: bestB,
      throughput: bestT,
      workCycle: workCycle(bestB),
      bstarContinuous: bstarFormula(lambda)
    };
  }

  function pileupRate(flux) {
    if (!Number.isFinite(flux) || flux < 0) return 0;
    if (flux === 0) return 0;
    return PILEUP.k * flux * Math.exp(-PILEUP.k * flux * PILEUP.tau);
  }

  function bstarAtFlux(flux) {
    var lambda = pileupRate(flux);
    if (lambda <= 0) return Infinity;
    return bstarFormula(lambda);
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

  function drawCurve(canvasId, options) {
    if (typeof document === "undefined") return;
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var width = canvas.width;
    var height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    if (!options) return;
    var padL = 74, padR = 24, padT = 20, padB = 52;
    var plotW = width - padL - padR;
    var plotH = height - padT - padB;
    var xPixel = function (x) { return padL + ((x - options.xMin) / (options.xMax - options.xMin)) * plotW; };
    var yPixel = function (y) { return padT + plotH - (y / 1.06) * plotH; };
    ctx.strokeStyle = "#eceff3";
    ctx.lineWidth = 1;
    for (var grid = 0; grid <= 5; grid += 1) {
      var gy = padT + plotH * grid / 5;
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + plotW, gy); ctx.stroke();
    }
    ctx.strokeStyle = "#2f6fb0";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (var i = 0; i <= 400; i += 1) {
      var x = options.xMin + (options.xMax - options.xMin) * i / 400;
      var y = options.fn(x) / options.peak;
      if (i === 0) ctx.moveTo(xPixel(x), yPixel(y)); else ctx.lineTo(xPixel(x), yPixel(y));
    }
    ctx.stroke();
    if (options.optAt != null) {
      ctx.strokeStyle = "#1f7a4d";
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(xPixel(options.optAt), yPixel(0)); ctx.lineTo(xPixel(options.optAt), yPixel(1)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#1f7a4d";
      ctx.beginPath(); ctx.arc(xPixel(options.optAt), yPixel(1), 5.5, 0, 2 * Math.PI); ctx.fill();
      ctx.font = "600 12px -apple-system,Segoe UI,Roboto,sans-serif";
      var labelX = xPixel(options.optAt);
      ctx.textAlign = labelX > padL + plotW * 0.65 ? "right" : "left";
      var labelText = options.optLabel || ("B* = " + options.optAt);
      ctx.fillText(labelText, labelX + (ctx.textAlign === "right" ? -9 : 9), yPixel(1) + 4);
    }
    if (options.markers) {
      options.markers.forEach(function (m) {
        var my = options.fn(m.x) / options.peak;
        ctx.fillStyle = m.color || "#a33a30";
        ctx.beginPath(); ctx.arc(xPixel(m.x), yPixel(my), 4, 0, 2 * Math.PI); ctx.fill();
      });
    }
    ctx.fillStyle = "#5c6878";
    ctx.textAlign = "center";
    ctx.font = "400 12px -apple-system,Segoe UI,Roboto,sans-serif";
    for (var tick = 0; tick <= 5; tick += 1) {
      var xv = options.xMin + (options.xMax - options.xMin) * tick / 5;
      ctx.fillText(options.xFormat ? options.xFormat(xv) : String(Math.round(xv)), xPixel(xv), padT + plotH + 19);
    }
    ctx.font = "600 12px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.fillText(options.xLabel || "batch size B", padL + plotW / 2, height - 13);
  }

  return Object.freeze({
    RELEASE: RELEASE,
    W0: W0,
    TS: TS,
    ZERO_EVENT_UPPER_COUNT: ZERO_EVENT_UPPER_COUNT,
    THETA_DEFAULT: THETA_DEFAULT,
    FLUENCE_TARGET_DEFAULT: FLUENCE_TARGET_DEFAULT,
    FACILITIES: FACILITIES,
    CONFIGS: CONFIGS,
    POOLED: POOLED,
    PILEUP: PILEUP,
    VALIDATION: VALIDATION,
    CAMPAIGN: CAMPAIGN,
    GATE_KEYS: GATE_KEYS,
    requiredLambda: requiredLambda,
    cleanFraction: cleanFraction,
    wallClockTime: wallClockTime,
    peakPileupLambda: peakPileupLambda,
    fluxFromLambdaViaPileup: fluxFromLambdaViaPileup,
    facilitiesAchieving: facilitiesAchieving,
    fluxPlan: fluxPlan,
    workCycle: workCycle,
    bstarFormula: bstarFormula,
    wstarFormula: wstarFormula,
    throughput: throughput,
    costPerResult: costPerResult,
    optimalBatchExact: optimalBatchExact,
    pileupRate: pileupRate,
    bstarAtFlux: bstarAtFlux,
    poissonRate95: poissonRate95,
    poisson95: poissonRate95,
    chiSquareQuantile: chiSquareQuantile,
    sci: sci,
    dur: dur,
    metric: metric,
    warnBox: warnBox,
    drawCurve: drawCurve
  });
});
