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
    document.getElementById("campaignMetrics").innerHTML =
      S.metric("Manifestation episodes", String(C.episodes), "", "Tier 1+2 primary (attributed OR clean-context)") +
      S.metric("Admitted vectors", String(C.admittedVectors).replace(/\B(?=(\d{3})+(?!\d))/g, ","), "", "from " + C.episodes + " contiguous episodes") +
      S.metric("Automatic SEFI recovery", (C.autoSuccessRate * 100).toFixed(1) + "%", "", "median " + S.dur(C.medianRecovery_s) + "; escalation drives facility cost") +
      S.metric("FRAM/SRAM rate ratio", C.framSramRatio.toFixed(2), "", "[" + C.framSramRatioCI[0].toFixed(2) + ", " + C.framSramRatioCI[1].toFixed(2) + "] 95% CI") +
      S.metric("Flux exponent", "σ ∝ φ" + S.sci(C.fluxExponent, 2).replace("×10", ""), "", "paralyzable pileup, not saturation");
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["inputW", "inputFluence", "inputTheta"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", render);
    });
    render();
  });
})();
