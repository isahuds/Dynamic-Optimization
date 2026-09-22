# Dynamic SEE Test Design

Companion site for Hudson, Hunnicutt and Loveless, "Design Strategies for Dynamic
Single-Event Effect Testing of Algorithmic Computation," IEEE Trans. Nucl. Sci. (RADECS 2026).
A designer plugs in a lost-cycle cross section, a work-cycle time and a target share of
surviving cycles, and reads off the flux to run or the longest cycle a flux allows. A second
page charges the test for recovery time and estimates how many interrupts a detection delay
can hide from the count.

Built against manuscript package `TNS_REMEDIATION_2026-09-22-v81`. If the site and the paper
disagree, the paper wins.

## The relation

```
theta = exp(-sigma_cyc * phi * W)          share of work cycles that survive
phi * W = -ln(theta) / sigma_cyc           the same product for every pair on the rule
D = theta W / (W + (1 - theta) tau)        duty factor; tau = 0 returns D = theta
theta = D (W + tau) / (W + D tau)          inverted for a target D
hiddenShare = 1 - exp(-sigma_FI * phi * t_det)   chance a hidden reset was an independent strike
```

The survival form is Young (1974) and Daly (2006); choosing flux from it is Zimmaro et al.
(RADECS 2022). The direct count of surviving cycles across a 41-fold work-cycle range on heavy
ions, the recovery charge, and the hidden-interrupt accounting are the companion paper's.

Only `sigma_cyc`, lost cycles over in-cycle fluence, belongs in the rule. A reset-counter or
recovery-record cross section counts over full beam-on exposure, which includes the time spent
handling interrupts outside work cycles, and overstates the surviving share. The site does not apply a correction factor for that; it says to measure the right
quantity instead.

## Pages

| Page | Purpose |
| --- | --- |
| `index.html` | Flux for a work cycle, or longest work cycle for a flux, from `sigma_cyc` and `theta` |
| `recovery.html` | Duty factor and its inverse, and how often a hidden interrupt escapes the count |
| `background.html` | The relation with attribution, the six-build measurement, the firmware comparison (Figs. 2 and 3), recovery, the beam-on time budget and hidden-interrupt evidence, Tables II and III quantities, facility ranges, references |

| Asset | Purpose |
| --- | --- |
| `assets/model.js` | Constants and the five functions above, plus formatting and table-row helpers |
| `assets/main.js` | First page rendering |
| `assets/recovery.js` | Recovery page rendering |
| `assets/style.css` | Shared presentation |

Plain HTML, CSS and vanilla JavaScript. MathJax from a CDN renders the equations; the source
equations stay readable without it.

## Key values (campaign, MSP430FR6989, LET 7.9 MeV cm^2/mg, flux ~5e4)

```
sigma_cyc    = 1.564e-5 cm^2   [1.441e-5, 1.695e-5]; 0.78 s^-1 at 5e4
             = 1.487e-5 cm^2   three pure-FRAM 16 MHz builds; 0.74 s^-1
sigma_det*phi = 0.42 s^-1      host recovery record; lies above every measured point
sigma_FI     = 9.4e-6 cm^2     pooled, five directly comparable builds; 1.4-fold spread
theta        = 0.51 to 0.98    588 of 20,459 cycles lost over six builds, W 20 to 814 ms
longest W    = 135 ms          theta 0.90, phi 5e4; three of six builds under it
tau          = 0.58 to 1.28 s  mean per lost cycle; settle 0.165 s for every build
D            = 0.28 to 0.66    34 to 72% of in-cycle plus recovery time uncounted (recovery charged alone)
beam-on      = 24 to 43% in cycles; recovery 14 to 36%; detection wait up to 29%;
               re-runs 1 to 2% at B=1, about 40% at B=200; measured countable share 12 to 42%
D + wait     = within 0.02 to 0.05 of the measured share at B<=50 (0.7 to 1.1 s per lost cycle)
form tests   = G2 6.4, df 5, p 0.27 (shared sigma_cyc); Weibull shape 0.98 [0.92, 1.04]
hidden       = a tenth to an eighth (6 to 17%, four FRAM builds), 2 to 3 points after detection
counter      = 17 to 44% above the host count; 13 reset loops, none at the comparison condition
storage sig. = 16 of 34 SRAM events vs 1 of 36 FRAM events, same device (Fisher p<1e-4)
corruption   = 9.5-fold, 1.1e-6 to 1.0e-5 cm^2 on clean-cycle exposure; functional interrupt 1.4-fold
```

Source of record: `~/Documents/RADECS-26/analysis/` (`k_direct_fit_v1.json`,
`survival_measurement_v3.csv`, `duty_factor_v3.csv`, `corruption_cross_sections_clean_cycle_v1.json`,
`call_time_budget_v1.json`, `reset_multiplicity_pileup_test_v2.json`) and manuscript package v81
(`testing-opt.tex`, `CHANGE_LOG.md`).

## Local verification

```bash
node --test tests/model.test.js
```

```bash
python3 -m http.server 8731
```

Then check <http://localhost:8731> at desktop and 400 px widths: three pages load without
console errors, the theta slider updates every output live, and the recovery page's hidden-share
estimate moves when the detection latency or the work cycle changes.

## History

- `UPDATE_PLAN_2026-09-11.md`: the work-cycle correction and the removal of the batch-size
  calculator (committed 2026-09-18 as the v2 release).
- `UPDATE_PLAN_2026-09-18.md`: the alignment with package v76 that this release implements,
  with the decisions taken: `sigma_cyc` only, two tool pages, no correction factor, form-test
  work referred to the paper, evidence page rebuilt rather than patched.
- `UPDATE_PLAN_2026-09-22.md`: the alignment with package v80 (site v4), replacing the
  withdrawn pileup fit with the measured hidden-interrupt share and adding the firmware
  comparison, the published form tests, and the storage signature.
- `UPDATE_PLAN_2026-09-22-v81.md`: the alignment with package v81 that this release (v5)
  implements: the corruption-event rate on clean-cycle exposure (9.5-fold) with Fig. 2 v18, the
  beam-on time budget and what the duty factor leaves out, and the storm census with each build's
  own host timeouts (a tenth to an eighth hidden, the corrected phase figure).
