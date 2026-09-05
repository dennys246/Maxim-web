---
title: Measurement limits
description: What Maxim's own instruments cannot resolve — the published ceilings of the apparatus, each measured, each with a design consequence and a re-measure trigger. A summary of the repo's limits ledger.
---

Maxim keeps a ledger of the limits of its own measurement apparatus, separate from
the [defect ledger](https://github.com/dennys246/Maxim/blob/main/docs/bugs/README.md)
(things that are broken) and the [behavioral graduation
ledger](https://github.com/dennys246/Maxim/blob/main/docs/plans/behavioral_graduation_candidates.md)
(claims that have earned a cited experiment). A limit is not a defect: nothing is
broken, and no threshold tweak removes it. It is a physical property of an
instrument that every pre-registration has to design around, and most entries were
discovered expensively — several of them twice — before the ledger existed.

The ledger is canonical and wins over this page:
[`docs/limits/README.md`](https://github.com/dennys246/Maxim/blob/main/docs/limits/README.md).
Its rules mirror the defect ledger's: every entry cites the experiment that measured
it and a magnitude; every entry carries a disposition (**BINDING** — no mitigation
exists, design around it; **MITIGATED** — a tool exists, and the entry names when it
must be used; **RETIRED** — the apparatus changed); a one-sentence design consequence
is mandatory; a limit that bounds a graduated claim names the row; and every entry
has a `Re-measure on:` trigger, because limits move when the apparatus does and an
unmeasured drift is how a mitigated entry silently rots.

## The entries

| # | Limit | Disposition |
|---|-------|-------------|
| L1 | Argmax novelty-visibility floor (~0.11) | MITIGATED |
| L2 | Deterministic-apparatus phase-locking | MITIGATED · [tracking doc](https://github.com/dennys246/Maxim/blob/main/docs/limits/l2_phase_locking.md) |
| L3 | Azimuth representational resolution (~3 nodes) | MITIGATED · [tracking doc](https://github.com/dennys246/Maxim/blob/main/docs/limits/l3_azimuth_resolution.md) |
| L4 | `safe_pref` saturation (SD 0.000) | BINDING |
| L5 | Actions/turn as a stopwatch (wall-clock ÷ 0.5 s) | MITIGATED |
| L6 | Prior-agreement ceiling voids | MITIGATED |
| L7 | Act-granularity vs fast convergence | BINDING |
| L8 | Exp 37 fires are not reproducible across time, code held fixed | BINDING |
| L9 | DoA sweep gain: score the full-range fit under an R² gate | MITIGATED |
| L10 | DoA sign-flips reject roughly half of all sweep passes | BINDING |
| L11 | Sensor-count dilution, and the discrimination ceiling behind it | MITIGATED · [tracking doc](https://github.com/dennys246/Maxim/blob/main/docs/limits/l11_sensor_dilution.md) |
| L12 | A hand-written English prior sits inside action selection | MITIGATED (twin-named tools) / BINDING (otherwise) |

Several of these already bound results on the [evidence page](/research/evidence/):
L4 caps what a passing re-run of the safe-vs-harm result can detect, L8 is why the
cross-model numbers are readings taken at one time rather than constants, and L1
and L2 shaped the cradle apparatus. The rest of this page is the entry that most
belongs on an evidence site, because it is a ceiling on the substrate itself.

## L11 — the sensor-count discrimination ceiling

**The instrument.** Every substrate modality channel embeds a sensor reading by
summing one basis vector per sensor, then assigns the result to a concept cluster by
cosine similarity against stored centroids at a fixed threshold of 0.85. That sum is
the limit.

**The limit, in two parts — measured 2026-09-01 on the shipped encoder.**

- *Detection* — can the substrate see that the state changed at all? One sensor is
  1/N of the sum, and cosine already normalises length, so a full swing of a single
  sensor moves the similarity by a clean **cos ≈ 1 − 0.57 / N**, confirmed from N = 1
  to N = 200. At N ≥ 15 a full single-sensor swing no longer clears the threshold.
  Signal falls from 0.119 at four sensors to 0.006 at a hundred while an all-sensor
  2% jitter stays flat at about 0.0008, so signal-to-noise degrades from 185:1 to
  7.5:1.
- *Discrimination* — can it tell **which** sensor changed? This is the deeper limit.
  At N = 100, two entirely different sensors going to their extremes read cos 0.990
  — 99% alike. Detection is recoverable by moving the threshold; discrimination is
  not.

**Why it matters beyond the number.** Reward biases are keyed on the cluster id. If
two meaningfully different body states complete onto one cluster, they share a bias,
and the agent cannot hold different policies for them no matter how much it learns. A
substrate that cannot tell *which* dimension moved cannot learn "turn left helps when
the sound is on the left" — only "something is happening".

**Three non-levers, measured so they are not re-proposed.** More embedding
dimensions (384 → 3072) move the cosine by less than 0.001 — dilution is an
averaging problem, not a capacity problem. Sparse or hashed bases are identical to
the plain sum. Distributional moments give an N-independent detection signal but are
permutation-invariant by construction, so they make discrimination *worse* at every
mixing weight.

**Design consequence.** A modality channel carrying more than about twelve scalars at
the fixed threshold is measuring almost nothing per sensor, and one carrying enough
sensors for two different excursions to be confusable is measuring the wrong thing.
Budget sensors per channel, not per body, and state the per-channel count in the
pre-registration.

**Mitigation — shipped in 1.1.4, for one channel, and re-measured: it helps, and it
does not retire the limit.** A bake-off on 2026-09-01 selected a nonlinear gain (a
sensor's contribution rises with its distance from set-point) at the unchanged
threshold, which scored perfectly on all three criteria from N = 30 to N = 100 on
synthetic bodies and overturned the earlier recommendation of a scaled threshold
plus grouping, which measured worse. 1.1.4 ships that gain for the new `world`
modality channel **only**. At N = 6 the gain's stability collapsed in the bake-off
(0.97 → 0.62), so interoception and audio keep the ungained encoding — byte-identical
to 1.1.3 and pinned by test — and "the sensor encoding" as a whole did not change;
one channel's did. Its cost, roughly 120× the cluster allocation of the control, was
measured before anything shipped (the verdict: an index was a prerequisite), and the
gain rides a vectorized exact centroid scan that is decision-equivalent to the old
loop by test — see [memory & consolidation](/memory/overview/).

**The re-measure, pre-registered.** The protocol was frozen and merged before the
first data timestamp, and the verdict is computed by the protocol's own decision
function, not read off afterwards. On ten minutes of live Minecraft world data at
N = 16 sensors in one channel:

| | A0 — the encoding as shipped through 1.1.3 | A4 — the gain 1.1.4 ships |
|---|---|---|
| Separation | **0.0 — fully blind** | **0.0566** |
| Clusters | 1 | 3 |
| Stability | 1.0 (vacuous: one cluster) | 0.9984 |

Verdict: **mitigation-confirmed, not retired-eligible.** Read both halves together.
The ungained encoding cannot see events at this sensor count at all; the gain
restores real but weak separation, and 0.057 is nowhere near the 0.70 bar the
protocol set for retirement. So L11 stays active, with the gain as a partial
mitigation, and the scaled threshold remains the retirement path — unshipped. The
re-measure also surfaced a new instance of the same principle: with ranges declared
so that rest sits at an extreme, the gained background is maximally loud and events
vanish (event cosine 0.926); re-centring the ranges so rest sits at the encoding's
neutral point brought that to 0.747. The range declaration is part of the design
under test.

**What it bounds.** The representation behind Exp 42 (interoception clusters), Exp 48
(the extero/intero seam) and Exp 53b, whose re-run trigger states outright that "the
representation is what transfers". All three ran at about six drives, inside the safe
band, so **the limit does not retract them**; it bounds any future body that grows past
it. Shipping the gain to the interoception or audio channel would re-stale Exp 53b on
hardware; 1.1.4 did not, because the gain is world-only and those channels are
unchanged. That re-run and the 1.2 two-robot replication remain the same scarce
resource.

**Re-measure on:** any change to the sensor embedding, the pattern threshold, the
substrate channel count, or any body whose per-channel sensor count exceeds about
twelve. The full measurement history, the ruled-out candidates, and the open
questions live in the
[tracking doc](https://github.com/dennys246/Maxim/blob/main/docs/limits/l11_sensor_dilution.md).
