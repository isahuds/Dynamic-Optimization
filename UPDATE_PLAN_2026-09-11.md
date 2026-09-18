# Update plan — aligning the design tool with the 2026-09 manuscript

**Status:** plan only, nothing implemented.
**Author:** isahudso
**Date:** 2026-09-11
**Companion paper:** Hudson et al., "Design Strategies for Dynamic Single-Event Effect
Testing of Algorithmic Computation" (RADECS 2026 / IEEE TNS), current package
`~/Documents/RADECS-26/paper/TNS_REMEDIATION_2026-09-10-v57/`.

The site was last touched 2026-09-01. Since then the campaign's work-cycle timing was
corrected, the clean-cycle fraction was rebuilt on an unconditioned trial population,
the recovery cost was re-measured, the pileup fit was replaced, and the paper's argument
was reordered around a different headline. This document records what that means for the
site and what to do about it.

---

## 0. Attribution — what is ours and what is not

**This matters for the site more than for the paper**, because a tool presents formulas
without the surrounding prose that normally carries credit. Every equation below is
labelled with its origin. Nothing in the "prior work" column originated here.

| Concept | Origin | Our contribution, if any |
|---|---|---|
| The flux-selection methodology this tool implements | **Zimmaro et al., RADECS 2022** | We test it and extend it |
| Probability of observing a rare mode before a dominant one, `P_OB = P_SF · (1 − P_MF)` | **Zimmaro 2022, Eq. (1)** | none |
| Observability fluence, `Φ_OB = φ · FWCT` | **Zimmaro 2022, Eq. (2)** | none |
| Mean time before first observation, `MTBFO = FWCT / P_OB` | **Zimmaro 2022, Eq. (3)** | none |
| Full Working Cycle Time (FWCT) as the governing interval | **Zimmaro 2022** | We vary it deliberately; Zimmaro treats it as intrinsic to the device |
| The survival term `(1 − P_MF)`, which this site calls θ | **Zimmaro 2022** | **First measurement of it against a deliberately varied cycle length, on heavy ions** |
| Exponential survival under constant-rate interruption | **Young 1974; Daly 2006** (checkpointed computation) | We invert the problem: flux sets the rate, so the experimenter chooses it |
| Mean work to SEFI (MWTS), work completed between interrupts | **Esquer et al., RADECS 2022** | We report it at matched flux and LET, removing a confound their values carry |
| Paralyzable dead-time model, `λ(φ) = kφ·exp(−kφτ_d)` | **Knoll, *Radiation Detection and Measurement*** | We measure τ_d directly rather than fitting it |
| Flux-dependent masking of recoverable events by long recovery | **Zimmaro et al., TNS 2022** (proton and mixed field) | We show it under heavy ions, where fast recovery makes it *quiet* |
| System-level cross section combined with downtime to express availability | **Coronetti et al., TNS 2021** | Our duty factor is the test-time analogue |
| Active-time fraction; the 20 % dead-time cap | **ESCC No. 25100** (both stated inside its latch-up provisions) | We note the standard gives *no* flux guidance for SEFI |
| Automated beam shutter with logged closed time subtracted from fluence | **Wilcox et al., NASA GSFC 2017** | Cited as the arrangement that would remove our blind spot |
| Flux-independence of a static cross section at fixed LET as a validity criterion | **Berg et al., TNS 2009** | none |
| Heavy-ion SEE test procedure | **JEDEC JESD57A** | none |
| Slowdown eroding a mitigation's gain on an MSP430 | **Bohman et al., TNS 2019** | Same tradeoff, our device family |
| Reboot downtime consuming over half of irradiation time | **Frías-Domínguez et al., TNS 2025** | Independent corroboration of our recovery cost |
| HPC rule capping flux by execution duration | **Rech et al. 2014; Oliveira et al. 2017** | Closest structural analogue outside RHA, inverted objective |

**Ours, and new:**

1. The survival term measured directly against a work cycle varied 41-fold at matched
   flux and LET, on heavy ions, at component level.
2. The demonstration that a rate taken from a recovery log runs optimistic by about
   1.6× on the loss scale, and why.
3. The extension of the relation to charge a test for the time it spends recovering
   (the duty factor `D` below), which reduces to Zimmaro's form when that time is zero.
4. The argument that the usable flux is capped by the pileup peak rather than by the
   survival relation, and that recovery speed sets where that cap falls.

**Rule for the site:** anywhere an equation is shown, name its source in the same view.
Zimmaro in particular must be credited on the landing page, not only in `background.html`.

---

## 1. Terminology

Defined once here; the site's `glossary.html` should be rewritten against this table.
Several terms were coined locally before we knew the field already had a word for them,
so the established name is given first where one exists.

