# Update plan, 2026-09-22 (second pass): aligning the site with manuscript v81

**Status:** implemented 2026-09-22 (release v5).
**Author:** isahudso
**Companion paper:** Hudson, Hunnicutt, Loveless, "Design Strategies for Dynamic Single-Event
Effect Testing of Algorithmic Computation," IEEE TNS (RADECS 2026). Package of record
`~/Documents/RADECS-26/paper/TNS_REMEDIATION_2026-09-22-v81/testing-opt.tex` (12 pp, final limit),
with its `CHANGE_LOG.md`, `V81_DIFF_vs_v80.diff` and `numeral_audit_v80_to_v81.txt`.
**Supersedes:** `UPDATE_PLAN_2026-09-22.md` (the v80 pass) for everything below; its decisions
otherwise stand. This file carries a `-v81` suffix because the v80 plan was written the same day.

---

## 1. What v80 to v81 changes for the site

| # | Topic | v80 (site v4 had) | v81 (site v5 says) | Where on the site |
|---|---|---|---|---|
| 1 | Corruption-event exposure basis (III-B, Table II, abstract, I, VI) | Beam-on exposure × θ; 6.1-fold, 4.1e-7 to 2.5e-6 cm² | Fluence delivered during the work cycles that returned a result (in-cycle exposure × θ); **9.5-fold, 1.1e-6 to 1.0e-5 cm²**. SRAM_Mixed_B200 highest, SRAM_B1 second, level with FRAM_B1_Throttled. The functional-interrupt rate sits three- to eightfold above the corruption rate in four of the five comparable builds and level with it in SRAM_Mixed_B200. Batch χ² 0.6 on 2 dof (p = 0.73); clock χ² 18.7 on 3 dof (p < 0.001). | `background.html#comparison`, `model.js` `CORRUPTION`, README |
| 2 | Fig. 2 | Not on the site | v18 (FRAM builds left, SRAM right, SRAM_B1 last; clean-cycle squares), SHA-256 prefix `d0f19eae36767389` for the PDF in the package | `#comparison`, new `assets/img/firmware_cross_sections_scatter_v18.png` |
| 3 | Where beam-on time goes (III-B, new) | Not on the site; an unrendered `CAMPAIGN.inCycleShare` (32 to 56%) left over from an older package | 24 to 43% of beam-on time in a call fell within work cycles. Recovery took 14 to 36%, the host's wait to detect an interrupt up to 29%, and re-running cut-short cycles 1 to 2% at B = 1 but about 40% at B = 200. A re-run is not counted as a new work cycle. | `model.js` `TIME_BUDGET` (replaces `inCycleShare`), `#recovery`, `recovery.html` campaign card |
| 4 | D against the measured countable share (IV-B) | The site called 1 − D "test time buying no exposure" and said nothing of what D leaves out | D charges recovery alone, so it is an upper bound. Measured directly, the countable share of beam-on time is 12 to 42%. Adding the measured detection wait, 0.7 to 1.1 s per lost cycle, to τ brings D within 0.02 to 0.05 of it at B ≤ 50 (FRAM_B1: 0.39 against 0.37). The 34 to 72% is of **in-cycle and recovery time**; measured directly, 58 to 88% of beam-on time produced no countable exposure (VI). | `recovery.html` (τ help, D note, outputs, campaign card), `recovery.js` labels, `#recovery`, `model.js` |
| 5 | The IV-A caution on beam-on cross sections | "credits exposure during windows in which no cycle could be interrupted" | Beam-on exposure includes the time outside attempted work cycles spent handling interrupts (III-B's budget) | `#validation`, `index.html` "Which cross section to use" |
| 6 | Storm census v2 (IV-B, V, VI) | Reset-counter excess 15 to 30%; fourteen loops, one at the comparison condition; about a tenth hidden (6 to 15%); about 2 points after detection; true rate about a tenth above the host count and below the counter | Excess **17 to 44%**; **13 loops** of 21 to 62 resets, **none at the comparison condition**, and σ_FI counts every reset in them; **a tenth to an eighth (6 to 17%)**; **2 to 3 points** after detection; true rate **12 to 16% above** the host-detected rate and **7 to 10% below** the reset-counter rate, the range reflecting one 21-reset failure the loop test can read either way; a shutter removes only the 2 to 3 points; the host's wait and timeouts also took up to 29% of beam-on time | `#pileup` (anchor kept), `recovery.html` hidden-interrupt card, `model.js` `DETECTION`, README |
| 7 | Hidden-reset phase figure and table | v1: timeout bar 19 of 75, labelled "Timeout of 5 or 10 s" | v2: **20 of 76 (26%)**, "timeout or failed transfer, host wait up to 2 to 20 s by build" (53 of the 76 failed before their timeout). The other four bars do not move. No reset loop falls at this condition. | `assets/img/hidden_reset_phases_v2.png` (v1 removed), `detectionRows()`, `DETECTION` |
| 8 | Data-fault response wording (II-B, II-D) | "repeated transfer" | "repeated iteration" (input resent, result recomputed) | Checked: the site never describes the data-fault response. No change. |
| 9 | II-D vocabulary | The Quantities note said "Counted errors are functional interrupts and corruption events" | Two primary quantities, the functional interrupt and the corruption event; a counted error is the screened, corrupted result that feeds corruption events only | `#quantities` note |
| 10 | Table II corruption-event basis | No corruption-event row in the site's Quantities table | Row added: in-cycle time of attempted cycles, scaled by θ | `#quantities` table |

**Unchanged in v81 and re-checked against the v81 text:** σ_cyc = 1.56e-5 cm² (0.78 s⁻¹ at 5e4),
θ 0.51 to 0.98, 588 of 20,459, the 41-fold W range, 135 ms at θ = 0.90, τ 0.58 to 1.28 s,
D 0.28 to 0.66 (four published), 34 to 72%, the form tests (G² 6.4 on 5 dof, p = 0.27; pure-FRAM
p = 0.56; Weibull β 0.98, 0.92 to 1.04), σ_FI 9.4e-6 cm² and 7.7 to 11.1e-6 (1.4-fold), the storage
signature (16 of 34 against 1 of 36, Fisher p < 1e-4; 84% against 26%; 30 of 35 matches at a stored
sample, 24 in SRAM builds), the 0.165 s settle, 4% and 16% resync failure, the failed-resync host
timeout of five or ten seconds (v81 IV-B; this is the resync window, not the transfer timeouts of 2 to
20 s in item 7), 95.3%, 96.4%, 71.4%, 93.7 s and 84.6 s, one interrupt in eleven, 1,856 interrupts,
0 of 150, 18% (62 of 338), about 2% (3 of 150, 8 of 338), and Zimmaro's 3.76-fold over 10.5-fold.

**Pre-existing mismatches found in this pass and corrected (not v81 changes):**

- The Quantities table said "As defined in the companion paper's Table III", but its σ rows come from
  Table II. It also placed beam-on time in §III-A, where Table III gives §II-D.
- Dead constants in `model.js`: `inCycleShare` (32 to 56%, from an older package), and
  `cyclesPerLostCycleSpreadFold: 31`, the retired "31-fold". Neither is rendered or tested; both are
  removed. `hostTimeout_s` is renamed `resyncTimeout_s`, so it cannot be mistaken for the per-build
  transfer timeouts that the v2 census corrected.
- At 400 px, `background.html` scrolled sideways to 502 px because the facilities table was the only
  table not wrapped in `.table-wrap`; it is wrapped now.

---

## 2. What changes, by file

- **`assets/model.js`**: `RELEASE` → `flux-selection-design-tool-v5-2026-09-22` /
  `TNS_REMEDIATION_2026-09-22-v81`. New `CORRUPTION` (basis, range, 9.5-fold, rank note, batch and
  clock tests, 3 to 8× against σ_FI). New `TIME_BUDGET` (the III-B and IV-B shares and the D check).
  `DETECTION`: timeout 20 of 76 with its 2 to 20 s wait range, counter excess 17 to 44%, 13 loops with
  none at the comparison condition, loss 6 to 17%, 2 to 3 points after detection, true rate 12 to 16%
  above the host count and 7 to 10% below the counter. `CAMPAIGN`: `corruptionSpreadFold` 9.5,
  `testTimeNoExposure` renamed `uncountedCycleAndRecoveryShare`, new `uncountedBeamOnShare` (58 to
  88%; its complement is `TIME_BUDGET.measuredCountableShare`, 12 to 42%), dead constants removed as
  above. `detectionRows()` label fixed; new `timeBudgetRows()` renders the III-B shares for both pages.
  Header comment points at v81.
- **`tests/model.test.js`** (19 → 25 tests): release pins; the new timeout share (26%, 20 of 76) and
  label, with the old "5 or 10" and "19 of 75" asserted absent; the storm-census and hidden-loss
  ranges; `CORRUPTION` and `TIME_BUDGET` pins; 1 − D over the six builds reproducing 34 to 72%; the
  FRAM_B1 check that τ plus the low end of the printed 0.7 to 1.1 s wait gives the printed D of 0.39;
  and `timeBudgetRows()`. The renamed constant is pinned under its new name.
- **`background.html`**: `#validation` caution (item 5); `#comparison` rewritten for the clean-cycle
  basis with Fig. 2 v18 added above Fig. 3; `#recovery` gains the beam-on time budget and the D check;
  `#pileup` updated (items 6 and 7); Quantities note and table (items 9, 10 and the pre-existing fix);
  metric tiles re-worded.
- **`recovery.html`** / **`assets/recovery.js`**: τ help text, D note and output labels (item 4); the
  hidden-interrupt card (items 6 and 7) with the v2 figure; the campaign card gains the time budget.
- **`index.html`**: the one sentence of item 5.
- **`assets/style.css`**: one modifier, `.fig.fig-narrow` (width 100%, max 460 px, centred), for the
  tall Fig. 2 so it does not fill the card at desktop width and still shrinks on a phone.
- **`README.md`**: package v81, key values, history entry.
- **`assets/img/`**: add `firmware_cross_sections_scatter_v18.png` and `hidden_reset_phases_v2.png`
  from `~/Documents/RADECS-26/paper/`; delete `hidden_reset_phases_v1.png`, which no page references.
- Cache-busting query strings move from `?v=20260922` to `?v=20260922-v81`, since the v4 assets
  carry the same date.

---

## 3. Deliberately not changed

- **The III-B basis test** (17 of 95 events in the first clean cycle after an interrupted one,
  against 14.3 expected on the in-cycle basis and 53.6 on v80's): the PI commented it out of v81, so
  the paper withholds it and the site does not show it.
- **Per-build time-budget values** (e.g. which build's detection wait reached 29%): the paper prints
  ranges only, so the site does too.
- **The Limitations loop disclosure** (the sweep falls from 4,448 to 3,951 if each loop is credited
  once; the one-per-transition floor gives 730, 1.21-fold, p = 0.64): the site shows neither the sweep
  nor a shared-rate rejection, so there is nothing for it to qualify.
- **The hidden-share estimator** `1 − exp(−σ_FI φ t_det)`: σ_FI is unchanged (no loop at the
  comparison condition), so the estimate and its test pins stay as they were.
- **Fig. 1 caption wording** ("the recovery episode in which the counter was next read"): the site
  does not show Fig. 1.

## 4. Verification

- `node --test tests/model.test.js`: all tests pass.
- Browser preview on port 8731 at desktop width and 400 px: three pages load with no console errors;
  the θ slider, τ, t_det and target-D inputs still update every output; both new images load; no
  page contains "6.1", "15 to 30", "6 to 15%", "19 of 75", "5 or 10 s" as a transfer timeout, or
  "one of them at the comparison condition".
