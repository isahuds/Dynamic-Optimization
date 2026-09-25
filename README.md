# Dynamic SEE Test Design

Companion site for Hudson, Hunnicutt, Raymond, Lingasubramanian and Loveless, "Design Strategies
for Dynamic Single-Event Effect Testing of Algorithmic Computation," IEEE Trans. Nucl. Sci.
(RADECS 2026).
A designer plugs in a lost-cycle cross section, a work-cycle time and a target share of
surviving cycles, and reads off the flux to run or the longest cycle a flux allows. A second
page charges the test for dead time: recovery and, optionally, detection latency.

Built against `testing-opt.tex`, package `TNS_FINAL_2026-09-25-v86`, the final copy. If the site
and the paper disagree, the paper wins.

## The relation

```
theta = exp(-sigma_cyc * phi * W)          share of work cycles that survive
phi * W = -ln(theta) / sigma_cyc           the same product for every pair on the rule
D = theta W / (W + (1 - theta) tau)        duty factor; tau = 0 returns D = theta
theta = D (W + tau) / (W + D tau)          inverted for a target D
D' = D with tau + detection latency        the paper's check against the measured share
```

The survival form is Young (1974) and Daly (2006); choosing flux from it is Zimmaro et al.
(RADECS 2022). The direct count of surviving cycles across work cycles from 20 to 814 ms on heavy
ions and the recovery charge are the companion paper's. Hidden strikes appear only as the
paper's caution: the site offers no estimator for them, because the paper does not.

Only `sigma_cyc`, lost cycles over in-cycle fluence, belongs in the rule. A reset-counter or
recovery-record cross section counts over full beam-on exposure, which includes the time spent
handling interrupts outside work cycles, and overstates the surviving share. The site does not
apply a correction factor for that; it says to measure the right quantity instead.

## Pages

| Page | Purpose |
| --- | --- |
| `index.html` | Flux for a work cycle, or longest work cycle for a flux, from `sigma_cyc` and `theta`; the paper's Fig. 4 |
| `recovery.html` | Duty factor and its inverse, with and without detection latency; a caution on hidden strikes |
| `background.html` | The relation with attribution, the six-build measurement and form tests (Fig. 4), the firmware comparison (Figs. 2 and 3), recovery, the beam-on time budget, the hidden-strike caution, Tables II and III quantities, facility ranges, references |

| Asset | Purpose |
| --- | --- |
| `assets/model.js` | Constants and the functions above, plus formatting and table-row helpers |
| `assets/img/` | The paper's Figs. 2, 3 and 4, rendered from the PDFs the manuscript includes |
| `assets/main.js` | First page rendering |
| `assets/recovery.js` | Recovery page rendering |
| `assets/style.css` | Shared presentation |

Plain HTML, CSS and vanilla JavaScript. MathJax from a CDN renders the equations; the source
equations stay readable without it.

## Key values (campaign, MSP430FR6989, LET 7.9 MeV cm^2/mg, flux ~5e4)

