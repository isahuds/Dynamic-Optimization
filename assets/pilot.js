/* Prospective seven-gate Poisson reporting calculator.
 * The current campaign observables fail these gates; this UI is for a future
 * measurement whose numerator and denominator contract is established first.
 */
(function () {
  "use strict";
  var S = window.SEE;
  var LABELS = {
    poissonEligible: "Poisson event process is eligible",
    physicalCrossSectionEligible: "physical cross-section interpretation is eligible",
    independenceEstablished: "event independence is established",
    numeratorAvailable: "numerator is available",
    denominatorAvailable: "denominator is available",
    unitWindowCompatible: "event unit and exposure window are compatible",
    opportunityObserved: "an observation opportunity actually occurred"
  };

  function gates() {
    var out = {};
    S.GATE_KEYS.forEach(function (key) {
      out[key] = document.getElementById("gate-" + key).checked;
    });
    return out;
  }

  function update() {
    var countElement = document.getElementById("eventCount");
    var exposureElement = document.getElementById("exposure");
    var countText = countElement.value.trim();
    var exposureText = exposureElement.value.trim();
    var count = countText === "" ? null : Number(countText);
    var exposure = exposureText === "" ? null : Number(exposureText);
    var countBad = count !== null && (!Number.isInteger(count) || count < 0);
    countElement.classList.toggle("invalid", countBad);
    exposureElement.classList.remove("invalid");
    if (countBad) {
      document.getElementById("poissonOut").innerHTML = '<p class="help">Event count must be a nonnegative integer or blank when the numerator is unavailable.</p>';
      document.getElementById("poissonStatus").innerHTML = "";
      return;
    }

    var result;
    try {
      result = S.poissonRate95(count, exposure, gates());
    } catch (error) {
      exposureElement.classList.toggle("invalid", /exposure/.test(error.message));
      countElement.classList.toggle("invalid", /count/.test(error.message));
      document.getElementById("poissonOut").innerHTML = '<p class="help">' + error.message + ".</p>";
      document.getElementById("poissonStatus").innerHTML = "";
      return;
    }

    var pointSub = result.releaseStatus === "released_upper_limit" ? "not reported for an eligible zero-event result" : "n / Φ";
    var intervalValue = result.ci95Lower == null ? "—" : "[" + S.sci(result.ci95Lower) + ", " + S.sci(result.ci95Upper) + "]";
    var upperSub = result.releaseStatus === "released_upper_limit" ? "one-sided 95%; 2.995732273553991 / Φ" : "not applicable";
    document.getElementById("poissonOut").innerHTML =
      S.metric("Point estimate", S.sci(result.pointEstimate), " cm²", pointSub, result.pointEstimate != null) +
      S.metric("Two-sided exact 95% Garwood interval", intervalValue, " cm²", result.ci95Lower == null ? "not reported" : "positive count only") +
      S.metric("Zero-event upper limit", S.sci(result.zeroEventUpperLimit), " cm²", upperSub, result.zeroEventUpperLimit != null) +
      S.metric("Release status", result.releaseStatus, "", result.intervalConvention);

    if (result.failedGates.length) {
      document.getElementById("poissonStatus").innerHTML = S.warnBox(
        "Numerical fields withheld",
        "Failed gates: " + result.failedGates.map(function (key) { return LABELS[key]; }).join("; ") + ". An unavailable or no-opportunity denominator is not a zero-event exposure and receives no limit.",
        true
      );
    } else if (result.releaseStatus === "released_upper_limit") {
      document.getElementById("poissonStatus").innerHTML = S.warnBox(
        "Eligible zero-event result",
        "Only the conventional one-sided 95% upper limit is reported. There is no σ=0 point estimate and no two-sided interval."
      );
    } else {
      document.getElementById("poissonStatus").innerHTML = S.warnBox(
        "Eligible positive-count result",
        "The point estimate and exact two-sided 95% Garwood interval are reported. Systematic fluence and LET uncertainty remain separate inputs to the scientific result."
      );
    }
  }

  function init() {
    ["eventCount", "exposure"].concat(S.GATE_KEYS.map(function (key) { return "gate-" + key; })).forEach(function (id) {
      var element = document.getElementById(id);
      element.addEventListener("input", update);
      element.addEventListener("change", update);
    });
    update();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
