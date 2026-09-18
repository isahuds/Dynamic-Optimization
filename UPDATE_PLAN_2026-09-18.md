# Update plan, 2026-09-18: aligning the site with manuscript v76

**Status:** plan only, nothing implemented.
**Author:** isahudso
**Supersedes:** `UPDATE_PLAN_2026-09-11.md` for everything that plan left open. Its section 0
(attribution table) and section 1 (terminology) still apply except where section 2 below
overrides a symbol.
**Companion paper:** Hudson, Hunnicutt, Loveless, "Design Strategies for Dynamic Single-Event
Effect Testing of Algorithmic Computation," IEEE TNS (RADECS 2026). Package of record
`~/Documents/RADECS-26/paper/TNS_REMEDIATION_2026-09-17-v76/testing-opt.tex`, 12 pp, final
limit. There is no supplement and no later journal version. Anything the site attributes to
"the supplement" or "Section VI" does not exist.

---

## 1. Where things stand

### 1.1 The site

The working tree carries an **uncommitted** implementation of steps 1, 2 and 6 of the
2026-09-11 plan, dated 2026-09-11 (11 files, +344/-590):

- `assets/model.js` constants corrected (`W` 19.945 ms at B=1, pileup `k`=1.157e-4,
  `tau_d`=0.332 s, `phi*`=26,055, R2 0.941), per-build measured theta, tau and duty factor
  added from `theta_validation_v3.csv` and `duty_factor_v3.csv`, optimism factor 1.63
  [1.45, 1.85], pooled fitted rate 0.79 s^-1, `dutyFactor`, `thetaForDuty`,
  `correctLoggedTheta`, `pileupPeakFlux` functions.
- `batch.html`, `assets/batch.js` and the renewal-reward apparatus deleted.
- `tests/model.test.js` re-pinned; 22 tests pass under `node --test tests/model.test.js`.
- README rewritten with the v2 correction notice.

Steps 3, 4 and 5 (three-tier `index.html`, `validation.html` re-derivation,
`background.html` narrative) were not started. `background.html`, `validation.html`,
`unknown.html` and most of `glossary.html` still carry the pre-2026-09-05 story.

**That working tree is correct against v57 and should be committed as its own commit before
the v76 pass**, so the history shows the constants fix separately from the vocabulary change.

### 1.2 The paper, v57 to v76

The 2026-09-11 plan targeted v57. Nineteen package versions later, these are the changes
that reach the site. Numbers verified against `analysis/k_direct_fit_v1.json`,
`survival_measurement_v3.csv`, `duty_factor_v3.csv`, `pileup_numerator_robustness_v1.json`
and the v76 `.tex` on 2026-09-18.

