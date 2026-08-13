# Dynamic SEE Test Design Optimizer

A single-page calculator for planning dynamic single-event effect (SEE) test campaigns. Enter six
measurable parameters and it returns how much verified data your current setup produces per hour of
beam time, what flux would maximise that, and how many hours you would save.

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

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Page content, symbol reference, performance bands, validation write-up |
| `assets/calculator.js` | Model, optimiser, chart. No dependencies |
| `assets/style.css` | Styling |

## Status of the evidence

The algebra has been independently audited and verified, including uniqueness and global optimality
of the stationary point. The empirical support is currently **one under-powered comparison** from an
MSP430FR6989 heavy-ion campaign: predicted 7.25x versus observed 6.28x, but with an exact 95%
confidence interval of 2.7 to 17.0 that cannot exclude the competing clock-rate explanation. The
`index.html` validation section states the limitations in full. Use the tool to rank candidate test
designs, not to certify a predicted yield.
