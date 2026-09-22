(function () {
  "use strict";
  var S = window.SEE;

  function num(id) { return parseFloat(document.getElementById(id).value); }
  function mark(id, ok) { document.getElementById(id).classList.toggle("invalid", !ok); }
  function pct(x) { return (x * 100).toFixed(1) + "%"; }

  function campaignTable() {
    var byTheta = S.CONFIGS.slice().sort(function (a, b) { return b.theta - a.theta; });
    var byD = S.CONFIGS.slice().sort(function (a, b) { return b.D - a.D; });
    document.getElementById("campaignTable").innerHTML = byTheta.map(function (c) {
      return "<tr><td>" + c.label + "</td><td>" + S.dur(c.W_s) + "</td><td>" + c.theta.toFixed(2) +
        " [" + c.thetaLo.toFixed(2) + ", " + c.thetaHi.toFixed(2) + "]</td><td>" + c.tau_s.toFixed(2) +
        "</td><td>" + c.D.toFixed(2) + "</td><td>" + (byTheta.indexOf(c) + 1) + "</td><td>" + (byD.indexOf(c) + 1) + "</td></tr>";
    }).join("");
  }

  function render() {
    var sigma = num("inputSigma"), W = num("inputW") / 1000, tau = num("inputTau"), tDet = num("inputTDet"),
        fluence = num("inputFluence"), theta = num("inputTheta") / 100;
    var Draw = document.getElementById("inputD").value.trim();
    var Dtarget = Draw === "" ? null : parseFloat(Draw);
    document.getElementById("thetaValue").textContent = Math.round(theta * 100);
    var ok = { inputSigma: sigma > 0, inputW: W > 0, inputTau: tau >= 0, inputTDet: tDet >= 0,
               inputFluence: fluence > 0, inputD: Dtarget === null || (Dtarget > 0 && Dtarget <= 1) };
    Object.keys(ok).forEach(function (k) { mark(k, ok[k]); });
    if (!Object.keys(ok).every(function (k) { return ok[k]; })) return;

    var D = S.dutyFactor(theta, W, tau);
    var charge = S.recoveryCharge(theta, W, tau);
    var flux = S.fluxForW(theta, sigma, W);
    var dutyHtml =
      S.metric("Duty factor at your θ", D.toFixed(3), "", "share of in-cycle plus recovery time that counts", true) +
      S.metric("Test time buying no exposure", pct(1 - D), "", "1 − D") +
      S.metric("Recovery charge (1−θ)τ/W", charge.toFixed(3), "", charge > 0.5 ? "about as long recovering as computing" : "recovery per cycle attempted, in cycle lengths") +
      S.metric("Flux for your W at θ", S.sci(flux), " cm⁻² s⁻¹", "from the first page's rule") +
      S.metric("Time to Φ, beam on", S.dur(S.wallClockTime(flux, fluence)), "", "of which countable exposure is " + pct(D));
    var dutyVerdict = "";
    if (Dtarget !== null) {
      var thetaNeeded = S.thetaForDuty(Dtarget, W, tau);
      if (thetaNeeded >= 1) {
        dutyVerdict = S.warnBox("That duty factor is unreachable at this recovery time.",
          " Even with no lost cycles, D cannot exceed the share of time the cycle itself occupies. Reduce τ or the target.", true);
      } else {
        var fluxNeeded = S.fluxForW(thetaNeeded, sigma, W);
        dutyHtml += S.metric("θ needed for D = " + Dtarget, pct(thetaNeeded), "", "then the rule gives", true) +
          S.metric("Flux for that θ", S.sci(fluxNeeded), " cm⁻² s⁻¹", "at W = " + S.dur(W));
        dutyVerdict = S.warnBox("Target duty factor set.",
          " To keep " + pct(Dtarget) + " of booked time countable at τ = " + tau + " s you need " + pct(thetaNeeded) +
          " of cycles to survive, which at your σ and W means running no more than " + S.sci(fluxNeeded) + " cm⁻² s⁻¹.");
      }
    }
    document.getElementById("dutyVerdict").innerHTML = dutyVerdict;
    document.getElementById("dutyOutputs").innerHTML = dutyHtml;

    var hidden = S.hiddenShare(S.SIGMA_FI.pooled, flux, tDet);
    document.getElementById("hiddenOutputs").innerHTML =
      S.metric("Hidden share at your flux", pct(hidden), "", "1 − exp(−σ_FI φ t_det), an expectation, not a fit", true) +
      S.metric("σ_FI used", S.sci(S.SIGMA_FI.pooled, 2), " cm²", "pooled across five directly comparable builds") +
      S.metric("Flux used", S.sci(flux), " cm⁻² s⁻¹", "from the rule above at your θ and W");
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["inputSigma", "inputW", "inputTau", "inputTDet", "inputD", "inputFluence", "inputTheta"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", render);
    });
    document.getElementById("detectionTable").innerHTML = S.detectionRows();
    campaignTable();
    render();
  });
})();