| Change | v57 (what the site implements) | v76 (what the site must say) |
|---|---|---|
| Notation | `lambda` everywhere; `k` is the pileup cross section | `sigma_cyc`, `sigma_FI`, `sigma_det`, `sigma_fit`. `lambda(phi)` survives only in the pileup equation as the counted rate. Table III is the vocabulary of record. |
| Design formula | `lambda_target = -ln(theta)/W` | `phi W = -ln(theta) / sigma_cyc` (Eq. 2, the frontier). Flux and work cycle trade tenfold for tenfold. |
| Fitted rate | pooled `lambda_fitted` 0.7916 s^-1, CI [0.729, 0.858]; FRAM-16 0.7513 [0.672, 0.837] | `sigma_cyc` = 1.56e-5 cm^2, 95% [1.44, 1.69]e-5, fitted directly on per-build flux and W; 0.78 s^-1 at the nominal 5e4. Three pure-FRAM builds 1.49e-5 (0.74 s^-1). The 0.79/0.75 and their intervals are gone from the paper. |
| Design outputs | required rate only | **Longest work cycle** at theta=0.80, phi=5e4: 285 ms. **Shortest work cycle** `-ln(theta) tau_d` = 74 to 92 ms at theta=0.80. Neither is on the site. |
| Counted evidence | per-build n | 588 of 20,459 attempted cycles lost across six builds; theta 0.51 to 0.98; flux held within 11% of 5e4. |
| Pileup ceiling | `phi*` = 26,055 is the ceiling `fluxPlan` caps at; index says it sits "below the 5e4 these builds ran at" | 26,000 belongs to the LET 2.3 to 4.1 group only; `sigma_fit` does not transfer across LET (standing rule). At the comparison LET the peak is **1.5 to 1.9e5** on the lost-cycle rate and 2.6 to 3.2e5 on the counted rate, three to six times the flux the builds used; `sigma_cyc phi tau_d` there is 0.26 to 0.32. The 09-11 plan's "binds by 2.6 to 37x" is superseded. |
| Pileup robustness | none | Refit on the reset counter moves `phi*` 4.8% (24,806, R2 0.963). Illustrative `tau_d`=1 s puts the peak at 8,600. Counted rate sits 11% below the line at 3e3, a third at 1e4, 63% at `phi*`. `tau_d` at the comparison LET is 0.414 s. |
| Theta and pileup | site's `background.html` argues theta "inherits pileup's blind spot" with 0.965 vs 0.676 and 9.3x | Paper: the **counted** clean-cycle fraction is not suppressed, since a cycle carrying a second strike is lost once either way. A theta *predicted from a counted rate* is what inherits the blind spot. The 0.965/0.676/9.3x numbers are from a retired analysis and are not in the paper. |
| Form-test assumptions | LRT p=0.22 and Weibull power stated as evidence | **Commented out in v76**, pending strengthening. The site must not present it as a published result. |
| Optimism factor | 09-11 plan: "apply 1.63 on the face of the result" | Paper Limitations: 1.63 "rests on six builds at one flux and one LET, so it is a direction for this class of test rather than a constant correction to apply elsewhere." Fig. 3 shows the host-record curve at `sigma_det phi` = 0.42 s^-1 lying above every point. |
| Duty factor | `D` formula and per-build values | Same formula and values (D 0.51, 0.65, 0.40, 0.28 for FRAM_B1, B50, B200, SRAM_Mixed). New: the charge is `(1-theta) tau / W` and **W cancels**, so the reordering is driven by tau, not by cycle length; 35 to 72% of test time bought no countable exposure; in-cycle share 32 to 56%; five of six builds share one ~4% resync-failure rate, SRAM_B1 16%; SRAM_Mixed_B200 2.5 episodes per lost cycle; slowest twentieth of episodes carries a quarter to seven tenths of recovery time; escalated recovery mean 93.7 s, median 84.6 s. |
| Firmware comparison | site: FRAM heterogeneity p=0.0001, `sigma ∝ phi^-0.96`, buffer-persistence mechanism | Paper: corruption-event rate spread **6.1-fold**, functional-interrupt rate **1.4-fold**; storage placement dominates; clock in the one throttled build; batch size no detectable effect; cycles-completed-per-cycle-lost varied 31-fold. The `phi^-0.96` scaling and R2 0.386 fit were withdrawn. |
| Counting chain | 107 / 1,303 Tier 1+2 | 1,715 -> 633 -> 241 -> 95 under one per-cycle rule. |
| Recovery success | 95.3% / 71.4% censored | Unchanged. Manual 96.4%. |
| Banned wording | | "that ceiling also puts a floor under the work cycle" (PI). Use "A flux the test cannot exceed also sets a shortest work cycle it can run." Never SEFI or SEU for the counted errors; the counts are functional interrupts and corruption events. |

---

## 2. Symbol map, site to paper

Every occurrence on the site should be renamed. `lambda` may remain only inside the pileup
equation and only as "the counted interruption rate."

| Site today | Paper v76 | Notes |
|---|---|---|
| `lambda` (design-rule rate) | `sigma_cyc phi` | The tool's headline output becomes a cross section times a flux, or the product `phi W`. |
| `lambda_target` | `-ln(theta)/W` is still the rate budget; present it as `sigma_cyc phi` | Keep the rate as an intermediate; do not name it lambda. |
| `k` (tier 1 cross section, 09-11 plan) | `sigma_cyc` | Lost cycles over in-cycle fluence. |
| `k` (pileup, `PILEUP.k`) | `sigma_fit` | "A fit parameter, not a device constant." |
| `lambdaLogged`, `lambda` in `CONFIGS` | `sigma_det phi` | Host-detected over beam-on exposure. |
| `lambda_SEFI`, `lambda_loss`, "trigger rate" | retire | Not in Table III. The rate hierarchy on `background.html` becomes Table III. |
| reset-counter rate | `sigma_FI` | Device reset counter over beam-on exposure. |
| `tau` (glossary "dead time") | `tau_d` | The glossary still has one entry calling `tau` the dead time. |
| SEFI, SEU, crash | functional interrupt, corruption event | Everywhere in prose. |

