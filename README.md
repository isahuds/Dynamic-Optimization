# Dynamic SEE Test Design Optimizer

A calculator for planning dynamic single-event effect (SEE) test campaigns. Enter six measurable
parameters and it returns how much verified data your current setup produces per hour of beam time,
what flux would maximise that, and how many hours you would save.

Companion tool to a RADECS 2026 submission on dynamic SEE test design.
IU Center for Reliable and Trusted Electronics.

## Publishing on GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → branch `main`, folder `/ (root)`. No build step,
no dependencies to install. The site is plain HTML, CSS and vanilla JavaScript; the only external
request is MathJax from a CDN for equation rendering, and the page degrades to readable text without it.

## Local preview

```bash
python3 -m http.server 8731
```

Then open <http://localhost:8731>.

## The model

Per work cycle of duration `W`, interrupts arrive as a Poisson process at rate
`lambda = phi * sigma_SEFI`. An interrupt destroys the cycle in progress and costs recovery time.
With `f` the fraction of the cycle spent exercising the circuit of interest, the effective fluence
delivered to that circuit per second of beam time is

```
Phi_eff = phi * f * eta(x, rho)
eta     = exp(-x) / (1 + rho * (1 - exp(-x)))
x       = phi * sigma_SEFI * W     interrupts per work cycle
rho     = R_eff / W                recovery cost ratio
```

Three factors, separated by who controls them: flux is the facility's, `f` is firmware design, and
`eta` is the penalty for driving the device into interrupts faster than it can produce verified
results.

### Recovery exposure

`R_eff` is **not** simply the nominal recovery time. If the beam stays on during recovery, which it
does for in-beam automatic resynchronisation, a further interrupt restarts the recovery. For a
restart-on-failure process the expected completion time is

```
R_eff = (exp(lambda * R) - 1) / lambda
```

which diverges sharply as `lambda * R` approaches 1. This term matters a great deal. Modelling
recovery as protected when it is not can invert the recommendation: for the worked example, a
constant-`R` model advises raising flux 5.3x, while the correct exposed-recovery model advises
*lowering* it by 1.5x. The checkbox in the calculator controls this and defaults to the conservative
(exposed) assumption.

With protected recovery the optimum has a closed form, `(1-u*)(1+rho) = rho*exp(-u*)` with
`phi_opt = u*/(sigma_SEFI*W)`. With exposed recovery `rho` depends on flux, so the optimum is found
numerically.

## Batch size, the second lever

Batching lengthens the work cycle, so `x = phi * sigma_SEFI * W` rises with it. That cuts both ways:
larger batches amortise fixed transfer overhead and so raise `f`, but they also enlarge the window a
single interrupt can destroy. With `W(B) = t0 + B*ts` and `f(B) = B*wc/W(B)` the tool finds the batch
size that maximises throughput.

For the worked example this lands near `B = 35`, worth about 4x the data rate of `B = 1`. The
campaign's own `B = 200` builds sat at `x` of roughly 2, meaning around two interrupts expected per
attempted batch and only 11-15% of batches surviving; between them they produced two verified
computation errors against 28 for the batch-1 build.

## Planning without known cross sections

Neither cross section has to be known in advance:

- `sigma_circ` cancels out of the optimum entirely. It scales predicted event counts and campaign
  duration, not the flux you should choose.
- `sigma_SEFI` never needs to be assumed, because the quantity that sets the operating point, `x`, is
  directly countable during a pilot run as interrupts divided by attempted work cycles. Scale flux by
  `x_target / x_observed` in steps. You get `sigma_SEFI = x_obs/(phi*W)` for free as a by-product.

The yield curve is flat near its peak, so **targeting `x ≈ 0.3` stays within roughly 15% of optimal
across a 300-fold range in recovery cost**, with no prior knowledge of either cross section. Drift to
0.5 if recovery is cheap and automatic, to 0.15 if it needs a person and a paused beam. Erring low is
much safer than erring high: the curve falls gently below the optimum and steeply above it.

## Site structure

Five pages, each with one job.

| Page | Purpose |
| --- | --- |
| `index.html` | The calculator, how to read its output, and the full symbol reference with units |
| `batch.html` | Batch size as the second lever on the operating point; finds the optimal `B` |
| `unknown.html` | Planning when the cross sections are unknown; pilot-run calculator and safe defaults |
| `background.html` | Derivation, the exposed-recovery correction, the checkpointing analogy, assumption table |
| `validation.html` | Six measured configurations from the campaign, plus the independent audit |

Shared parameters (flux, cross sections, recovery cost, target count) persist across pages in
`localStorage`, so a value entered on one page is still there on the next.

| Asset | Purpose |
| --- | --- |
| `assets/model.js` | The model, optimiser, formatting and charting. One source of truth, used by every page |
| `assets/main.js` | Calculator page |
| `assets/batch.js` | Batch-size page |
| `assets/pilot.js` | Pilot-run calculator on the unknown-cross-sections page |
| `assets/style.css` | Styling |

No build step and no dependencies beyond MathJax from a CDN for equation rendering; the pages
degrade to readable text without it.

## Status of the evidence

The algebra has been independently audited and verified, including uniqueness and global optimality
of the stationary point, and the audit also caught and corrected a real error: the original
constant-`R` treatment inverted the flux recommendation.

Empirical support comes from an MSP430FR6989 heavy-ion campaign and is of two kinds. The batch sweep
spans two orders of magnitude in `x` (0.018 to 1.88 as `B` goes 1 to 200) and behaves as predicted,
with survival collapsing to 15% and verified output effectively vanishing at `B = 200`. The
controlled clock pair agrees to 13% on implied cross section but is **under-powered**: with 28 and 7
observed errors the exact 95% interval on the ratio is 2.7 to 17.0, which cannot exclude the
competing clock-rate explanation. One configuration, `FRAM_50`, produced no verified errors where
roughly fifteen were expected, and that discrepancy is unexplained.

`validation.html` states all of this in full. Use the tool to rank candidate test designs, not to
certify a predicted yield.
