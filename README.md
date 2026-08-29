# Dynamic SEE Test Optimization

Companion site for Hudson et al., "Design Strategies for Dynamic Single-Event Effect Testing
of Algorithmic Computation" (RADECS 2026 / IEEE TNS). The site is a practical pre-campaign
design tool: pick a flux by balancing crash-free coverage against time to reach a target
fluence, with batch size demoted to an optional secondary refinement.

## The formula

Flux is the primary decision, chosen once and held fixed for the whole run. Work-cycle time
`W` is treated as fixed and application-specific, not something the tool assumes you can tune.
Pick a target clean-cycle fraction `theta` (probability a work cycle of length `W` completes
without an interruption) and solve for the interruption rate that hits it:

```
lambda_target = -ln(theta) / W
```

`theta` exists because the two natural objectives — crash-free coverage (wants low flux) and
minimum time to a target fluence (wants high flux) — are monotonically opposed with no interior
optimum; combining them without a quality target degenerates to "flux toward zero." Fixing
`theta` turns that into a single well-posed answer: the highest flux consistent with your own
quality bar, and the wall-clock time it implies (`T = fluence / flux`).

To find the flux that gives you `lambda_target`: pilot at a candidate flux, measure `lambda`
directly, and adjust up or down (2-3 short pilots usually converge). If you have a fitted
pileup curve `lambda(phi) = k*phi*exp(-k*phi*tau)`, invert it directly instead — taking only
the lower/rising-branch root; the upper root is spurious. If `theta` is looser than the
interruption rate ever gets even at the pileup peak, your quality target was never the binding
constraint — pileup fidelity is, and flux should be capped there instead.

### Batch size (optional, secondary)

For test architectures with a tunable checkpoint interval, the renewal-reward checkpoint model
gives the throughput-optimal batch size as

```
B* = (sqrt(2 W0 / lambda) - W0) / ts
```

This campaign's calibrated values (`W0 = 25.145 ms`, `ts = 7.077 ms`, `lambda = 0.416 s^-1`)
give `B* ~ 46`. B* is an upper bound, not a point estimate — the silent-corruption probability
`p_V` may decline with batch size, and the correction is sign-determinate: the risk-aware
optimum sits at or below B*, never above it. This refines throughput at a flux already chosen;
it does not change the flux decision, and tests with a fixed, non-configurable work cycle can
skip it entirely.

## Site structure

| Page | Purpose |
| --- | --- |
| `index.html` | Pre-campaign design tool: flux-primary formula, worked example, theta-vs-wall-time tradeoff |
| `glossary.html` | Every term used across the site, defined |
| `batch.html` | Optional secondary batch-size calculator, for tunable-checkpoint architectures |
| `unknown.html` | Prospective seven-gate Poisson reporting and pre-campaign checklist |
| `background.html` | Flux-primary derivation, pileup explainer, batch-size renewal-reward model, rate hierarchy |
| `validation.html` | Tier 1+2 counting census, operational statistics, recovery, heterogeneity |

| Asset | Purpose |
| --- | --- |
| `assets/model.js` | Flux-primary formula, pileup model, sourced facility flux ranges, batch-size refinement, Garwood intervals |
| `assets/main.js` | Index page rendering: live formula inputs, worked example, theta sweep table |
| `assets/batch.js` | Batch-size calculator: inputs, presets, throughput curve, comparison table |
| `assets/pilot.js` | Prospective seven-gate statistics UI |
| `assets/style.css` | Shared presentation |

The pages are plain HTML, CSS, and vanilla JavaScript. MathJax is loaded from a CDN for
equation rendering; the source equations remain readable if the CDN is unavailable.

## Facility flux ranges

Sourced for the achievable-range check on the pre-campaign tool. TAMU is excluded — the
Cyclotron Institute's own materials and the National Academies' facility survey both describe
energy/LET/ion-species range and beam-hours but no numeric flux ceiling.

| Facility | Heavy-ion flux (cm^-2 s^-1) |
| --- | --- |
| LBNL 88-Inch Cyclotron (BASE) | up to ~1e7 |
| BNL Tandem Van de Graaff (SEU Test Facility) | 1e2 - 1e5 |
| MSU NSCL K500/K1200 (SEETF) | 7.7e1 - 2.5e5 |

## Local verification

Run the no-dependency model tests:

```bash
node --test tests/model.test.js
```

Start a local server:

```bash
python3 -m http.server 8731
```

Then inspect <http://localhost:8731> at desktop and narrow mobile widths. Browser QA must
confirm that all six pages load without console errors, the theta slider on the pre-campaign
tool updates the required-lambda and worked-example outputs live, the batch calculator's
per-configuration preset buttons update lambda and recompute B*, all seven unchecked gates on
the prospective-statistics page withhold numerical output, and an eligible zero shows only
`2.995732273553991 / fluence`.

## Zero-event convention

- Eligible `n > 0`: `n / fluence` with an exact two-sided 95% Garwood interval.
- Eligible `n = 0`: no point estimate and no two-sided interval; only the conventional
  one-sided 95% upper limit `-ln(0.05) / fluence = 2.995732273553991 / fluence`.
- Any failed gate, including no opportunity: all numerical fields remain blank.

## Key numerical values

```
theta_default = 0.80         (clean-cycle-fraction default; a starting point, not a standard)
fluence_default = 1e7        (ions cm^-2, common experimenter target)
W0      = 0.025145 s         (event-free fixed overhead, batch-size refinement only)
ts      = 0.007077 s         (marginal time per result, batch-size refinement only)
lambda  = 0.415918 s^-1      (pooled FRAM 16 MHz trigger rate)
B*      = 45.580             (continuous optimum; upper bound; optional refinement)
k       = 1.0688e-4 cm^2     (pileup per-ion trigger cross section)
tau     = 0.4406 s           (pileup dead time)
phi*    = ~2.1e4 cm^-2 s^-1  (pileup onset / peak flux)
```