---

## 3. Page-by-page audit

### `index.html` and `assets/main.js`

- Headline formula must become the frontier `phi W = -ln(theta)/sigma_cyc`, with
  `sigma_cyc` as an input (measured in a pilot, or the campaign's 1.56e-5 as the prefilled
  example). Output both readings: flux for a fixed `W`, and longest `W` for a fixed flux.
- Add the shortest work cycle `-ln(theta) tau_d` and the pileup ceiling `1/(sigma_cyc tau_d)`
  as a second, optional input block (`tau_d`). With the campaign's 0.33 to 0.41 s it gives
  the 74 to 92 ms floor and the 1.5 to 1.9e5 ceiling the paper states.
- `fluxPlan` must stop capping at 26,055. That number is one LET group's peak and the paper
  says the comparison-LET ceiling is three to six times higher. See decision D1.
- "fitted a full pileup curve from a 35-run flux sweep" is wrong: the fitted group is the
  LET 2.3 to 4.1 runs of `FRAM_B1_Throttled`'s sweep, four runs.
- "crashes (SEFIs)" and the Design-levers block (p=0.0001, buffer persistence,
  `sigma ∝ phi^-0.96`) replaced by the paper's 6.1-fold / 1.4-fold / 31-fold statement.
- Zimmaro must be credited on this page (09-11 plan section 0 rule, still unmet). Add
  Coronetti's "about ten duty cycles between two losses" as the other published guidance on
  choosing theta.
- Campaign metrics card: replace "Pileup ceiling 2.6e4, below the 5e4 these builds ran at"
  with the comparison-LET bound; replace "Logged rates run optimistic by x1.63" with the
  Fig. 3 statement (host-record curve at 0.42 s^-1 lies above every measured point) and the
  Limitations caveat. See D2.
- "Where to go next" link text still says "renewal-reward derivation" and "why B* is an
  upper bound" (also in `glossary.html`). Remove.

### `glossary.html`

Rewrite against Table III in its order: beam-on time, in-cycle time, recovery time,
countable exposure, `W`, `theta`, `phi`, `sigma_cyc`, `sigma_FI`, `sigma_det`, `tau`, `D`,
`tau_d`, `phi*`, `sigma_fit`. Keep fluence, wall-clock time, LET and the Garwood entry.
Delete SEFI, SEU, "interruption / trigger rate," "susceptibility (k)," and the "dead time
(tau)" entry with the 0.4275 s / 21,826 / 1.072e-4 / R2 0.386 values (all withdrawn). Keep
the `W = W0 + B t_s` description with the corrected constants, as decided 2026-09-11.

### `background.html`

Everything below the first section is stale:

- Pileup table (k 1.072e-4, tau 0.4275 s, phi* 21,826 +/- 1,448, R2 0.386 vs 0.11 vs
  0.004, the 35-run fit, the up-time denominator check at 19,742): withdrawn fit. Replace
  with the paper's IV-C: paralyzable model, `tau_d` measured at 0.332 s, `sigma_fit`
  1.2e-4, `phi*` about 26,000, suppression 11% / a third / 63%, the 1 s illustrative curve,
  the reset-counter robustness, and the comparison-LET bound.
- "Why this tool never recommends a flux above phi*" with the 0.965/0.676/9.3x/0.60 blind
  spot numbers: retired analysis. Replace with the paper's two sentences: a counted rate is
  suppressed past `phi*`; the counted clean-cycle fraction is not.
- "Why just exclude recovery time doesn't fix this": partly survives as the Limitations
  paragraph on shutters (Wilcox 2017, TI FR5969-SP): pausing the beam removes recovery
  exposure but not detection latency, so a floor remains. Cut the circularity argument and
  the 53% / 30% / rho -0.92 numbers.
- Rate hierarchy table: becomes Table III.
- Add the duty-factor section: Eq. 3 and its inverse, `tau = 0` recovers Zimmaro, the
  charge `(1-theta) tau / W` with W cancelling, the FRAM_B1 sixty-cycle-lengths example,
  and why the build order reverses. Attribute Coronetti (availability) and ESCC 25100
  (active-time share) as the paper does.
