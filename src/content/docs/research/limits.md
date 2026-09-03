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

**Mitigation — selected, not shipped.** A bake-off on 2026-09-01 selected a nonlinear
gain (a sensor's contribution rises with its distance from set-point) at the unchanged
threshold, which scored perfectly on all three criteria from N = 30 to N = 100 and
overturned the earlier recommendation of a scaled threshold plus grouping, which
measured worse. It is **not yet shipped and not yet re-measured on a real body**: the
measurements use synthetic bodies with uncorrelated bases and independent noise,
because no shipped body exceeds about twelve sensors, and real drives correlate. Its
cost — roughly 120× the cluster allocation of the control — makes the exact-scan
defect D51 a prerequisite rather than a dormancy candidate.

**What it bounds.** The representation behind Exp 42 (interoception clusters), Exp 48
(the extero/intero seam) and Exp 53b, whose re-run trigger states outright that "the
representation is what transfers". All three ran at about six drives, inside the safe
band, so **the limit does not retract them**; it bounds any future body that grows past
it. Shipping the mitigation re-stales Exp 53b on hardware, and that re-run and the
1.2 two-robot replication are the same scarce resource.

**Re-measure on:** any change to the sensor embedding, the pattern threshold, the
substrate channel count, or any body whose per-channel sensor count exceeds about
twelve. The full measurement history, the ruled-out candidates, and the open
questions live in the
[tracking doc](https://github.com/dennys246/Maxim/blob/main/docs/limits/l11_sensor_dilution.md).
