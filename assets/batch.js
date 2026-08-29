(function () {
  "use strict";
  var S = window.SEE;

  function val(id) {
    var el = document.getElementById(id);
    var v = parseFloat(el.value);
    el.classList.toggle("invalid", isNaN(v) || v < 0);
    return v;
  }

  function update() {
    var w0 = val("inputW0") / 1000;
    var ts = val("inputTS") / 1000;
    var lambda = val("inputLambda");
    var recovery = val("inputRecovery");
    if (isNaN(w0) || w0 <= 0 || isNaN(ts) || ts <= 0 || isNaN(lambda) || lambda <= 0) return;
    if (isNaN(recovery) || recovery < 0) recovery = 0;

    var origW0 = S.W0;
    var origTS = S.TS;
    var bstarCont = (Math.sqrt(2 * w0 / lambda) - w0) / ts;
    var wstar = Math.sqrt(2 * w0 / lambda);

    var bestB = 1, bestT = 0;
    var wc = function (b) { return w0 + ts * b; };
    var tp = function (b) { return b * lambda / Math.expm1(lambda * wc(b)); };
    for (var b = 1; b <= 500; b++) {
      var t = tp(b);
      if (t > bestT) { bestT = t; bestB = b; }
    }

    var cost = function (b) { return Math.expm1(lambda * wc(b)) * (1 / lambda + recovery) / b; };

    document.getElementById("batchMetrics").innerHTML =
      S.metric("B* (formula)", bstarCont.toFixed(1), "", "continuous throughput optimum; upper bound", true) +
      S.metric("B* (exact integer)", String(bestB), "", "exhaustive search over B=1..500", true) +
      S.metric("W* (optimal cycle)", S.dur(wstar), "", "√(2W₀/λ)") +
      S.metric("Cost at B*", S.dur(cost(bestB)), " per result", "with recovery proxy " + S.dur(recovery));

    S.drawCurve("batchChart", {
      xMin: 1,
      xMax: Math.min(500, Math.max(200, bestB * 4)),
      fn: tp,
      peak: bestT,
      optAt: bestB,
      optLabel: "B* = " + bestB,
      xLabel: "batch size B"
    });

    var candidates = [1, 10, Math.max(1, Math.round(bestB / 2)), bestB, Math.round(bestB * 2), 100, 200]
      .filter(function (v) { return v >= 1 && v <= 500; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; })
      .sort(function (a, b) { return a - b; });

    document.getElementById("batchTable").innerHTML =
      '<table><thead><tr><th>B</th><th>W(B)</th><th>Throughput (relative)</th><th>Cost per result</th></tr></thead><tbody>' +
      candidates.map(function (b) {
        var rel = (100 * tp(b) / bestT).toFixed(1);
        return '<tr' + (b === bestB ? ' style="font-weight:600;background:#eef5fb"' : '') + '><td>' +
          b + (b === bestB ? ' ←' : '') + '</td><td>' + S.dur(wc(b)) +
          '</td><td>' + rel + '%</td><td>' + S.dur(cost(b)) + '</td></tr>';
      }).join('') + '</tbody></table>';

    document.getElementById("validationTable").innerHTML =
      '<table><thead><tr><th>Configuration</th><th>B</th><th>Predicted</th><th>Measured</th><th>Error</th></tr></thead><tbody>' +
      S.VALIDATION.map(function (v) {
        return '<tr><td>' + v.config + '</td><td>' + v.batchSize +
          '</td><td>' + v.predicted_ms.toFixed(3) + ' ms</td><td>' + v.measured_ms.toFixed(3) +
          ' ms</td><td>' + (v.error > 0 ? '+' : '') + (v.error * 100).toFixed(1) + '%</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function init() {
    var presets = document.getElementById("configPresets");
    S.CONFIGS.concat(S.POOLED).forEach(function (cfg) {
      var btn = document.createElement("button");
      btn.className = "btn-preset ghost";
      btn.textContent = cfg.label;
      btn.addEventListener("click", function () {
        document.getElementById("inputLambda").value = cfg.lambda;
        update();
      });
      presets.appendChild(btn);
    });

    document.getElementById("presetDefault").addEventListener("click", function () {
      document.getElementById("inputW0").value = "25.145";
      document.getElementById("inputTS").value = "7.077";
      document.getElementById("inputLambda").value = "0.415918";
      document.getElementById("inputRecovery").value = "0.165";
      update();
    });

    ["inputW0", "inputTS", "inputLambda", "inputRecovery"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", update);
    });

    update();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