- The opening "flux-primary" section (no interior optimum, theta is the experimenter's)
  survives; recast its notation.

### `validation.html`

Nothing on this page matches the paper. Counting table (107 / 1,303 / 50 / 933 / 167 /
1,715), the `lambda` table, the `R_proto` / `R_tool` / `R_resume` endpoints, the FRAM
heterogeneity p=0.0001, the `phi^-0.96` flux relationship, the PYNQ clock bridge, and the
"what remains blank" table with `lambda_loss` and `lambda_SEFI` are all superseded or
retired vocabulary. Rebuild from the paper only (decision D4):

1. The six-build table: `W`, attempted cycles, lost cycles, measured theta with interval,
   `tau`, `D` (from `survival_measurement_v3.csv` and `duty_factor_v3.csv`; already in
   `model.js` `CONFIGS`).
2. The fit: `sigma_cyc` 1.56e-5 [1.44, 1.69], three-build 1.49e-5, host-record 0.42 s^-1.
3. Recovery: 0.165 s settle for every build; ~4% resync failure on five builds, 16% on
   SRAM_B1; host timeout 5 or 10 s; automatic 95.3%, manual 96.4%, 71.4% censored as
   failure; facility pause median 84.6 s, escalated mean 93.7 s.
4. Pileup: the four-run LET 2.3 to 4.1 group, `tau_d` 0.332, `phi*` 26,055 (R2 0.941),
   reset-counter refit 24,806 (R2 0.963).
5. Firmware comparison: 6.1-fold corruption spread, 1.4-fold interrupt spread, the
   single-rule chain 1,715 -> 633 -> 241 -> 95.

### `unknown.html`

- The "pre-campaign checklist" cites "the paper's Section VI" and computes `B*` from `W0`,
  `t_s` and `lambda`. That section and that formula no longer exist. Replace the six steps
  with the paper's procedure: measure `W` event-free on the bench; pilot for `sigma_cyc`
  at the test LET; pick theta; read flux or longest `W` off Eq. 2; measure `tau_d` and check
  the ceiling and the shortest cycle; charge recovery through `D`.
- "Paper supplement Table S8" and "Tables S2 and S6" (on `validation.html`): there is no
  supplement. Remove every supplement reference.
- The seven-gate Poisson calculator and the Garwood / zero-event convention are the site's
  own and are consistent with the paper's Garwood usage. Keep, but label them as the site's
  reporting convention rather than as the paper's.
- The "prospective calibration instrumentation" table uses retired vocabulary
  (`lambda_loss`, `lambda_SEFI`, `R_verify`, PYNQ epoch). Either rewrite in Table III terms
  or cut.

### `assets/model.js` and `tests/model.test.js`

- Bump `RELEASE` to `flux-primary-design-tool-v3-2026-09-xx`, superseding v2.
- Add `SIGMA_CYC = {value: 1.5644e-5, ci95: [1.4411e-5, 1.6947e-5], threeBuild: 1.4873e-5,
  threeBuildCI: [1.3295e-5, 1.6571e-5], nominalFlux: 5e4, source: "k_direct_fit_v1.json"}`.
- Replace `POOLED[*].lambdaFitted` and their CIs (superseded numbers) with `sigma_cyc *
  nominalFlux`. Keep `lambdaLogged` but rename to `sigmaDetPhi`.
- Rename `PILEUP.k` to `PILEUP.sigmaFit`; add `tauDComparisonLET = 0.414`,
  `resetCounterRefit = {sigmaFit: 1.2147e-4, phiStar: 24806, r2: 0.963}`.
- New functions: `frontierProduct(theta, sigma)`, `longestW(theta, sigma, phi)`,
  `fluxForW(theta, sigma, W)`, `shortestW(theta, tau_d)`, `ceilingFlux(sigma, tau_d)`.
- `fluxFromLambdaViaPileup` / `fluxPlan`: per D1.
- `correctLoggedTheta`: per D2, either remove or rename to `loggedRateWarning` returning
  the gap without applying it.
- Remove the `G2 = 7.08, df = 5, p = 0.22` comment block and the `POOLED.G2/pValue`
  fields while the paper's assumptions paragraph is commented out (D3).
- Tests: drop `assert.ok(S.PILEUP.peakFlux < 5e4)` (line 97), which encodes the superseded
  "ceiling binds" claim. Add pins: `sigma_cyc` to 1e-8, `longestW(0.80, sigma_cyc, 5e4)`
  = 285.27 ms to 0.1%, `shortestW(0.80, 0.332)` = 74.1 ms and `(0.80, 0.414)` = 92.4 ms,
  sum of `CONFIGS` lost = 588 and attempted = 20,459, and `sigma_cyc * 5e4` = 0.78 to two
  places.

### `README.md`

Key-values block: drop `lambda_fitted 0.751298`, the duplicate `phi* = ~2.1e4` line, and
`k` labelled as pileup; add `sigma_cyc`, the 285 ms and 74 to 92 ms design outputs, the
comparison-LET ceiling, `tau_d` 0.332 / 0.414. Formula section rewritten to Eq. 2. Add a
v3 notice above the v2 one.

---

## 4. Decisions needed (recommendation first)

**D1. What caps the flux recommendation.** Recommended: make `sigma_cyc` and `tau_d` inputs,
compute the ceiling as `1/(sigma_cyc tau_d)` with the campaign's values prefilled, and show
the LET 2.3 to 4.1 `phi*` only as the worked example of a measured peak, never as the
device's ceiling. Alternative: keep a fixed ceiling but move it to the comparison-LET bound
(1.5e5). The first keeps the tool honest for other devices and matches the paper's "a fit
parameter, not a device constant."

**D2. The 1.63 factor.** Recommended: display it as a warning ("a rate from a recovery log
predicted more surviving cycles than were counted, by about 1.6x in this campaign; measure
`sigma_cyc` from lost cycles instead") and do not apply it as a multiplier. That is the
paper's Limitations wording. The 09-11 plan's "apply it on the face of the result" is
withdrawn.

**D3. The form-test assumptions (p=0.22, Weibull power).** Recommended: remove from the site
until the paper restores the paragraph. A companion site should not publish what the paper
withholds.

**D4. `validation.html`.** Recommended: rebuild small from the five blocks in section 3
rather than patching. Every current table on it is superseded.

**D5. Commit order.** Recommended: commit the 2026-09-11 working tree first as
"Correct work-cycle and pileup constants; remove batch-size calculator," then do the v76
pass on top.

---

## 5. Work order

| # | Work | Effort | Depends on |
|---|---|---|---|
| 1 | Commit the 2026-09-11 working tree (D5) | minutes | nothing |
| 2 | `model.js` + tests: `sigma_cyc`, new design functions, ceiling per D1, rename symbols, drop superseded numbers | half a day | D1, D2, D3 |
| 3 | `index.html` + `main.js`: frontier formula, longest/shortest `W`, ceiling block, attribution, levers paragraph, metrics card | one day | 2 |
| 4 | `glossary.html` rewrite against Table III | half a day | 2 |
| 5 | `background.html` rewrite (pileup, duty factor, Table III, shutters) | one day | 2 |
| 6 | `validation.html` rebuild (D4) | half a day | 2 |
| 7 | `unknown.html`: checklist, supplement references, instrumentation table | quarter day | 4 |
| 8 | README, `RELEASE` bump, browser QA on all five pages at desktop and 400 px, `node --test tests/model.test.js` | quarter day | all |

Steps 2 and 3 give a tool whose headline matches the paper's design rule. Steps 4 to 7 are
alignment. Guard against drift: step 2's new tests pin every number the paper prints from
the analysis files, so a future refit fails loudly here.

---

## 6. Source of record

All numbers trace to `~/Documents/RADECS-26`, never to this repository:

- `paper/TNS_REMEDIATION_2026-09-17-v76/testing-opt.tex`, the manuscript; Table III is the
  vocabulary; its `CHANGE_LOG.md` lists the numeral audit.
- `analysis/k_direct_fit_v1.json`: `sigma_cyc`, intervals, the 285 ms, per-build counts.
- `analysis/survival_measurement_v3.csv`, `theta_validation_v3.csv`: theta, `W`, counts.
- `analysis/duty_factor_v3.csv`: `tau`, `D`.
- `analysis/pileup_numerator_robustness_v1.json`: `tau_d`, `sigma_fit`, `phi*`, the
  reset-counter refit.
- `memory/SECTION_IV_VOCABULARY_2026-09-15.md`, `EXPOSURE_BASIS_AND_DUTY_VALIDATION_2026-09-17.md`,
  `PILEUP_NUMERATOR_ROBUSTNESS_2026-09-18.md`: why each number is what it is.

If the site and the package disagree, the package wins.
