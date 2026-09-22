(function () {
  "use strict";
  var S = window.SEE;

  function num(id) { return parseFloat(document.getElementById(id).value); }
  function mark(id, ok) { document.getElementById(id).classList.toggle("invalid", !ok); }

  function facilityList(f) {
    if (!f.length) return "none of the sourced facilities";
    return f.map(function (x) { return x.label; }).join("; ");
  }

  function render() {
    var sigma = num("inputSigma"), W = num("inputW") / 1000, phi = num("inputFlux"),
        fluence = num("inputFluence"), theta = num("inputTheta") / 100;
    document.getElementById("thetaValue").textContent = Math.round(theta * 100);
    var ok = { inputSigma: sigma > 0, inputW: W > 0, inputFlux: phi > 0, inputFluence: fluence > 0 };
    Object.keys(ok).forEach(function (k) { mark(k, ok[k]); });
    if (!(ok.inputSigma && ok.inputW && ok.inputFlux && ok.inputFluence)) return;

    var product = S.frontierProduct(theta, sigma);
    var fluxForW = S.fluxForW(theta, sigma, W);
    var Wmax = S.longestW(theta, sigma, phi);
    var thetaAtPlan = S.cleanFraction(sigma, phi, W);
    var T = S.wallClockTime(fluxForW, fluence);

    var v = document.getElementById("verdict");
    if (phi > fluxForW * 1.001) {
      v.innerHTML = S.warnBox("Your planned flux is above the rule.",
        " At " + S.sci(phi) + " cm⁻² s⁻¹ and W = " + S.dur(W) + ", " + (thetaAtPlan * 100).toFixed(1) +
        "% of cycles survive, below your " + Math.round(theta * 100) + "% target. Lower the flux to " +
        S.sci(fluxForW) + " or shorten the cycle to " + S.dur(Wmax) + ".", true);
    } else {
      v.innerHTML = S.warnBox("Your planned flux is within the rule.",
        " At " + S.sci(phi) + " cm⁻² s⁻¹ and W = " + S.dur(W) + ", " + (thetaAtPlan * 100).toFixed(1) +
        "% of cycles survive. You could run up to " + S.sci(fluxForW) + " and still meet your target.");
    }

    document.getElementById("outputs").innerHTML =
      S.metric("Flux for your work cycle", S.sci(fluxForW), " cm⁻² s⁻¹", "highest flux that meets θ at W = " + S.dur(W), true) +
      S.metric("Longest work cycle at your flux", S.dur(Wmax), "", "at " + S.sci(phi) + " cm⁻² s⁻¹", true) +
      S.metric("Fluence per cycle φW", S.sci(product), " cm⁻²", "the same for every pair on the rule") +
      S.metric("θ at your planned flux and W", (thetaAtPlan * 100).toFixed(1) + "%", "", "what you would get as entered") +
      S.metric("Time to Φ at the flux for your W", S.dur(T), "", S.sci(fluence) + " cm⁻² at " + S.sci(fluxForW)) +
      S.metric("Facilities reaching that flux", facilityList(S.facilitiesAchieving(fluxForW)), "", "sourced ranges, see the evidence page");

    document.getElementById("sweep").innerHTML = [0.5, 0.7, 0.8, 0.9, 0.95, 0.99].map(function (t) {
      var p = S.frontierProduct(t, sigma), f = S.fluxForW(t, sigma, W);
      return "<tr><td>" + Math.round(t * 100) + "%</td><td>" + S.sci(p) + "</td><td>" + S.sci(f) +
        " cm⁻² s⁻¹</td><td>" + S.dur(S.longestW(t, sigma, phi)) + "</td><td>" + S.dur(S.wallClockTime(f, fluence)) + "</td></tr>";
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["inputSigma", "inputW", "inputFlux", "inputFluence", "inputTheta"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", render);
    });
    render();
  });
})();