```
sigma_cyc    = 1.564e-5 cm^2   [1.441e-5, 1.695e-5]; 0.78 s^-1 at 5e4
sigma_det    = 8.3e-6 cm^2     host recovery record; 0.42 s^-1, predicts more survivors than any build had
sigma_FI     = 9.4e-6 cm^2     pooled, five comparable builds; 7.7 to 11.1e-6, a factor of 1.4
                               (1.2 if multi-reset gaps are credited once); counter 1.17 to 1.44x host
theta        = 0.51 to 0.98    588 of 20,459 cycles lost over six builds, W 20 to 814 ms
longest W    = 135 ms          theta 0.90, phi 5e4; three builds under, FRAM_B50 x1.6, B=200 about x6
at 2e5       = 8% of the longest cycles survive, 94% of the shortest
form tests   = G2 6.4, df 5, p 0.27 (shared sigma_cyc); Weibull shape 0.98 [0.92, 1.04]
retries      = 1 to 2% of beam-on at B=1, 29 to 30% at B=200; counting them raises sigma_cyc 9%
tau          = 0.58 to 1.28 s  dead time's recovery part, per lost cycle; settle 0.165 s for every build
D            = 0.28 to 0.66    34 to 72% of cycle-plus-recovery time uncounted (recovery part of dead time alone)
charge       = (1-theta) tau / W; W drops out to first order
beam-on      = 24 to 43% in cycles; recovery 14 to 36%; detection wait up to 29%;
               re-runs 1 to 2% at B=1, about 40% at B=200; measured countable share 12 to 42%
D + latency  = within 0.02 to 0.05 of the measured share at B<=50 (0.7 to 1.1 s per lost cycle)
recovery     = automatic 95.3%, manual 96.4% (difference -5 to +3 points); first-attempt
               failure 15% (FRAM_B1), 22% (SRAM_B1), 6 to 11% elsewhere; LET sweep kept 18x the exposure
hidden       = 11 to 13% (four FRAM builds; 6 to 17% with uncertainty), 2 to 3 points during recovery
storage sig. = 16 of 34 SRAM events vs 1 of 36 FRAM events, same device (Fisher p<1e-4)
corruption   = 1.09e-6 to 1.04e-5 cm^2 on clean-cycle exposure, a factor of 9.5
```

Source of record: `~/Documents/RADECS-26/analysis/` (`k_direct_fit_v1.json`,
`survival_measurement_v3.csv`, `duty_factor_v3.csv`, `corruption_cross_sections_clean_cycle_v1.json`,
`call_time_budget_v1.json`, `storm_filter_impact_v2.json`) and `testing-opt.tex`, package
`TNS_FINAL_2026-09-25-v86`.

## Local verification

```bash
node --test tests/model.test.js
```

```bash
python3 -m http.server 8731
```

Then check <http://localhost:8731> at desktop and 400 px widths: three pages load without
console errors, the theta slider updates every output live, and the recovery page's second duty
factor sits below the first. The test suite pins the paper's 0.39 for FRAM_B1 with its latency
charged; the slider moves in whole percent, so the page cannot reach FRAM_B1's exact 0.984.

## History

- `UPDATE_PLAN_2026-09-11.md`: the work-cycle correction and the removal of the batch-size
  calculator (committed 2026-09-18 as the v2 release).
- `UPDATE_PLAN_2026-09-18.md`: the alignment with package v76 that this release implements,
  with the decisions taken: `sigma_cyc` only, two tool pages, no correction factor, form-test
  work referred to the paper, evidence page rebuilt rather than patched.
- `UPDATE_PLAN_2026-09-22.md`: the alignment with package v80 (site v4), replacing the
  withdrawn pileup fit with the measured hidden-interrupt share and adding the firmware
  comparison, the published form tests, and the storage signature.
- `UPDATE_PLAN_2026-09-22-v81.md`: the alignment with package v81 that release v5
  implemented: the corruption-event rate on clean-cycle exposure (9.5-fold) with Fig. 2 v18, the
  beam-on time budget and what the duty factor leaves out, and the storm census with each build's
  own host timeouts (a tenth to an eighth hidden, the corrected phase figure).
- `UPDATE_PLAN_2026-09-24.md`: the alignment with `testing-opt(30).tex` that release v6
  implemented: hidden strikes reduced to the paper's caution (estimator, phase split and figure
  removed), detection latency charged in the duty factor, Fig. 4 and the worked comparison added,
  Fig. 3 v2, sigma_det printed, "-fold" retired, and the numbers the paper cut taken off the site.
- `UPDATE_PLAN_2026-09-25.md`: the alignment with `testing-opt.tex` (v86, the final copy) that this
  release (v7) implements: dead time named as the beam-on time in which the host cannot observe the
  device, with the detection latency and recovery as its two parts; the duty factor's definition and
  every "charges" sentence updated so the test, not D, does the charging; the five-author byline; the
  SEFI/SEU tie added to the quantities glossary; and the 23-to-69%, 93.7 s and 75%-charge figures the
  paper cut taken off the site.
