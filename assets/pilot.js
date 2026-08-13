/* Pilot-run calculator for the unknown-cross-section page.
 *
 * Turns two counts anyone can take during a short pilot run, interrupts
 * observed and work cycles attempted, into the operating point x and a flux
 * scaling recommendation, without ever needing sigma_SEFI in advance.
 * sigma_SEFI falls out as a by-product.
 */
(function () {
  "use strict";
  var S = window.SEE;
  var IDS = ["pInt", "pCyc", "pPhi", "pW", "pTarget"];
  var read;

  // Exact Poisson (Garwood) interval for a count, used on the interrupt count.
  function poissonLo(n) {
    if (n === 0) return 0;
    // Wilson-Hilferty approximation to the chi-square quantile, adequate here.
    var a = n, z = 1.959964;
    return a * Math.pow(1 - 1 / (9 * a) - z / (3 * Math.sqrt(a)), 3);
  }
  function poissonHi(n) {
    var a = n + 1, z = 1.959964;
    return a * Math.pow(1 - 1 / (9 * a) + z / (3 * Math.sqrt(a)), 3);
  }

  function update() {
    var el = document.getElementById("pilotOut");
    var wEl = document.getElementById("pilotWarn");
    var v = read();
    if (!v) {
      el.innerHTML = '<p class="help">Enter positive values above.</p>';
      wEl.innerHTML = ""; return;
    }
    var xObs = v.pInt / v.pCyc;
    var sig  = xObs / (v.pPhi * (v.pW / 1000));
    var scale = v.pTarget / xObs;
    var phiNew = v.pPhi * scale;

    var xLo = poissonLo(v.pInt) / v.pCyc, xHi = poissonHi(v.pInt) / v.pCyc;

    el.innerHTML =
      S.metric("Observed interrupts per cycle, x", xObs.toFixed(4), "",
        "95% interval " + xLo.toFixed(4) + " to " + xHi.toFixed(4), true) +
      S.metric("Recommended flux", S.sci(phiNew), " cm⁻²s⁻¹",
        (scale >= 1 ? "increase by " + scale.toFixed(1) + "×" : "reduce by " + (1 / scale).toFixed(1) + "×"), true) +
      S.metric("Implied σ_SEFI", S.sci(sig), " cm²", "free by-product: x / (φ·W)") +
      S.metric("Cycles surviving now", S.pct(Math.exp(-xObs)), "", "at the pilot flux") +
      S.metric("Cycles surviving at target", S.pct(Math.exp(-v.pTarget)), "", "after scaling") +
      S.metric("Interrupt rate now", S.sci(v.pPhi * sig), " s⁻¹", "λ = φ σ");

    var w = [];
    if (v.pInt < 20) {
      w.push(["Too few interrupts for a reliable estimate",
        "You have " + v.pInt + ". The 95% interval on x spans " + xLo.toFixed(4) + " to " + xHi.toFixed(4) +
        ", a factor of " + (xHi / Math.max(xLo, 1e-9)).toFixed(1) + ". Run the pilot longer, aiming for at " +
        "least 20 to 30 interrupts, before scaling flux."]);
    }
    if (scale > 5) {
      w.push(["Large jump recommended",
        "Scaling flux by " + scale.toFixed(1) + "× in one step will overshoot if σ_SEFI is not constant with " +
        "flux, which is exactly what happens as a device approaches sustained interrupt clustering. Step up " +
        "in factors of two or three and recount x at each stop.", true]);
    }
    if (xObs > 1) {
      w.push(["Pilot is already over-driven",
        "More than one interrupt is expected per work cycle, so most cycles never complete. Reduce flux " +
        "rather than increase it, whatever the target says.", true]);
    }
    wEl.innerHTML = w.map(function (a) { return S.warnBox(a[0], a[1], a[2]); }).join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    read = S.bindInputs(IDS, update);
    update();
  });
})();