| Term | Symbol | Definition | Established name |
|---|---|---|---|
| Work-cycle time | `W` | Time for one complete cycle of work, from input issue to the delivery of a result, measured **event-free** (no interruption occurred). Bench-measurable with the beam off. | **FWCT**, Full Working Cycle Time (Zimmaro). Ours is measured; his is a specification value. |
| Clean-cycle fraction | `θ` | Probability that a work cycle of length `W` completes without an interruption. | `(1 − P_MF)` evaluated at `Φ_OB` (Zimmaro). No established single word exists. |
| Interruption rate | `λ` | Rate at which work cycles are **destroyed**, per second of time the device spends **working**. Not per second of beam time. See §3. | — |
| Rate per unit flux | `k` | `λ/φ`. The cycle-destroying rate per unit flux. A functional-interrupt cross section is the usual stand-in for it, and the two are not equal. | `σ_MF` (Zimmaro) |
| Flux | `φ` | Particle flux at the device, cm⁻² s⁻¹. | — |
| Observability fluence | `Φ_OB` | `φ · W`. The fluence delivered during one work cycle. | **Zimmaro, Eq. (2)** |
| Recovery cost per lost cycle | `τ` | **Mean** wall-clock time a destroyed cycle costs the test, from interruption to the resumption of useful work. A mean, not a median — see §3. | — |
| Dead time after one interrupt | `τ_d` | Interval following a single interruption during which the device is exposed but cannot register a new countable event. Distinct from `τ`: one lost cycle may carry several interrupts. | dead time (Knoll) |
| Duty factor | `D` | Share of test time that becomes countable exposure, `D = θW / (W + (1−θ)τ)`. Stricter than the active-time fraction, since it also requires the cycle to survive. | — (ours; the active-time fraction is ESCC's) |
| Active-time fraction | — | Share of facility beam time during which the controller was observing at all. ESCC asks that this be measured and applied to a cross section. **Not the same as `D`, and not the same as the working-time share.** | **ESCC No. 25100** |
| Pileup peak | `φ*` | Flux at which the *counted* interruption rate is maximised, `φ* = 1/(k_fit·τ_d)`. Above it the counted rate falls while the true rate rises. | paralyzable model (Knoll) |
| Optimism factor | — | Ratio of predicted to measured work-cycles-per-lost-cycle when `λ` is taken from a recovery log. Measured here at 1.63, 95 % interval 1.45–1.85. | — (ours) |
| Functional interrupt | — | Loss of the device's ability to deliver results, requiring a restart. **We deliberately avoid "SEFI"**, because single-particle attribution cannot be established for these events. | HLF, hard loss of functionality (Coronetti) |
| Corruption event | — | A delivered result that does not match golden output. Again not "SEU", for the same attribution reason. | — |

**Terminology warnings to carry into the UI:**

- **"Duty cycle" is ambiguous in this literature.** ESCC uses it for the fraction of
  time a device is active and vulnerable; Coronetti uses it for a test scheme of
  repeated operational cycles. Never use it unqualified. This site's `D` is a *duty
  factor* and should always be spelled out.
- **Three event counts exist and must never be conflated**: device resets > host-detected
  recovery episodes > destroyed work cycles. For this campaign, 298/242/198 on
  `FRAM_B1`. The site currently uses the middle one while labelling it as though it
  were the last.

---

## 2. Blocking finding — the site computes with a retired work-cycle model

`assets/model.js` carries

```js
var W0 = 0.025145;   // s
var TS = 0.007077;   // s
```

These give a B=1 cycle of **32.222 ms**. That is `W_ms_v1_published` = 32.223 ms in
`analysis/config_alignment_v2.csv` — the work-cycle value this project audited and
replaced on 2026-09-05. The corrected values are

```js
var W0 = 0.015947;   // s
var TS = 0.003998;   // s
```

giving **19.945 ms**, which matches `theta_validation_v3.csv` exactly.

The correction is not a preference. Beam-off LET0 control runs, which carry no beam and
therefore no destroyed cycles, measure the undisturbed cycle directly and agree with the
corrected `W` to within 1.5 %, while rejecting the old value at 1.57–1.98× depending on
configuration.

**Consequence:** every number the tool currently produces is wrong. Selected examples:

| Batch size | Site says | Correct |
|---|---|---|
| B = 1 | 32.2 ms | **19.9 ms** |
| B = 50 | 379.0 ms | **215.8 ms** |
| B = 200 | 1440.5 ms | **815.5 ms** |

Required flux, wall-clock time, `B*`, and the landing page's worked example all inherit
this. Fix the constants first, independently of any feature work.

---

## 3. Staleness audit

| Constant in `model.js` | Site | Current | Source of the current value |
|---|---|---|---|
| `W0` | 25.145 ms | **15.947 ms** | paper §IV-A; `config_alignment_v2.csv` |
| `TS` | 7.077 ms | **3.998 ms** | same |
| `PILEUP.k` | 1.072e-4 | **1.157e-4** cm² | `build_pileup_let_stratified_fit.py` |
| `PILEUP.tau` | 0.4275 s | **0.332 s** | same, measured per LET group |
| `PILEUP.peakFlux` | 21,826 | **26,055** cm⁻²s⁻¹ | same |
| `CAMPAIGN.pileupR2` | 0.386 | **0.941** | 0.386 was the *discredited* pooled fit, in which LET and flux were confounded |
| `CAMPAIGN.autoSuccessRate` | 0.961 | **0.953**, or 0.714 censored-as-failure | paper §III; handshake-based scoring cannot fail and was replaced |
| `CAMPAIGN.medianRecovery_s` | 0.165 s | τ = **0.58–1.28 s** per lost cycle | `duty_factor_v3.csv` |
| `POOLED` λ | logged only | logged **0.416** s⁻¹ *and* fitted **0.7916** s⁻¹ | `theta_validation_v3.csv`; `survival_shape_power_v1.json` |
| θ measured | **absent** | 0.509–0.984 per build | `theta_validation_v3.csv` |
| `CAMPAIGN.episodes` / `admittedVectors` | 107 / 1303 | needs re-derivation | trial population changed under the v3 rebuild |

### Why `τ` moved, since this one is easy to get wrong again

Equation (4) defines `τ` as the **mean** cost per lost cycle. The site stores the
**median** of a single automatic recovery. On the six reference runs the recovery-duration
distribution has two populations:

| population | n | median | mean |
|---|---|---|---|
| automatic success | 757 | 0.165 s | 0.381 s |
| automatic failure | 37 | 5.052 s | 6.795 s |
| all | 794 | **0.165 s** | **0.680 s** |

The median sits inside the first population and is blind to the second, which is where
the cost lives: 4.7 % of recoveries carry 47 % of beam-on recovery time and almost all
of the beam-paused time. Multiplying the mean episode duration by episodes per lost
cycle gives `τ` of 0.58–1.28 s. Duty factors fall by 1.23× to 1.92× against the old
charge.

### The rate hierarchy, which the site currently flattens

Three rates exist and the site exposes only the first:

| Rate | What it is | Use |
|---|---|---|
| `λ_pub` = episodes / beam-on seconds | What a recovery log gives you directly. **Biased low.** | What a designer actually has. Apply the optimism factor. |
| `λ_MLE` = −ln(θ)/W per build | Algebraically a restatement of θ. Zero degrees of freedom. | **Never** as evidence. |
| `λ_pooled` = 0.7916 s⁻¹ | One rate fitted across all six builds, 95 % CI 0.73–0.86, p = 0.22. | Validates the exponential form. **Cannot be computed prospectively** — it needs measured θ across several cycle lengths, so it is never a design input. |

---

## 4. Proposed structure — three tiers

The request was a simple path for minimal part information and a complex path for
maximum pre-test insight. There are in fact **three** useful stopping points, because a
genuinely helpful answer is available with no part knowledge at all.

Implement as one page with progressive disclosure, not three pages. A designer starts at
Tier 0 and fills in more as the campaign teaches them.

### Tier 0 — no part information

**Inputs:** work-cycle time `W` (measure on the bench, beam off), target clean-cycle
fraction `θ`.

**Output:** the interruption-rate budget

```
λ_target = −ln(θ) / W
```

plus the pilot procedure: run two or three short pilots, measure the rate, adjust flux,
then hold it fixed for the campaign. No cross section required.

**Attribution shown:** survival form after Young (1974) and Daly (2006); the flux-selection
framing after Zimmaro et al. (RADECS 2022).

### Tier 1 — a cross section is available

**Adds:** `k`, from a datasheet, an analogue part, or a first pilot.

**Outputs:** required flux from

```
φ · W = −ln(θ) / k
```

This fixes a frontier in the product `φ·W`. That product is Zimmaro's observability
fluence `Φ_OB` (his Eq. 2); solving it against a target θ is ours.

wall-clock beam-on time `T = Φ_target / φ`, and a check against the pileup ceiling.

**The tool must ask where `k` came from.** If it is a reset count or a recovery log,
apply the optimism factor 1.63 [1.45, 1.85] and say so **on the face of the result**,
not in a footnote. This is the paper's practical finding and it is the single most
useful thing the site can tell a designer.

### Tier 2 — recovery characterized

**Adds:** `τ` (mean cost per lost cycle), escalation fraction, pause duration, `τ_d`.

**Outputs:**

```
D = θW / (W + (1−θ)τ)                      duty factor
θ = D(W + τ) / (W + Dτ)                    inverted, for a target D
φ* = 1 / (k_fit · τ_d)                     pileup ceiling
```

plus beam-on hours against facility hours, and an explicit statement of **which
constraint binds**. For this campaign the pileup ceiling binds at every work cycle
tested, by 2.6× to 37×.

Setting `τ = 0` returns `D = θ`, recovering Zimmaro's form. The site should show that
reduction explicitly, so the extension is visibly an extension rather than a competitor.

---

## 5. Decisions needed before implementation

**5.1 `batch.html` — RESOLVED 2026-09-11: deleted.** The batch-size optimum `B*` was cut
from the manuscript because it was an upper bound resting on an assumption the paper itself
doubts (that the probability a batch survives uninterrupted does not depend on batch size),
and because it was the one remaining derivation of an optimum in a paper that otherwise
declines to fix one. Presenting it as a calculator implied a lever the work does not
support, so it is gone: `batch.html`, `assets/batch.js`, and the whole renewal-reward
apparatus in `model.js` (`W0`, `TS`, `workCycle`, `bstarFormula`, `wstarFormula`,
`throughput`, `costPerResult`, `optimalBatchExact`, `bstarAtFlux`, `VALIDATION`,
`drawCurve`), plus four sections of `background.html` and the `B*` glossary entry.

What was deliberately KEPT: the descriptive mapping `W = W0 + B*ts`, which is still in the
paper at Section IV-A. Batch size does set the work cycle, and a reader should understand
that a longer batch is a lower clean-cycle fraction. It appears in the glossary as a
description with the corrected constants (15.947 ms, 3.998 ms) and the caveat that they do
not transfer across clock or storage, not as a calculator.

**5.2 How much narrative to carry.** `background.html` and `validation.html` predate the
entire literature repositioning: Zimmaro's own stated limitations, the ESCC SEFI gap, the
action-log generalization, the flux-ceiling argument. A numbers-only refresh is cheap but
leaves the site arguing the previous story.

---

## 6. Work order

| # | Work | Effort | Notes |
|---|---|---|---|
| 1 | Constants in `model.js`, and `tests/model.test.js` which pins them | ~half a day | Correctness fix. Unblocks everything. Do first regardless of §5. |
| 2 | Add missing model: measured θ per build, duty factor `D` and its inverse, optimism factor, fitted pooled rate, Clopper-Pearson intervals on θ | ~1 day | Straight ports from `theta_validation_v3.csv` and `duty_factor_v3.csv` |
| 3 | Restructure `index.html` into the three tiers | ~2 days | Bulk of the UI work |
| 4 | `validation.html` re-derived against current releases | ~1 day | |
| 5 | `background.html` narrative rewrite, with attribution per §0 | ~1 day | Only if the site should match the paper's argument |
| 6 | `batch.html` per the §5.1 decision | ~half a day | |

Steps 1–3 give a correct and substantially more useful tool. Steps 4–6 are alignment.

### Test-suite notes

- 22 tests currently pass, but `node --test tests/` fails on module resolution. Use
  `node --test tests/model.test.js`.
- Assertions pin the stale constants directly (`assert.equal(S.W0, 0.025145)`), so they
  must change in the same commit as step 1.
- Add a regression test asserting `W0 + TS` equals the measured `W` for B=1 in
  `theta_validation_v3.csv` to within 0.1 %, so this class of drift fails loudly next time.

---

## 7. Source of record

Every number above traces to the RADECS-26 repository, not to this one:

- `analysis/theta_validation_v3.csv` — θ, W, trial populations, logged rates
- `analysis/duty_factor_v3.csv` — measured τ and duty factors
- `analysis/survival_shape_power_v1.json` — pooled fit, homogeneity, power
- `analysis/build_pileup_let_stratified_fit.py` — pileup fit, run it to reproduce
- `analysis/config_alignment_v2.csv` — corrected and superseded `W` side by side
- `memory/START_HERE.md` — session router
- `memory/WORKING_TIME_LAMBDA_REJECTED_2026-09-11.md` — why `λ` cannot be corrected on
  the working-time basis, recorded so it is not attempted again
- `memory/BEAM_TIME_BOOKING_AND_TAU_2026-09-11.md` — τ, booking, pileup as the binding
  constraint

**Do not re-derive these here.** If a number in the site disagrees with the paper
package, the paper package wins.
