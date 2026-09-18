(function () {
  "use strict";
  var S = window.SEE;

  function readInputs() {
    return {
      W_s: parseFloat(document.getElementById("inputW").value) / 1000,
      fluence: parseFloat(document.getElementById("inputFluence").value),
      theta: parseFloat(document.getElementById("inputTheta").value) / 100
    };
  }

  function facilityList(facilities) {
    if (!facilities.length) return "none of the sourced facilities reach this flux";
    return facilities.map(function (f) { return f.label; }).join(", ");
  }

  function render() {
    var input = readInputs();
    document.getElementById("thetaValue").textContent = Math.round(input.theta * 100);
    if (!(input.W_s > 0) || !(input.fluence > 0) || !(input.theta > 0 && input.theta < 1)) return;

    var lambdaTarget = S.requiredLambda(input.theta, input.W_s);
    document.getElementById("formulaOutputs").innerHTML =
      S.metric("Required &lambda;", lambdaTarget.toFixed(6), " s⁻¹", "interruption rate to pilot toward", true) +
      S.metric("Work-cycle time W", S.dur(input.W_s), "", "as entered above") +
      S.metric("Target clean-cycle fraction &theta;", Math.round(input.theta * 100) + "%", "", "P(cycle completes uninterrupted)");

    var plan = S.fluxPlan(input.theta, input.W_s, input.fluence);
    document.getElementById("exampleOutputs").innerHTML =
      S.metric("Recommended flux", S.sci(plan.flux), " cm⁻² s⁻¹", plan.qualityBinding ? "set by your &theta; target" : "capped by pileup fidelity, not your &theta; target", true) +
      S.metric("Wall-clock time to &Phi;", S.dur(plan.wallClock_s), "", (plan.wallClock_s / 60).toFixed(1) + " min") +
      S.metric("Achievable at", facilityList(plan.facilities), "", "of the sourced facilities (LBNL, BNL, MSU — see " + '<a href="validation.html">Campaign evidence</a>' + ")");

    document.getElementById("qualityNote").innerHTML = plan.qualityBinding
      ? S.warnBox("Your quality target is the binding constraint.", "This device can't sustain that much interruption at any achievable flux, so &theta; sets the ceiling directly.")
      : S.warnBox("Your quality target isn't binding for this device at this W.", "Even at the pileup peak, clean-cycle fraction stays above your target — the real ceiling here is pileup fidelity (see Model &amp; caveats), not crash risk.");

    var thetas = [0.5, 0.7, 0.8, 0.9, 0.95];
    document.getElementById("thetaSweepTable").innerHTML = thetas.map(function (t) {
      var lam = S.requiredLambda(t, input.W_s);
      var p = S.fluxPlan(t, input.W_s, input.fluence);
      return "<tr><td>" + Math.round(t * 100) + "%</td><td>" + lam.toFixed(4) + " s⁻¹</td><td>" +
        S.sci(p.flux) + " cm⁻² s⁻¹</td><td>" + (p.qualityBinding ? "quality target" : "pileup fidelity") +
        "</td><td>" + S.dur(p.wallClock_s) + "</td></tr>";
    }).join("");

    var C = S.CAMPAIGN;
    var thetas_m = S.CONFIGS.map(function (c) { return c.theta; });
    var duties = S.CONFIGS.map(function (c) { return c.dutyFactor; });
    var taus = S.CONFIGS.map(function (c) { return c.tau_s; });
    var fmtRange = function (a, fixed) {
      return Math.min.apply(null, a).toFixed(fixed) + "–" + Math.max.apply(null, a).toFixed(fixed);
    };
    document.getElementById("campaignMetrics").innerHTML =
      S.metric("Measured clean-cycle fraction", fmtRange(thetas_m, 2), "",
        "direct count over six builds, work cycle varied 41-fold") +
      S.metric("Logged rates run optimistic by", "×" + S.OPTIMISM.factor.toFixed(2), "",
        "[" + S.OPTIMISM.ci95[0].toFixed(2) + ", " + S.OPTIMISM.ci95[1].toFixed(2) + "] on cycles per lost cycle") +
      S.metric("Recovery cost per lost cycle", fmtRange(taus, 2), "s",
        "mean, not the " + S.dur(C.medianRecovery_s) + " programmed settle") +
      S.metric("Test time yielding countable exposure", fmtRange(duties, 2), "",
        "duty factor D at the measured recovery cost") +
      S.metric("Pileup ceiling", S.sci(S.PILEUP.peakFlux), "cm⁻² s⁻¹",
        "below the " + S.sci(5e4) + " these builds ran at; moves as 1/τ_d") +
      S.metric("Automatic recovery restored function", (C.autoSuccessRate * 100).toFixed(1) + "%", "",
        "scored on delivered work; " + (C.autoSuccessRateCensoredAsFailure * 100).toFixed(1) + "% if every censored case is a failure");
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["inputW", "inputFluence", "inputTheta"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", render);
    });
    render();
  });
})();
