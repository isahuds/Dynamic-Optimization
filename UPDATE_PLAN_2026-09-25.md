# Update plan, 2026-09-25: reconciling the site with manuscript v86, and adding the pre-print

**Status:** implemented 2026-09-25 (release v7).
**Author:** isahudso
**Companion paper:** Hudson, Hunnicutt, Raymond, Lingasubramanian, Loveless, "Design Strategies for
Dynamic Single-Event Effect Testing of Algorithmic Computation," IEEE TNS (RADECS 2026).
**Source of record:** `~/Documents/RADECS-26/paper/TNS_FINAL_2026-09-25-v86/testing-opt.tex`
(package `TNS_FINAL_2026-09-25-v86`), the final copy. Site v6 was aligned to
`~/Downloads/testing-opt(30).tex`. Diffed `(30)` against `v86` line by line; this plan lists what
moved and how it lands on the site. **The paper wins every disagreement.**

---

## 1. Author list (five authors, v86 L52–L56)

`(30)` carried three authors. `v86`'s byline adds two: L. Raymond and K. Lingasubramanian, both of
CFD Research Corporation (v86 L56). Fixed everywhere the site names the authors:

| # | Site file:line | Current | New |
|---|---|---|---|
| 1 | `index.html:147` | "Companion to Hudson, Hunnicutt and Loveless," | "Companion to Hudson, Hunnicutt, Raymond, Lingasubramanian and Loveless," |
| 2 | `recovery.html:169` | same | same fix |
| 3 | `background.html:370` | same | same fix |
| 4 | `background.html:313` (reference list item 1) | "I. Hudson, H. Hunnicutt, T. D. Loveless, ..." | "I. Hudson, H. Hunnicutt, L. Raymond, K. Lingasubramanian, T. D. Loveless, ..." |
| 5 | `README.md:3` | "Companion site for Hudson, Hunnicutt and Loveless," | same fix |

Title unchanged: "Design Strategies for Dynamic Single-Event Effect Testing of Algorithmic
Computation" matches v86 L50 exactly. Abstract concepts (eight firmware builds, corruption-event
factor 9.5, functional-interrupt factor 1.4, work cycles 20–814 ms) all match v86 L61; the site does
not quote the abstract verbatim so no other change is needed there.

## 2. Dead-time terminology (Section IV-B), applied exactly per the task brief

`(30)`'s IV-B talked about "recovery time" as the only cost of a lost cycle. `v86` renames the
section "Dead Time in the Flux Choice" (L385) and defines **dead time** as the beam-on time from an
interrupt until the device resumes work, unobservable to the host (L389; Table IV L326), with two
parts: detection latency and recovery. τ is now defined as "the mean dead time a lost cycle adds
beyond its own W, measured here as the recovery time" (Table IV L337, L407), not "mean recovery time
per lost cycle." D's definition changed from "running cycles **and** recovering" to "running cycles
**or in dead time**" (Table IV L339, Eq. L389–391). Re-running is explicitly *not* dead time (L413).
This is the largest content change and touches `recovery.html` and `background.html` throughout.

