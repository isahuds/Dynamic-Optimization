# Dynamic SEE Test Design

Companion site for Hudson, Hunnicutt and Loveless, "Design Strategies for Dynamic
Single-Event Effect Testing of Algorithmic Computation," IEEE Trans. Nucl. Sci. (RADECS 2026).
A designer plugs in a lost-cycle cross section, a work-cycle time and a target share of
surviving cycles, and reads off the flux to run or the longest cycle a flux allows. A second
page charges the test for recovery time and bounds the flux by the dead time recovery imposes.

Built against manuscript package `TNS_REMEDIATION_2026-09-17-v76`. If the site and the paper
disagree, the paper wins.

## The relation

```
theta = exp(-sigma_cyc * phi * W)          share of work cycles that survive
phi * W = -ln(theta) / sigma_cyc           the same product for every pair on the rule
D = theta W / (W + (1 - theta) tau)        duty factor; tau = 0 returns D = theta
theta = D (W + tau) / (W + D tau)          inverted for a target D
phi* <= 1 / (sigma_cyc tau_d)              counted rate peaks no higher than this
W_min = -ln(theta) tau_d                   shortest cycle a target theta allows
```

The survival form is Young (1974) and Daly (2006); choosing flux from it is Zimmaro et al.
(RADECS 2022). The direct count of surviving cycles across a 41-fold work-cycle range on heavy
ions, the recovery charge, and the pileup bound are the companion paper's.

Only `sigma_cyc`, lost cycles over in-cycle fluence, belongs in the rule. A reset-counter or
recovery-record cross section counts over full beam-on exposure and overstates the surviving
share. The site does not apply a correction factor for that; it says to measure the right
quantity instead.

## Pages

| Page | Purpose |
| --- | --- |
| `index.html` | Flux for a work cycle, or longest work cycle for a flux, from `sigma_cyc` and `theta` |
| `recovery.html` | Duty factor and its inverse, the pileup ceiling, the shortest work cycle |
| `background.html` | The relation with attribution, the six-build measurement, recovery and pileup evidence, Table III quantities, facility ranges, references |

| Asset | Purpose |
| --- | --- |
| `assets/model.js` | Constants and the six functions above; formatting helpers |
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
theta        = 0.51 to 0.98    588 of 20,459 cycles lost over six builds, W 20 to 814 ms
longest W    = 285 ms          theta 0.80, phi 5e4
tau          = 0.58 to 1.28 s  mean per lost cycle; settle 0.165 s for every build
D            = 0.28 to 0.66    35 to 72% of test time bought no countable exposure
tau_d        = 0.332 s         LET 2.3-4.1 group (fitted); 0.414 s at the comparison LET
sigma_fit    = 1.16e-4 cm^2    fit parameter, R2 0.94; does not transfer across LET
phi*         = 26,055          that group's peak; reset-counter refit 24,806
ceiling      = 1.5 to 1.9e5    1/(sigma_cyc tau_d) at the comparison LET
shortest W   = 74 to 92 ms     theta 0.80
```

Source of record: `~/Documents/RADECS-26/analysis/` (`k_direct_fit_v1.json`,
`survival_measurement_v3.csv`, `duty_factor_v3.csv`, `pileup_numerator_robustness_v1.json`).

## Local verification

```bash
node --test tests/model.test.js
```

```bash
python3 -m http.server 8731
```

Then check <http://localhost:8731> at desktop and 400 px widths: three pages load without
console errors, the theta slider updates every output live, and the recovery page's verdict
flips when the work cycle is shorter than the shortest-cycle output.

## History

- `UPDATE_PLAN_2026-09-11.md`: the work-cycle correction and the removal of the batch-size
  calculator (committed 2026-09-18 as the v2 release).
- `UPDATE_PLAN_2026-09-18.md`: the alignment with package v76 that this release implements,
  with the decisions taken: `sigma_cyc` only, two tool pages, no correction factor, form-test
  work referred to the paper, evidence page rebuilt rather than patched.
