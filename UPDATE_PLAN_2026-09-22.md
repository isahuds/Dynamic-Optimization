# Update plan, 2026-09-22: aligning the site with manuscript v80

**Status:** implemented 2026-09-22 (release v4).
**Author:** isahudso
**Companion paper:** Hudson, Hunnicutt, Loveless, "Design Strategies for Dynamic Single-Event
Effect Testing of Algorithmic Computation," IEEE TNS (RADECS 2026). Package of record
`~/Documents/RADECS-26/paper/TNS_REMEDIATION_2026-09-22-v80/testing-opt.tex`, 12 pp, final limit.
**Supersedes:** `UPDATE_PLAN_2026-09-18.md` for everything below; its decisions otherwise stand.

---

## 1. What v76 to v80 changes for the site

| Topic | v76 (site had) | v80 (site now says) |
|---|---|---|
| Pileup fit | Fitted ceiling `phi*` about 26,000, `tau_d` 0.332/0.414 s, `sigma_fit`, shortest `W` 74 to 92 ms, suppression 11%/a third/63%, a `tau_d` input on the recovery page | Withdrawn from the paper. Its only low-flux run (58) was Kr at LET 32.3, not Ne at LET 2.3, so the LET 2.3-4.1 group and the `tau_d` fitted from it no longer hold. Nothing built on that fit may remain. |
| Counting loss | Not on the site | Hidden interrupts: a second, independent strike inside the host's detection latency resets the device again but opens no new recovery episode, so it is never counted. Measured phase split at the comparison condition: 0 of 150 during computation, 18% (62 of 338) after a 0.25 s wait, about 2% resynchronizing under beam, and a timeout share of 25% (19 of 75) that cannot be split around detection. About a tenth of four FRAM builds' interrupts were hidden at the test flux (6 to 15%). It biases the counted interrupt rate, not theta or the corruption-event rate. New estimator `hiddenShare = 1 - exp(-sigma_FI * phi * t_det)`. |
| Beam-off comparison | Not on the site | Removed from the paper (the runs were debugging pilots with manual resets). Nothing to remove here. |
| Form tests (IV-A) | Deferred to the paper ("see its Section IV-A for those tests") | Published: one `sigma_cyc` fits as well as six separate ones (G² = 6.4 on 5 dof, p = 0.27; pure-FRAM subset p = 0.56), and a free-shape Weibull returns shape 0.98 (95% 0.92 to 1.04). A long work cycle carries no added risk per unit fluence from its length. |
| Storage signature (III-B, new paper Fig. 3) | Not on the site | 16 of 34 SRAM corruption events reproduced by a single flip in an input sample, against 1 of 36 FRAM events on the same device (Fisher p < 1e-4); no single flip reproduces 84% of FRAM events against 26% of SRAM events. |
| Recovery charge | "35% to 72% of test time bought no countable exposure" | "34% to 72%" |
| Table III | `tau_d`, `phi*`, `sigma_fit` rows | Those rows dropped; "Detection latency" row added after "Recovery time." |
| Exposure fold (III-A), Fig. 1 / run 58 | Not on the site | True of the paper (18-fold, Kr at LET 32.3) but the site never showed a LET sweep or this exposure-fold number, so there was nothing to change. |

---

## 2. What changed, by file

- **`assets/model.js`**: removed `PILEUP` and the `ceilingFlux` / `shortestW` / `countedRate` /
  `suppression` functions; removed `CAMPAIGN.shortestW_s_range` and `ceilingRange`;
  `testTimeNoExposure` 0.35 to 0.34. Added `SIGMA_FI` (pooled 9.4e-6 cm², five comparable builds,
  1.4-fold spread), `DETECTION` (the phase-split counts and the 0.25 s default latency), the
  `hiddenShare(sigmaFI, phi, tDet)` function, and a `detectionRows()` formatting helper so every
  page renders the same phase-split numbers from one place. `RELEASE` bumped to
  `flux-selection-design-tool-v4-2026-09-22` / `TNS_REMEDIATION_2026-09-22-v80`.
- **`tests/model.test.js`**: dropped the four pileup/ceiling tests; added pins for `SIGMA_FI`,
  `hiddenShare` (about 0.111 at `sigma_FI`=9.4e-6, `phi`=5e4, `t_det`=0.25 s, and about 0.00047 at
  `t_det`=0.001 s), `DETECTION`, `detectionRows`, and the 34% to 72% charge range. 19 tests pass.
- **`recovery.html`** / **`assets/recovery.js`**: replaced the "Pileup ceiling and shortest cycle"
  card and its `tau_d` input with a "Hidden interrupts" card, the mechanism, the phase-split table,
  the magnitude and shutter consequence, the `hiddenShare` estimator (inputs: detection latency,
  default 0.25 s, and the page's own computed flux), and the `hidden_reset_phases_v1.png` figure.
  Updated the tagline, meta description, intro paragraph and the two cross-links that named the
  ceiling. 35% to 34%.
- **`background.html`**: rewrote `#pileup` (kept the anchor id so old links still resolve) as
  "Hidden interrupts and the limit of a counted rate," with the mechanism, the counter crediting
  repeats, the rate separation, the phase-split table, the magnitude, the shutter consequence, what
  it biases, and the closing design-inputs line. Added a new `#comparison` section, "Firmware
  comparison and the storage signature," with the 6.1-fold and 1.4-fold spreads and the storage
  signature, plus `fault_site_composition_v1.png`. Added a "Two assumptions, tested" paragraph to
  `#validation` with the form-test numbers, replacing the sentence that deferred to the paper.
  Removed the `tau_d` / `phi*` / `sigma_fit` rows from the Quantities table and added "Detection
  latency" in their place. Updated the Knoll reference line. 35% to 34%.
- **`index.html`**: fixed the one cross-link that named the pileup ceiling. No other v80 change
  reaches this page.
- **`README.md`**: package bumped to v80, the relation block swapped `phi*` / `W_min` for
  `hiddenShare`, the Key values block updated (`sigma_FI`, 34% to 72%, the form tests, the
  hidden-interrupt magnitude, the storage signature), the Pages and Assets tables reworded, a
  History entry added.
- **`assets/style.css`**: added one `.fig` class for the two new images. No other component
  changes; `card`, `metrics`, `warnbox` and the rest are unchanged.
- **`assets/img/`**: added `hidden_reset_phases_v1.png` and `fault_site_composition_v1.png`,
  copied from the paper package.

---

## 3. Notes

- The paper's own worked example in IV-A now leads with theta = 0.90 giving 135 ms, rather than
  theta = 0.80 giving 285 ms. Both remain true, since `sigma_cyc` did not change. Changed on review (2026-09-22): the site's worked example now follows the paper,
  theta = 0.90 giving 135 ms (134.69 ms at the model's sigma_cyc), with three of six builds under it,
  FRAM_B50 1.6-fold over and the two B=200 builds about 6-fold over. That covers the index slider
  default, THETA_DEFAULT, CAMPAIGN.longestW_s_at_design, the background metric, the README and the
  design-rule test.
- `CAMPAIGN.inCycleShare` in `model.js` (32 to 56%) is not rendered on any page and was left
  untouched. It is a different quantity from the 24% to 43% in-cycle share the paper's III-B now
  states and from the 12% to 42% measured clean-cycle share in IV-B, and none of the three is the
  34% to 72% recovery charge. Resolving which one the constant was meant to track needs the v76
  source, not just the v80 diff, so it was left alone rather than guessed at.
- No new bibliography entries were added for the storage-signature section. The paragraph states
  only the campaign's own numbers, not the supporting FRAM-literature citations from the paper.
