/* Batch-size explorer page. Uses the shared model in model.js. */
(function () {
  "use strict";
  var S = window.SEE;
  var IDS = ["phi", "sigSefi", "sigCirc", "R", "bt0", "bts", "bwd", "Ntarget"];
  var read;

  // W(B) = t0 + B*ts ; f(B) = B*wc / W(B). Millisecond inputs, second internals.
  function geom(v) {
    var t0 = v.bt0 / 1000, ts = v.bts / 1000, wc = Math.min(v.bwd, v.bts) / 1000;
    return {
      W: function (B) { return t0 + B * ts; },
      f: function (B) { return (B * wc) / (t0 + B * ts); },
      clamped: v.bwd > v.bts
    };
  }

  function rateAt(B, g, v) {
    return S.rate(v.phi, {
      phi: v.phi, sigSefi: v.sigSefi, W: g.W(B), f: g.f(B), R: v.R, exposed: v.exposed
    });
  }

  function update() {
    var mEl = document.getElementById("batchMetrics");
    var wEl = document.getElementById("batchWarn");
    var tEl = document.getElementById("batchTable");
    var v = read();
    if (!v) {
      mEl.innerHTML = '<p class="help">Enter positive values above.</p>';
      wEl.innerHTML = ""; tEl.innerHTML = "";
      S.drawCurve("batchChart", null);
      return;
    }
    var g = geom(v);

    var best = 1, bestR = 0, B, r;
    for (B = 1; B <= 500; B++) {
      r = rateAt(B, g, v);
      if (r > bestR) { bestR = r; best = B; }
    }
    var Wb = g.W(best), fb = g.f(best), xb = v.phi * v.sigSefi * Wb;
    var r1 = rateAt(1, g, v);
    var evOpt = bestR * v.sigCirc;

    mEl.innerHTML =
      S.metric("Optimal batch size B*", String(best), "", "maximises verified data per hour", true) +
      S.metric("Beam time for " + S.sci(v.Ntarget, 0) + " events", S.dur(v.Ntarget / evOpt), "", "at B*", true) +
      S.metric("Work cycle there", S.dur(Wb), "", "W = t₀ + B·t_s") +
      S.metric("Targeting efficiency there", fb.toFixed(3), "", "f = B·w_c / W") +
      S.metric("Interrupts per cycle there", xb.toFixed(3), "", xb > 1 ? "over-driven" : "well matched") +
      S.metric("Cycles surviving", S.pct(Math.exp(-xb)), "", "at B*") +
      S.metric("Gain over B = 1", (bestR / r1).toFixed(2) + "×", "", "more data per hour of beam");

    /* comparison table across representative batch sizes */
    var rows = [1, 2, 5, 10, 20, 50, 100, 200, 500];
    if (rows.indexOf(best) === -1) { rows.push(best); rows.sort(function (a, b) { return a - b; }); }
    tEl.innerHTML =
      '<table class="casestudy"><thead><tr><th>B</th><th>W</th><th>f</th><th>x</th>' +
      '<th>cycles surviving</th><th>data rate</th></tr></thead><tbody>' +
      rows.map(function (b) {
        var x = v.phi * v.sigSefi * g.W(b);
        var frac = rateAt(b, g, v) / bestR;
        var cls = b === best ? ' class="opt-row"' : (x > 1 ? ' class="bad-row"' : "");
        return "<tr" + cls + "><td>" + b + (b === best ? " ←" : "") + "</td><td>" + S.dur(g.W(b)) +
          "</td><td>" + g.f(b).toFixed(3) + "</td><td>" + x.toFixed(3) + "</td><td>" +
          S.pct(Math.exp(-x), 0) + "</td><td>" + S.pct(frac, 0) + " of best</td></tr>";
      }).join("") + "</tbody></table>";

    var w = [];
    if (g.clamped) {
      w.push(["Per-sample compute exceeds per-sample cost",
        "Compute time per sample cannot be larger than the total time each sample adds to the cycle. " +
        "It has been clamped to t_s, which makes f = 1. Check the two values."]);
    }
    if (best >= 500) {
      w.push(["Optimum is at or beyond the search limit",
        "Interrupts are rare enough at this flux that batching keeps paying. Confirm a batch this large " +
        "is realistic for your buffer and telemetry budget before adopting it."]);
    }
    if (xb > 1) {
      w.push(["Even the best batch size leaves the device over-driven",
        "Reduce flux first. Batch size cannot rescue an operating point where most cycles are destroyed " +
        "before they finish.", true]);
    }
    if (best === 1) {
      w.push(["Batching does not help here",
        "Fixed per-transfer overhead is small relative to per-sample cost, or interrupts are frequent " +
        "enough that a longer cycle never pays. Report every result individually."]);
    }
    wEl.innerHTML = w.map(function (a) { return S.warnBox(a[0], a[1], a[2]); }).join("");

    var Bmax = Math.max(60, Math.min(500, best * 3));
    S.drawCurve("batchChart", {
      xMin: 1, xMax: Bmax,
      fn: function (b) { return rateAt(b, g, v); },
      peak: bestR,
      optAt: best, optLabel: "B* = " + best,
      xLabel: "batch size B (results per telemetry transfer)",
      yLabel: "data rate (fraction of best)",
      xFmt: function (t) { return String(Math.round(t)); }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    read = S.bindInputs(IDS, update, "exposed");
    update();
    window.addEventListener("resize", update);
  });
})();
