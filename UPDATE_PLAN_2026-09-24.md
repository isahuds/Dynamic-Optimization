# Update plan, 2026-09-24: aligning the site with the PI's `testing-opt(30).tex`

**Status:** implemented 2026-09-24 (release v6).
**Author:** isahudso
**Companion paper:** Hudson, Hunnicutt, Loveless, "Design Strategies for Dynamic Single-Event
Effect Testing of Algorithmic Computation," IEEE TNS (RADECS 2026).
**Source of record for this pass:** `~/Downloads/testing-opt(30).tex`, the PI's Overleaf download of
2026-09-24. It is two Overleaf rounds past package v83 (`(28)`) and has not been packaged. Site v5
matched package v81, so this pass spans v82, v83, `(29)` and `(30)`.
**Supersedes:** `UPDATE_PLAN_2026-09-22-v81.md`. Earlier decisions otherwise stand.

---

## 1. Standing decisions re-checked against `(30)`

- **Terminology.** `(30)` keeps "functional interrupt" and "corruption event" and says why (II-D).
  The v83 "observed SEU / observed SEFI" plan was not adopted. The site keeps its rule.
- **Show only what the paper prints.** This pass removes several things the site carried that the
  paper cut in v82 or v83, listed in section 3.

## 2. What changed in the paper, and where it lands on the site

| # | Paper, v81 to `(30)` | Site change |
|---|---|---|
| 1 | Hidden strikes became "a caution, not a method" (v82). IV-B lost the fixed-wait rate test (1,856 interrupts), the one-in-eleven repeat share, the four-phase split (0 of 150, 62 of 338, 20 of 76), and the loop sizes. The share is now **11 to 13%** at the reference condition; the 6 to 17% moved to V as the estimate's uncertainty. True rate 12 to 16% above the host count and 7 to 10% below the counter; 2 to 3 points after detection. The counter excess is written as **1.17 to 1.44 times** the detected count (III-B). | Recovery page: the hidden-share calculator, phase table and phase figure removed; a short caution card replaces them. Evidence page `#pileup` rewritten to the paper's paragraph. `DETECTION` replaced by `HIDDEN`; `hiddenShare()` and `detectionRows()` removed. |
| 2 | Hidden resets are recorded by the device's reset counter; only the host misses them (v83 Open 3, fixed by `(30)`). | Every "never counted" becomes "opens no new recovery episode" or "the host never detects it". |
| 3 | Detection latency is one of "three measured inputs and one choice" (VI). IV-B adds the measured 0.7 to 1.1 s per lost cycle to tau as a check on D. | The recovery page's detection-latency input now does what the paper does with it: a second duty factor with the latency added to tau. |
| 4 | Table III's D row: "the share of the time spent running cycles and recovering". | All D wording follows. |
| 5 | "-fold" retired (v83). Work-cycle range written as 20 to 814 ms, not 41-fold. | All "-fold" wording replaced; `workCycleRangeFold` becomes `workCycleRange_ms`. |
| 6 | The three-build fit (1.49e-5 cm², 0.74 s⁻¹) is gone from IV-A. sigma_det is now printed: **8.3e-6 cm²**. | Three-build value removed from the model and pages; sigma_det added. |
| 7 | IV-A adds the flux family figure and "at 2e5 the longest cycle keeps 8%, the shortest 94%". The worked example: three of six under 135 ms, FRAM_B50 over by a factor of 1.6, B200 by about 6. | New Fig. 4 image and the 2e5 contrast on the first page and the evidence page. |
| 8 | IV-B: the charge cancels "to first order"; a build with forty times the cycle pays about **75%** of the charge at this flux. FRAM_B1 and SRAM_B1 take about twice as long to recover (1.17, 1.26 s) as the builds that pass them (0.58, 0.59 s). A failed resync costs "thirty to sixty successful recoveries". SRAM_Mixed_B200 carries 2.5 episodes against at most 1.6 elsewhere. The slowest **5%** of episodes carry **23 to 69%** of recovery time. "Running cycles" replaces "computing". | Recovery and evidence pages; new `chargeAtFlux()` reproduces the 75%. |
| 9 | The 58 to 88% beam-on range is commented out of VI (v83). The 12 to 42% stays in IV-B. | 58 to 88% removed from the evidence page and the model. |
| 10 | 71.4% (every censored recovery scored a failure) is gone. III-A adds the Fisher interval, −5 to +3 points. | 71.4% removed; interval added. |
| 11 | III-A adds the swept build's 18× exposure: pausing at every detection would have delivered 1.45e7 instead of 2.56e8 cm⁻². | Added to the evidence page's recovery section. |
| 12 | III-B: corruption range printed as **1.09e-6 to 1.04e-5**; "three to eight times" gone; one-shared-rate χ² 12.3 (p = 0.016) depends on crediting (V: p = 0.64; spread 1.4 narrows to 1.2); clock χ² 18.7 with 65% from FRAM_B1_Throttled; "leading candidate", not "leading contributor". 30 of the 35 reproduced events sit at a stored sample (the "24 in SRAM builds" clause is gone). | Evidence page `#comparison`, `CORRUPTION`, `SIGMA_FI`. |
| 13 | Fig. 3 is now `fault_site_composition_v2` ("Not reproduced" legend); caption: "no flip at the five simulated sites". Fig. 2 caption: open diamond with an asterisk. | New image; captions reworded. |
| 14 | V adds the retry exclusion: retries carry 1 to 2% of beam-on time at B = 1 and 29 to 30% at B = 200; counting them as attempts would raise sigma_cyc by 9%. | One sentence on the evidence page; `RETRY_EXCLUSION` in the model. |
| 15 | Coronetti: "at least ten passes through the system's operating modes, its duty cycles, between two hard losses of functionality, those needing a power cycle to clear". Zimmaro's cross section: "measured at the lowest of its proton fluxes and found compatible with a mixed-field value". | Help text on the first page, evidence page, references. |
| 16 | Table II: sigma_FI credits one per escalated recovery that ended its call before the counter was read again (16 at the reference condition, under 2%); a retried execution is not an attempt. | Quantities table. |

