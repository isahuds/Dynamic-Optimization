/* Main calculator page. Uses the shared model in model.js. */
(function () {
  "use strict";
  var S = window.SEE;
  var IDS = ["phi", "sigSefi", "sigCirc", "W", "f", "R", "Ntarget"];
  var read;

  function update() {
    var v = read();
    var verdictEl = document.getElementById("verdict");
    var nowEl = document.getElementById("metricsNow");
    var optEl = document.getElementById("metricsOpt");
    var warnEl = document.getElementById("warnings");

    if (!v) {
      verdictEl.className = "verdict bad";
      verdictEl.innerHTML = "<strong>Check your inputs.</strong> Every value must be a positive " +
        "number, and targeting efficiency <em>f</em> must be between 0 and 1.";
      nowEl.innerHTML = optEl.innerHTML = warnEl.innerHTML = "";
      S.drawCurve("chart", null);
      return;
    }

    var x    = v.phi * v.sigSefi * v.W;
    var Rnow = S.effectiveR(v.phi, v.sigSefi, v.R, v.exposed);
    var rho  = Rnow / v.W;

    var phiEffNow = S.rate(v.phi, v);
    var rateNow   = phiEffNow * v.sigCirc;
    var tNow      = v.Ntarget / rateNow;

    var pFail    = 1 - Math.exp(-x);
    var lostFrac = isFinite(Rnow) ? (pFail * Rnow) / (v.W + pFail * Rnow) : 1;

    var phiOpt    = S.optimalPhi(v);
    var uOpt      = phiOpt * v.sigSefi * v.W;
    var Ropt      = S.effectiveR(phiOpt, v.sigSefi, v.R, v.exposed);
    var rateOpt   = S.rate(phiOpt, v) * v.sigCirc;
    var tOpt      = v.Ntarget / rateOpt;

    var etaRel  = rateOpt > 0 ? rateNow / rateOpt : 0;
    var speedup = rateNow > 0 ? rateOpt / rateNow : Infinity;

    /* verdict */
    var cls, msg;
    if (etaRel >= 0.9) {
      cls = "good";
      msg = "<strong>Well matched.</strong> You are within " + S.pct(1 - etaRel, 0) +
        " of the best data rate achievable at this cross section and duty cycle. Flux is not your " +
        "bottleneck. Raising <em>f</em> or lowering <em>R</em> is where the remaining gains are.";
    } else if (etaRel >= 0.5) {
      cls = "warn";
      msg = "<strong>Workable, but leaving throughput on the table.</strong> You are at " +
        S.pct(etaRel, 0) + " of the achievable rate. Moving to the recommended flux would finish " +
        "the same campaign about " + speedup.toFixed(1) + "× faster.";
    } else {
      cls = "bad";
      msg = "<strong>Flux is badly mis-set.</strong> You are at only " + S.pct(etaRel, 0) +
        " of the achievable data rate. Correcting flux is the cheapest improvement available: it " +
        "would finish the same campaign about " + speedup.toFixed(1) + "× faster.";
    }
    if (x > 1) {
      msg += " The device is being interrupted more than once per work cycle on average, so most " +
             "attempts never produce a verifiable result.";
    }
    verdictEl.className = "verdict " + cls;
    verdictEl.innerHTML = msg;

    /* current */
    var band = x < 0.05 ? "under-driven" : (x <= 1 ? "well matched" : "over-driven");
    var rSub = v.exposed ? "nominal " + S.dur(v.R) + ", inflated by interrupts during recovery"
                         : "beam paused during recovery";
    nowEl.innerHTML =
      S.metric("Beam time for " + S.sci(v.Ntarget, 0) + " events", S.dur(tNow), "", "at your current flux", true) +
      S.metric("Verified events per hour", S.sci(rateNow * 3600), "", "confirmed observations") +
      S.metric("Interrupts per cycle, x", x.toFixed(3), "", band) +
      S.metric("Cycles completing", S.pct(Math.exp(-x)), "", "the rest are destroyed mid-cycle") +
      S.metric("Effective recovery time", S.dur(Rnow), "", rSub) +
      S.metric("Beam time lost to recovery", S.pct(lostFrac), "", "wall clock spent recovering") +
      S.metric("Effective fluence rate", S.sci(phiEffNow), " cm⁻²s⁻¹", "onto the circuit of interest") +
      S.metric("Throughput vs achievable", S.pct(etaRel, 0), "", "flux held as the only variable");

    /* optimum */
    optEl.innerHTML =
      S.metric("Recommended flux", S.sci(phiOpt), " cm⁻²s⁻¹",
        (phiOpt >= v.phi ? "increase by " + (phiOpt / v.phi).toFixed(1) + "×"
                         : "reduce by " + (v.phi / phiOpt).toFixed(1) + "×"), true) +
      S.metric("Beam time for " + S.sci(v.Ntarget, 0) + " events", S.dur(tOpt), "",
        tOpt < tNow ? "saves " + S.dur(tNow - tOpt) : "no saving available", true) +
      S.metric("Optimal interrupts per cycle, u*", uOpt.toFixed(3), "", "target value of x") +
      S.metric("Effective recovery there", S.dur(Ropt), "", v.exposed ? "recomputed at the new flux" : "unchanged") +
      S.metric("Verified events per hour", S.sci(rateOpt * 3600), "", "at recommended flux") +
      S.metric("Throughput gain", (isFinite(speedup) ? speedup.toFixed(2) : "∞") + "×", "", "more data per hour");

    /* warnings */
    var w = [];
    if (!v.exposed) {
      w.push(["Recovery is being treated as protected from the beam",
        "Only correct if the beam is genuinely paused, or the device shielded, for the whole recovery " +
        "sequence. For in-beam automatic resynchronisation it is not: a further interrupt during " +
        "recovery restarts it, which inflates effective recovery time sharply and lowers the optimal " +
        "flux. If in doubt, tick the box; it is the conservative assumption."]);
    } else if (isFinite(Rnow) && Rnow > 2 * v.R) {
      w.push(["Recovery is already being inflated by the beam",
        "Nominal recovery is " + S.dur(v.R) + " but expected time to actually complete one at this flux " +
        "is " + S.dur(Rnow) + ", because interrupts arrive during recovery and restart it. This is the " +
        "mechanism behind sustained interrupt clusters."]);
    }
    if (!isFinite(Rnow)) {
      w.push(["Recovery cannot statistically complete at this flux",
        "Interrupts arrive faster than the recovery sequence can finish, so the device never returns to " +
        "verified operation and throughput collapses to zero. Reduce flux substantially before running.", true]);
    }
    if (x > 2) {
      w.push(["Severely over-driven",
        "At x = " + x.toFixed(2) + ", only " + S.pct(Math.exp(-x)) + " of cycles survive. Results collected " +
        "here are dominated by recovery behaviour rather than the effect you are trying to measure.", true]);
    }
    if (v.f < 0.05) {
      w.push(["Very low targeting efficiency",
        "Only " + S.pct(v.f) + " of each cycle exercises the circuit of interest, so most beam time " +
        "irradiates something you are not measuring. See the " +
        '<a href="batch.html">batch size</a> page; restructuring the cycle usually beats any flux change.']);
    }
    if (rho > 100 && isFinite(rho)) {
      w.push(["Recovery dominates",
        "One interrupt costs " + rho.toFixed(0) + " work cycles. Automatic in-beam recovery, rather than a " +
        "manual reset with the beam paused, is the highest-value change available here."]);
    }
    warnEl.innerHTML = w.map(function (a) { return S.warnBox(a[0], a[1], a[2]); }).join("");

    /* chart */
    var sigW = v.sigSefi * v.W;
    var xMax = Math.max(2.5, x * 1.4, uOpt * 2.5);
    S.drawCurve("chart", {
      xMin: 0, xMax: xMax,
      fn: function (u) { return S.rate(u / sigW, v); },
      peak: S.rate(phiOpt, v),
      optAt: uOpt, optLabel: "optimum  u* = " + uOpt.toFixed(2),
      nowAt: x, nowLabel: "you are here  x = " + x.toFixed(3),
      xLabel: "interrupts per work cycle,  x = φ σ W",
      yLabel: "effective data rate (fraction of peak)"
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    read = S.bindInputs(IDS, update, "exposed");
    document.querySelectorAll(".btn-preset").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.dataset.preset === "blank"
          ? { phi: 1e4, sigSefi: 1e-5, sigCirc: 1e-6, W: 0.1, f: 0.5, R: 1.0, Ntarget: 100, exposed: true }
          : S.DEFAULTS;
        IDS.forEach(function (id) { document.getElementById(id).value = p[id]; });
        document.getElementById("exposed").checked = p.exposed !== false;
        update();
      });
    });
    update();
    window.addEventListener("resize", update);
  });
})();
