/* Dynamic SEE Test Design Optimizer
 *
 *   Phi_dot = phi * f * eta(x, rho)
 *   eta     = exp(-x) / (1 + rho*(1 - exp(-x)))
 *   x       = phi * sigma_SEFI * W        interrupts per work cycle
 *   rho     = R / W                       recovery cost ratio
 *
 * Optimal flux solves (1-u)(1+rho) = rho*exp(-u), phi_opt = u/(sigma_SEFI*W).
 * All computation is client side.
 */
(function () {
  "use strict";

  var IDS = ["phi", "sigSefi", "sigCirc", "W", "f", "R", "Ntarget"];

  var PRESETS = {
    msp430: { phi: 5.14e4, sigSefi: 1.12e-5, sigCirc: 6.24e-6, W: 0.072, f: 0.323, R: 2.49, Ntarget: 100, exposed: true },
    blank:  { phi: 1e4,    sigSefi: 1e-5,    sigCirc: 1e-6,    W: 0.1,   f: 0.5,   R: 1.0,  Ntarget: 100, exposed: true }
  };

  /* ---------- model ---------- */

  function eta(x, rho) {
    var s = Math.exp(-x);
    return s / (1 + rho * (1 - s));
  }

  // Throughput shape at FIXED rho, in units of (f/(sigma*W)): proportional to u*eta(u).
  function shape(u, rho) { return u * eta(u, rho); }

  /* Effective recovery time.
   *
   * If the beam stays on during recovery (in-beam automatic resynchronisation),
   * a further interrupt during recovery restarts it. For a restart-on-failure
   * process of nominal length R under a Poisson hazard lambda, the expected
   * completion time is (exp(lambda*R) - 1)/lambda, which diverges rapidly once
   * lambda*R approaches 1. If the beam is paused for recovery, recovery is
   * protected and R is used unchanged.
   *
   * This term is what stops the model from recommending arbitrarily high flux.
   */
  function effectiveR(phi, sigSefi, R, exposed) {
    if (!exposed) return R;
    var lam = phi * sigSefi;
    if (lam <= 0) return R;
    var z = lam * R;
    if (z > 300) return Infinity;          // recovery cannot statistically complete
    return (Math.exp(z) - 1) / lam;
  }

  // Effective fluence rate to the circuit of interest, per second of beam time.
  function rate(phi, p) {
    var x = phi * p.sigSefi * p.W;
    var Re = effectiveR(phi, p.sigSefi, p.R, p.exposed);
    if (!isFinite(Re)) return 0;
    var s = Math.exp(-x);
    return phi * p.f * s / (1 + (Re / p.W) * (1 - s));
  }

  /* Optimal flux.
   *
   * With protected recovery, rho is constant and the closed form
   * (1-u)(1+rho) = rho*exp(-u) applies, with phi_opt = u/(sigma*W).
   * With exposed recovery, rho itself depends on phi, so the optimum is found
   * numerically by scanning log-flux and refining. Both paths return flux.
   */
  function optimalU(rho) {
    if (!isFinite(rho) || rho <= 0) return 1;
    var gap = function (u) { return (1 - u) * (1 + rho) - rho * Math.exp(-u); };
    if (gap(1) > 0) return 1;
    var lo = 1e-12, hi = 1, mid;
    for (var i = 0; i < 200; i++) {
      mid = 0.5 * (lo + hi);
      if (gap(mid) > 0) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function optimalPhi(p) {
    if (!p.exposed) return optimalU(p.R / p.W) / (p.sigSefi * p.W);
    var best = 0, bestPhi = p.phi, lo = Math.log10(p.phi) - 3, hi = Math.log10(p.phi) + 3, i, phi, r;
    for (i = 0; i <= 3000; i++) {
      phi = Math.pow(10, lo + ((hi - lo) * i) / 3000);
      r = rate(phi, p);
      if (r > best) { best = r; bestPhi = phi; }
    }
    // local refinement around the grid winner
    var a = bestPhi / 1.2, b = bestPhi * 1.2;
    for (i = 0; i <= 400; i++) {
      phi = a + ((b - a) * i) / 400;
      r = rate(phi, p);
      if (r > best) { best = r; bestPhi = phi; }
    }
    return bestPhi;
  }

  /* ---------- formatting ---------- */

  function sci(v, digits) {
    if (!isFinite(v)) return "—";
    if (v === 0) return "0";
    digits = digits == null ? 2 : digits;
    var e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -2 && e < 4) {
      var d = Math.max(0, Math.min(4, 3 - e));
      return v.toFixed(d).replace(/\.?0+$/, "");
    }
    return (v / Math.pow(10, e)).toFixed(digits) + "×" + "10" + sup(e);
  }
  function sup(n) {
    var m = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴",
              5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(n).split("").map(function (c) { return m[c] || c; }).join("");
  }
  function pct(v, d) { return (100 * v).toFixed(d == null ? 1 : d) + "%"; }

  // Seconds -> most readable unit for a test engineer.
  function dur(s) {
    if (!isFinite(s) || s < 0) return "—";
    if (s === 0) return "0";
    if (s < 1) return (s * 1000).toFixed(0) + " ms";
    if (s < 90) return s.toFixed(1) + " s";
    if (s < 5400) return (s / 60).toFixed(1) + " min";
    if (s < 86400 * 2) return (s / 3600).toFixed(2) + " h";
    return (s / 86400).toFixed(1) + " d";
  }

  function metric(label, value, unit, sub, hero) {
    return '<div class="metric' + (hero ? " hero" : "") + '">' +
           '<div class="k">' + label + "</div>" +
           '<div class="v">' + value + (unit ? "<small>" + unit + "</small>" : "") + "</div>" +
           (sub ? '<div class="sub">' + sub + "</div>" : "") + "</div>";
  }

  /* ---------- input ---------- */

  function readInputs() {
    var v = {}, ok = true;
    IDS.forEach(function (id) {
      var el = document.getElementById(id);
      var n = parseFloat(el.value);
      var bad = !isFinite(n) || n <= 0 || (id === "f" && n > 1);
      el.classList.toggle("invalid", bad);
      if (bad) ok = false;
      v[id] = n;
    });
    var ex = document.getElementById("exposed");
    v.exposed = ex ? ex.checked : true;
    return ok ? v : null;
  }

  /* ---------- main ---------- */

  function update() {
    var v = readInputs();
    var verdictEl = document.getElementById("verdict");
    var nowEl = document.getElementById("metricsNow");
    var optEl = document.getElementById("metricsOpt");
    var warnEl = document.getElementById("warnings");

    if (!v) {
      verdictEl.className = "verdict bad";
      verdictEl.innerHTML = "<strong>Check your inputs.</strong> Every value must be a positive number, and targeting efficiency <em>f</em> must be between 0 and 1.";
      nowEl.innerHTML = optEl.innerHTML = warnEl.innerHTML = "";
      drawChart(null);
      return;
    }

    var x      = v.phi * v.sigSefi * v.W;
    var Rnow   = effectiveR(v.phi, v.sigSefi, v.R, v.exposed);
    var rho    = Rnow / v.W;

    // current operating point
    var phiEffNow = rate(v.phi, v);                 // ions/cm2/s into circuit of interest
    var rateNow   = phiEffNow * v.sigCirc;          // verified events per second
    var tNow      = v.Ntarget / rateNow;            // seconds of beam time for the target

    // fraction of wall clock lost to recovery
    var pFail    = 1 - Math.exp(-x);
    var lostFrac = isFinite(Rnow) ? (pFail * Rnow) / (v.W + pFail * Rnow) : 1;

    // optimum over flux (numeric when recovery is exposed, closed form when protected)
    var phiOpt    = optimalPhi(v);
    var uOpt      = phiOpt * v.sigSefi * v.W;
    var Ropt      = effectiveR(phiOpt, v.sigSefi, v.R, v.exposed);
    var phiEffOpt = rate(phiOpt, v);
    var rateOpt   = phiEffOpt * v.sigCirc;
    var tOpt      = v.Ntarget / rateOpt;

    var etaRel  = rateOpt > 0 ? rateNow / rateOpt : 0;   // 0..1, throughput vs achievable
    var speedup = rateNow > 0 ? rateOpt / rateNow : Infinity;

    /* ---- verdict ---- */
    var cls, msg;
    if (etaRel >= 0.9) {
      cls = "good";
      msg = "<strong>Well matched.</strong> You are within " + pct(1 - etaRel, 0) +
            " of the best data rate achievable at this cross section and duty cycle. " +
            "Flux is not your bottleneck; raising <em>f</em> or lowering <em>R</em> is where the remaining gains are.";
    } else if (etaRel >= 0.5) {
      cls = "warn";
      msg = "<strong>Workable, but leaving throughput on the table.</strong> You are at " +
            pct(etaRel, 0) + " of the achievable rate. Moving to the recommended flux would finish " +
            "the same campaign about " + speedup.toFixed(1) + "× faster.";
    } else {
      cls = "bad";
      msg = "<strong>Flux is badly mis-set.</strong> You are at only " + pct(etaRel, 0) +
            " of the achievable data rate. Correcting flux is the cheapest improvement available: " +
            "it would finish the same campaign about " + speedup.toFixed(1) + "× faster.";
    }
    if (x > 1) {
      msg += " The device is being interrupted more than once per work cycle on average, so most " +
             "attempts never produce a verifiable result.";
    }
    verdictEl.className = "verdict " + cls;
    verdictEl.innerHTML = msg;

    /* ---- current metrics ---- */
    var band = x < 0.05 ? "under-driven" : (x <= 1 ? "well matched" : "over-driven");
    var rSub = v.exposed
      ? "nominal " + dur(v.R) + ", inflated by interrupts during recovery"
      : "beam paused during recovery";
    nowEl.innerHTML =
      metric("Beam time for " + sci(v.Ntarget, 0) + " events", dur(tNow), "",
             "at your current flux", true) +
      metric("Verified events per hour", sci(rateNow * 3600), "", "confirmed observations") +
      metric("Interrupts per cycle, x", x.toFixed(3), "", band) +
      metric("Cycles completing", pct(Math.exp(-x)), "", "the rest are destroyed mid-cycle") +
      metric("Effective recovery time", dur(Rnow), "", rSub) +
      metric("Beam time lost to recovery", pct(lostFrac), "", "wall clock spent recovering") +
      metric("Effective fluence rate", sci(phiEffNow), " cm⁻²s⁻¹", "delivered to circuit of interest") +
      metric("Throughput vs achievable", pct(etaRel, 0), "", "flux held as the only variable");

    /* ---- optimum metrics ---- */
    optEl.innerHTML =
      metric("Recommended flux", sci(phiOpt), " cm⁻²s⁻¹",
             (phiOpt >= v.phi ? "increase by " + (phiOpt / v.phi).toFixed(1) + "×"
                              : "reduce by " + (v.phi / phiOpt).toFixed(1) + "×"), true) +
      metric("Beam time for " + sci(v.Ntarget, 0) + " events", dur(tOpt), "",
             tOpt < tNow ? "saves " + dur(tNow - tOpt) : "no saving available", true) +
      metric("Optimal interrupts per cycle, u*", uOpt.toFixed(3), "", "target value of x") +
      metric("Effective recovery time there", dur(Ropt), "",
             v.exposed ? "recomputed at the new flux" : "unchanged") +
      metric("Verified events per hour", sci(rateOpt * 3600), "", "at recommended flux") +
      metric("Throughput gain", (isFinite(speedup) ? speedup.toFixed(2) : "∞") + "×", "",
             "more data per hour of beam");

    /* ---- warnings ---- */
    var w = [];
    if (uOpt > 0.95) {
      w.push(["Recovery is nearly free in this configuration",
              "With ρ = " + rho.toFixed(2) + ", the model pushes toward roughly one interrupt per cycle. " +
              "Check that R really is this small; recovery cost is easy to underestimate when manual " +
              "intervention is excluded."]);
    }
    if (phiOpt / v.phi > 10) {
      w.push(["Recommended flux is more than 10× your current setting",
              "The model still assumes σ<sub>SEFI</sub> does not itself grow with flux and that the mix of " +
              "automatic and manual recovery stays constant. Both eventually fail. Treat this as a direction " +
              "to move, not a target to jump to, and step the flux up while watching the manual-intervention rate.", true]);
    }
    if (!v.exposed) {
      w.push(["Recovery is being treated as protected from the beam",
              "This is only correct if the beam is actually paused, or the device shielded, for the whole " +
              "recovery sequence. For in-beam automatic resynchronisation it is not: a further interrupt " +
              "during recovery restarts it, which inflates the effective recovery time sharply and lowers " +
              "the optimal flux. If in doubt, tick the box; it is the conservative assumption."]);
    } else if (isFinite(Rnow) && Rnow > 2 * v.R) {
      w.push(["Recovery is already being inflated by the beam",
              "Nominal recovery is " + dur(v.R) + " but the expected time to actually complete a recovery at " +
              "this flux is " + dur(Rnow) + ", because interrupts arrive during recovery and restart it. " +
              "This is the mechanism behind sustained interrupt clusters, and it is why the recommended flux " +
              "is lower than a constant-recovery model would suggest."]);
    }
    if (!isFinite(Rnow)) {
      w.push(["Recovery cannot statistically complete at this flux",
              "Interrupts arrive faster than the recovery sequence can finish, so the device never returns " +
              "to verified operation and throughput collapses to zero. Reduce flux substantially, or make " +
              "recovery much faster, before running.", true]);
    }
    if (x > 2) {
      w.push(["Severely over-driven",
              "At x = " + x.toFixed(2) + ", only " + pct(Math.exp(-x)) + " of cycles survive. Results collected " +
              "in this regime are dominated by recovery behaviour rather than by the effect you are trying to measure.", true]);
    }
    if (v.f < 0.05) {
      w.push(["Very low targeting efficiency",
              "Only " + pct(v.f) + " of each cycle exercises the circuit of interest, so most of your beam " +
              "time is spent irradiating something you are not measuring. Restructuring firmware to raise f " +
              "will usually beat any flux adjustment."]);
    }
    if (rho > 100) {
      w.push(["Recovery dominates",
              "One interrupt costs " + rho.toFixed(0) + " work cycles. Automatic in-beam recovery, rather than " +
              "a manual reset with the beam paused, is the single highest-value change available here."]);
    }
    warnEl.innerHTML = w.map(function (a) {
      return '<div class="warnbox' + (a[2] ? " bad" : "") + '"><b>' + a[0] + "</b>" + a[1] + "</div>";
    }).join("");

    drawChart({ p: v, x: x, uOpt: uOpt, peakRate: rateOpt / v.sigCirc });
  }

  /* ---------- chart ---------- */

  function drawChart(s) {
    var c = document.getElementById("chart");
    if (!c) return;
    var ctx = c.getContext("2d");
    var Wd = c.width, Hd = c.height;
    ctx.clearRect(0, 0, Wd, Hd);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, Wd, Hd);
    if (!s) return;

    var padL = 74, padR = 24, padT = 22, padB = 52;
    var pw = Wd - padL - padR, ph = Hd - padT - padB;

    // x axis spans 0..max(2.5, 1.4*current x) in units of interrupts per cycle.
    // Curve is evaluated through rate(), so exposed-recovery inflation is included.
    var xMax = Math.max(2.5, s.x * 1.4, s.uOpt * 2.5);
    var sigW = s.p.sigSefi * s.p.W;
    var curveAt = function (u) { return rate(u / sigW, s.p); };
    var peak = s.peakRate || 1;

    var X = function (u) { return padL + (u / xMax) * pw; };
    var Y = function (y) { return padT + ph - (y / 1.06) * ph; };

    // grid + axes
    ctx.strokeStyle = "#eceff3"; ctx.lineWidth = 1;
    for (var g = 0; g <= 5; g++) {
      var yy = padT + (ph * g) / 5;
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(padL + pw, yy); ctx.stroke();
    }
    ctx.strokeStyle = "#b9c3cf";
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph); ctx.lineTo(padL + pw, padT + ph); ctx.stroke();

    // curve
    ctx.strokeStyle = "#2f6fb0"; ctx.lineWidth = 2.4; ctx.beginPath();
    for (var i = 0; i <= 400; i++) {
      var u = (i / 400) * xMax;
      var y = curveAt(u) / peak;
      if (i === 0) ctx.moveTo(X(u), Y(y)); else ctx.lineTo(X(u), Y(y));
    }
    ctx.stroke();

    // optimum marker
    ctx.strokeStyle = "#1f7a4d"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(X(s.uOpt), Y(0)); ctx.lineTo(X(s.uOpt), Y(1)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1f7a4d";
    ctx.beginPath(); ctx.arc(X(s.uOpt), Y(1), 5.5, 0, 6.2832); ctx.fill();
    ctx.font = "600 12px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("optimum  u* = " + s.uOpt.toFixed(2), Math.min(X(s.uOpt) + 9, padL + pw - 132), Y(1) + 4);

    // current marker
    if (s.x <= xMax) {
      var yNow = curveAt(s.x) / peak;
      ctx.strokeStyle = "#a33a30"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(X(s.x), Y(0)); ctx.lineTo(X(s.x), Y(yNow)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#a33a30";
      ctx.beginPath(); ctx.arc(X(s.x), Y(yNow), 5.5, 0, 6.2832); ctx.fill();
      var lbl = "you are here  x = " + s.x.toFixed(3);
      ctx.textAlign = X(s.x) > padL + pw * 0.62 ? "right" : "left";
      var off = X(s.x) > padL + pw * 0.62 ? -9 : 9;
      ctx.fillText(lbl, X(s.x) + off, Y(yNow) - 11);
    }

    // labels
    ctx.fillStyle = "#5c6878";
    ctx.font = "12px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.textAlign = "center";
    for (var t = 0; t <= 5; t++) {
      var uu = (xMax * t) / 5;
      ctx.fillText(uu.toFixed(2), X(uu), padT + ph + 19);
    }
    ctx.font = "600 12px -apple-system,Segoe UI,Roboto,sans-serif";
    ctx.fillText("interrupts per work cycle,  x = φ σ W", padL + pw / 2, Hd - 13);
    ctx.save();
    ctx.translate(17, padT + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("effective data rate (fraction of peak)", 0, 0);
    ctx.restore();
    ctx.textAlign = "right";
    ctx.font = "12px -apple-system,Segoe UI,Roboto,sans-serif";
    for (var q = 0; q <= 5; q++) {
      ctx.fillText((1.06 * q / 5).toFixed(1), padL - 9, padT + ph - (ph * q) / 5 + 4);
    }
  }

  /* ---------- wiring ---------- */

  function applyPreset(name) {
    var p = PRESETS[name];
    if (!p) return;
    IDS.forEach(function (id) { document.getElementById(id).value = p[id]; });
    var ex = document.getElementById("exposed");
    if (ex) ex.checked = p.exposed !== false;
    update();
  }

  document.addEventListener("DOMContentLoaded", function () {
    IDS.concat(["exposed"]).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    document.querySelectorAll(".btn-preset").forEach(function (b) {
      b.addEventListener("click", function () { applyPreset(b.dataset.preset); });
    });
    update();
    window.addEventListener("resize", update);
  });
})();