| # | Site file:line | Current | New | v86 line |
|---|---|---|---|---|
| 6 | `recovery.html:27–32` | "the mean time a lost cycle costs the test in recovery, τ, and the detection latency..." | Introduces dead time as the umbrella term with its two parts before naming τ and detection latency | L389, L326 |
| 7 | `recovery.html:58` | "That is recovery alone; the detection latency below is entered separately." | "That is dead time's recovery part; the detection latency below is its other part, entered separately." | L326, L413 |
| 8 | `recovery.html:66–69` | "D as the companion paper defines it charges recovery alone; adding this to τ charges the wait too." | Reworded to avoid "D...charges" (see §3) and to name the detection latency as dead time's other part | L389, L413 |
| 9 | `recovery.html:95–101` | "D is the share of the time spent running cycles **and recovering**... It charges recovery alone... Re-running is not charged at all." | D's definition updated to "running cycles **or in dead time**"; re-running stated as explicitly *not* dead time, with the paper's reason (host observes it, but it doesn't begin from a verified state) | L339, L413 |
| 10 | `background.html:174–179` | "each lost cycle also costs a recovery, during which no work cycle runs and the device is unobservable. Let τ be the mean recovery time per lost cycle." | "each lost cycle also costs dead time... Dead time has two parts... Let τ be the mean dead time a lost cycle adds beyond its own W; here it is measured as the recovery part." | L389, L337 |
| 11 | `background.html:191–199` | "twice as long...1.17 and 1.26 s...0.58 and 0.59 s" sentence (§4 below) plus the "75%" worked example | Reworded to the IV-B reordering v86 actually prints: 35%/34% running/recovering split for FRAM_B1, 19%/15% vs 43%/42% for FRAM_B1_Throttled/FRAM_B50, "the cycle length drops out, τ sets how much test time is lost" | L411 |
| 12 | `background.html:204–212` | "Five of the six builds share one failure rate near 4%. SRAM_B1 failed in 16%... SRAM_Mixed_B200 carried 2.5 episodes... slowest 5%...23 to 69%" | "most of the recovery time went to recoveries whose first attempt failed. That happened in 15 and 22% of recoveries for FRAM_B1 and SRAM_B1, against 6 to 11% for the rest," plus the resync timeout named as distinct from the detection latency | L411, L413 |
| 13 | `background.html:213–220` | "...an escalated recovery cost a mean of 93.7 s against that median of 84.6 s." | Drops the 93.7 s clause; closes on v86's own point that "a second of dead time costs D the same wherever it is spent" | L415 (93.7 s sentence is commented out, i.e. cut, at v86 L424) |
| 14 | `background.html:228–234` | "D charges recovery alone... because D charges neither the host's wait...", no explicit re-run/dead-time statement | Fixes both "D charges" instances (§3) and states re-running is not dead time | L413 |

## 3. "Charge" wording (standing rule: never write that D/the duty factor charges something)

v86 always makes the **test** (or the experimenter) the subject of "charge" — "charging it to the
test gives D" (L389), "charging dead time changes which build..." (L407) — never D itself. The site
had drifted to "D charges recovery alone" in three places. Fixed by making the test/model the
subject throughout, per the table in §2 (items 8, 9, 14) plus:

| # | Site file:line | Current | New |
|---|---|---|---|
| 15 | `assets/model.js:125` (comment) | "D charges recovery alone, so it is an upper bound." | "By default only the recovery part of dead time is charged to D, so it is an upper bound." |
| 16 | `tests/model.test.js:162` (comment) | "D charges recovery alone, so every published D is at least..." | Reworded the same way; the assertion itself is unchanged |
| 17 | `assets/recovery.js:35` | `"recovery charged, as the paper defines D"` | `"the recovery part of dead time, as the paper defines D"` |

## 4. Hidden strikes (L433) — justification and one added figure

- The site's justification for why hidden strikes don't bias θ/σ_cyc/corruption changed in v86: from
  "since those are counted on cycles that survived" (`(30)`'s wording, still on the site) to "since a
  hidden strike lands in dead time, after its cycle is already lost" (v86 L433). Fixed in
  `recovery.html:123–126` and `background.html:256–261`.
- v86 also prints the "7 to 10% below the reset-counter rate" half of the bracket alongside "12 to
  16% above the host-detected rate" (L433); the site only had the first half. Added to
  `background.html:246–247`.
- "while the host was still waiting to detect the first reset" tightened to "during the detection
  latency" for terminology consistency (`recovery.html:119`, `background.html:250`).
- Opening sentence of `background.html`'s `#pileup` section, "Recovering a device under beam raises a
  question of counting," changed to "Dead time also raises a question of counting" to match v86 L433
  now that dead time is established as the organizing term.
- Every hidden-strike number itself (11–13%, 6–17% uncertainty, 2–3 points, 12–16%, resetLoops
  13/0/4448/3951, Zimmaro 3.76×/10.5×) is unchanged between `(30)` and `v86` — confirmed by diff.

## 5. Cut content verified absent (standing rule)

Checked the full list against `v86` and the current site. `(30)` still printed two of these live;
`v86` comments both out (cut). Removed from the site:

| # | Cut item | Where it was live on the site | v86 disposition |
|---|---|---|---|
| 18 | "slowest 5% of episodes carry 23 to 69%" | `recovery.html:142–143`, `background.html:211`, `README.md:70` | Commented out at v86 L424 |
| 19 | escalated-recovery mean of 93.7 s | `background.html:220`, constant `escalatedRecoveryMean_s` in `assets/model.js:188` | Commented out at v86 L424 |
| 20 | "58 to 88%" | Not present on any page; only a guard comment in `tests/model.test.js:160` | Confirmed still cut (v86 L452 comments it out) |
| 21 | a hidden-share estimator/calculator | Not present (removed in v6); `S.hiddenShare`/`S.detectionRows` guarded `undefined` | No estimator in v86 |
| 22 | "supplement" | Not present anywhere on the site | N/A |

Two further cuts found by the line diff that the task brief didn't name, handled the same way:

| # | Cut item | Where it was live | Disposition |
|---|---|---|---|
| 23 | "A build with forty times the work cycle and the same recovery time would pay about 75% of that charge" | `background.html:198`, `README.md:65` | Commented out at v86 L420. Removed from site prose. The `chargeAtFlux` helper and its regression test in `assets/model.js`/`tests/model.test.js` are kept (they check a true, model-internal, to-first-order property, not a printed number) but the comment claiming it as "the paper's example" is corrected. |
| 24 | "Each takes about twice as long to recover from a lost cycle, 1.17 and 1.26 s, as the two builds that pass them, 0.58 and 0.59 s" and "SRAM_Mixed_B200 carried 2.5 episodes per lost cycle...documented counter corruption" | `background.html:200–203, 208–210` | Deleted outright (not even a comment) between `(30)` and v86 (v86 L409–L411 replaces this framing). Removed from site prose; the underlying per-build τ values remain in the campaign table (`S.CONFIGS`), which is data, not this sentence. |

Also cut from `background.html`'s `#recovery` section: the "D is the test-time counterpart of the
availability that system-level guidance computes... (Coronetti et al., TNS 2021). ESCC 25100 asks
that a comparable active-time share be measured..." sentence, live in `(30)` at this exact spot, is
commented out of v86's IV-B (v86 L396). Removed from `background.html:180–183`; replaced with v86's
own closing clause for that paragraph, "in which dead time is free" (L394). This sentence is **not**
touched in `recovery.html`'s intro note, where the same Coronetti/ESCC comparison is the site's own
framing (not a close paraphrase of IV-B) and is still accurate — see "Could not fully reconcile"
below.

## 6. SEFI/SEU glossary tie (standing rule, not yet applied as of v6)

v86 Table III explicitly parenthesizes "Functional interrupt, σ_FI (a SEFI or accumulated SEUs)" and
"Corruption event (one or more SEUs)" (L213–221) — the terminology bridge decided 2026-09-24. The
site's `background.html#quantities` glossary (the one place this tie belongs, per the standing rule)
never actually stated it; its help paragraph only explained *why* the site avoids SEFI/SEU. Fixed:

| # | Site file:line | Change |
|---|---|---|
| 25 | `background.html:279` (σ_FI row) | Meaning cell now opens "Cross section for functional interrupts (a SEFI or accumulated SEUs), cm²: ..." |
| 26 | `background.html:282` (Corruption event row) | Meaning cell now opens "One or more contiguous counted errors (one or more SEUs) in a single call, ..." |
| 27 | `background.html:288–291` (help paragraph) | Ties the two definitions explicitly, keeps the existing "this campaign cannot establish [single-particle] attribution, so the site follows the paper's names" reasoning, and keeps the standing rule intact: the counts are never called "SEFI/SEU counts or cross sections" in the narrative pages |

Also added a **Dead time** row to the same glossary table (between Detection latency and Countable
exposure, matching v86 Table IV's own order, L318–L328), and updated the τ and D rows' meanings to
v86's exact wording ("mean dead time a lost cycle adds beyond its own W, measured here as the
recovery time"; "the share of the time spent running cycles or in dead time that yields countable
exposure").

## 7. Small precision fixes found while checking every number and phrase

| # | Site file:line | Fix |
|---|---|---|
| 28 | `index.html:73–76` | Coronetti sentence lacked "its duty cycles" (v86 L373: "...operating modes, its duty cycles, complete between..."); added |
| 29 | `background.html:152–153` (Fig. 2/`#comparison`) | Added v86's clarifying sentence "A match at the output sample cannot be separated from a flip in a register or in transfer, so the comparison uses input samples only" (v86 L283, replacing a build-specific caveat `(30)` had at this spot for `SRAM_Mixed_B200` only) |

Everything else checked against v86 and found **unchanged**: σ_cyc (1.56e-5 [1.44e-5, 1.69e-5]
cm², 0.78 s⁻¹), σ_det (8.3e-6 cm², 0.42 s⁻¹), the 588/20,459/787 counts, θ range 0.51–0.98, the
135 ms/1.6×/6× worked example, the 2e5 flux contrast (8%/94%), form tests (G²=6.4 p=0.27, pure-FRAM
p=0.56, Weibull β=0.98 [0.92,1.04] / [0.90,1.06]), σ_FI (9.4e-6 pooled, 7.7–11.1e-6, ×1.4, χ²=12.3
p=0.016, credited-once p=0.64 ×1.2, counter 1.17–1.44×), corruption (1.09e-6 to 1.04e-5, ×9.5, 95
events, batch χ²=0.6/2/0.73, clock χ²=18.7/3/<0.001/65%), the storage signature (16/34 vs 1/36,
p<1e-4, 30/35), the time budget (24–43% / 14–36% / up to 29% / 1–2% and ~40% re-run / 12–42%
measured / 0.02–0.05 gap / 0.39 vs 0.37 for FRAM_B1), retry exclusion (1–2%, 29–30%, +9%), the
95.3%/96.4%/[-5,+3] recovery-success statistics, the LET-sweep 18× factor, and the facility ranges.

## 8. Model constants changed in `assets/model.js` (and their tests)

| Constant | Old | New | v86 line |
|---|---|---|---|
| `CAMPAIGN.resyncFailureShare` / `resyncFailureShareSRAM_B1` (0.04 / 0.16) | Removed | Replaced by `CAMPAIGN.firstAttemptFailureShare = { FRAM_B1: 0.15, SRAM_B1: 0.22, restRange: [0.06, 0.11] }` | L411 |
| `CAMPAIGN.slowestFivePercentShare` ([0.23, 0.69]) | Removed entirely | — (cut statistic; guarded `undefined` in tests) | v86 L424 comments it out |
| `CAMPAIGN.escalatedRecoveryMean_s` (93.7) | Removed entirely | — (cut statistic; guarded `undefined` in tests) | v86 L424 comments it out |
| `RELEASE.schemaVersion` / `releaseDate` / `manuscript` / `supersedes` | v6, 2026-09-24, `testing-opt(30).tex` | v7, 2026-09-25, `testing-opt.tex` (v86, package `TNS_FINAL_2026-09-25-v86`), supersedes v6 | — |
| `SIGMA_FI.source`, `CORRUPTION.source`, `TIME_BUDGET.source`, `HIDDEN.source` strings | "testing-opt(30).tex Secs. ..." | "testing-opt.tex (v86) Secs. ..." | — |

No numeric constant that is actually *used by a live calculator* changed value — σ_cyc, σ_det, σ_FI,
corruption, the per-build CONFIGS table, and TIME_BUDGET are all unchanged between `(30)` and `v86`.

## 9. Pre-print (Task 2) and release hygiene (Task 3)

See the main report. `preprint.pdf` added at the repo root; linked from the shared nav on all three
pages, a prominent button near the top of `index.html`, and a footer sentence on all three pages,
each `target="_blank" rel="noopener"`, following the NSREC companion site's pattern. Every `?v=`
cache key bumped to `?v=20260925`.

## 10. Review corrections (before release)

A review of the v7 diff against v86 found four items and fixed them in the same release:

| File | Was | Now | v86 |
|---|---|---|---|
| `recovery.html` campaign help, `background.html` #recovery | every first-attempt failure "costs a fixed timeout of five or ten seconds" | a failed first attempt costs further attempts or, when resynchronization fails outright, the resynchronization timeout; the timeout's value is dropped as v86 does | L411, L415 |
| `background.html` #recovery | pausing the beam: "a second of dead time still costs D the same wherever it is spent" | "Pausing the beam to recover does not escape the charge, which moves from beam-on time to facility time." (paused time is not beam-on time, so it is not dead time and is not in D) | L415 |
| `recovery.html` intro note | D as "the test-time counterpart of the availability…" (Coronetti) and of ESCC's detectable share | removed; v86 comments this sentence out (L396) | L394, L396 |
| `background.html` glossary, `assets/model.js` sources | counts table cited as "Table II" | "Table III" (v86 numbering: I firmware, II conditions, III counts, IV quantities) | L201–L229 |

Also: "the counting loss" became "the dead-time counting loss" on both pages (L433), and the
`firstAttemptFailureShare` comment in `assets/model.js` was corrected to match the note's definition
(a failure, or a success that needed further attempts). Tests: 29/29 pass.

Labels aligned with v86's IV-B title, "Dead Time in the Flux Choice": the second page's nav label, `<title>` and
the index next-link read "With dead time"; `background.html`'s section heading reads "Dead time in the flux choice";
the output tile reads "Dead-time charge (1−θ)τ/W" (v86 L411: "the dead time charged per unit of cycle time"). The τ
input reads "Recovery time per lost cycle, τ as measured", and its help now measures recovery "from detection to the
resumption of work" (it said "from interruption", which is the whole dead time, contradicting the sentence after it).
Checked on a local server: all three pages load with no console errors, the calculators render, `preprint.pdf`
returns 200, and index has no page-level sideways scroll at 411 px (the wide table scrolls inside its wrapper).