## 3. Removed from the site because the paper no longer prints it

The four-phase hidden-reset split and its figure; the hidden-share expression and calculator; the
1,856-interrupt fixed-wait test; one interrupt in eleven; the 0.25 s wait; loop sizes 21 to 62;
the 17 to 44% counter excess (now 1.17 to 1.44 times); 58 to 88%; 71.4%; the three-build
1.49e-5 cm² and 0.74 s⁻¹; "three to eight times"; "24 of them in the SRAM builds"; every "-fold".

## 4. Verification

`node --test tests/model.test.js`; all three pages load with no console errors; the recovery page's
second duty factor reproduces the paper's 0.39 for FRAM_B1; no sideways scroll at 400 px.

## 5. Follow-up the same day: prior work credited, and framed positively

At the PI's request, every page now credits the prior work its content draws on, and no sentence
describes prior work by what it lacks.

- **Reference list rebuilt** from `radecs26.bib`: 39 works the paper cites, grouped by what the site
  draws from each, with DOIs where the bib has them. The old list's Zimmaro RADECS 2022 title was
  wrong ("Radiation testing of complex systems: a flux-selection methodology"); it now reads
  "Radiation test flux selection methodology to optimize SEE observability on systems with different
  operating modes". Daly's title was incomplete; Zimmaro 2024 is a PhD thesis, not a "follow-up".
- **Credits added where the content lives:** established flux guidance (Buchner, Berg, Quinn,
  Zoutendyk, Allen) and ESCC 25100; mean work to SEFI (Esquer) and mean workload between failures
  (Rech); Bohman's MSP430FR5969 tradeoff; firmware dependence and test-as-you-fly (Koga, Nekrasov,
  Houssany, Esquer, Noizette, Velazco, Quinn); fault injection (Quinn 2013); FRAM (Quinn 2014,
  Bosser, Ju, Harris); program dependence (Quinn 2015, Stirk); device-class recovery times (Quinn,
  TI, Zimmaro TNS 2022, Esquer 2024, Frías-Domínguez); SEU/SEFI definitions (JEDEC, Koga);
  operational cross sections (Coronetti); exact Poisson intervals (Garwood, Ricker).
- **Reframed:** Zimmaro's scope is now what the method was built for, and the companion paper "builds
  on it in three directions" (was: recovery time "sits outside", survival "rather than counted").
  "Not a competitor" and "rather than replacing it" now read "builds directly on". "Tested rather
  than taken on faith" dropped. Shutters (Wilcox, TI) are credited for keeping recovery out of the
  exposed window, with detection latency named as what remains (was: a shutter "removes only" 2 to
  3 points). Coronetti's ten-duty-cycle guidance is attributed by name.
- **In-text disambiguation:** the two 2022 Zimmaro papers carry their venue (RADECS 2022, TNS 2022).
- **Hidden-reset figure:** already removed in v6; the caution is prose only. Its metric tiles were
  also removed from the evidence page, so the card reads as a caution rather than a result.
