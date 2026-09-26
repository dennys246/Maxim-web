---
title: Engrams
description: What "engram" means in Maxim, scored four ways for each of its five memory families, and the one family that earns the word without the LLM.
---

"Engram" is an easy word to overclaim, so this page scores it. In neuroscience an
engram is the physical trace that an experience leaves in the brain and that a later
cue can reactivate. Maxim borrows the word for its memory traces. It is bio-inspired,
not a simulation of a brain, and a borrowed name promises nothing on its own.

A trace in Maxim counts as an engram only when all four of these hold:

1. **Forms**: one experience writes it.
2. **Stays specific**: a different situation does not land on it.
3. **Is recalled from a partial cue**: the trace comes back when only part of the
   original situation is present.
4. **Changes behaviour**: recalling it changes what the agent does.

A trace that forms but is never read is a record, not an engram. Maxim has traces at
every step of that ladder, so each family below gets a separate score for each count.
A mechanism with no production caller is marked **Dormant**: the code exists, and
nothing in a running agent reaches it.

The engine keeps this scorecard in
[`docs/wiring/engram-formation.md`](https://github.com/dennys246/Maxim/blob/main/docs/wiring/engram-formation.md),
built from a code audit on 2026-09-25. This page can claim no more than that
scorecard does. If they disagree, the engine is right.

## The five families

| Family | Forms | Specific | Recalled from a cue | Changes behaviour | Evidence |
| --- | --- | --- | --- | --- | --- |
| **Situation** | Yes | Partly | Yes | **Yes, no LLM** | EARNED ×7 |
| **Recognition** | Yes | Partly | Text only | LLM text; small nudge | PARTIAL |
| **Episodic** | Yes | Yes | Yes; result unused | LLM text only | Exp 10 |
| **Semantic** | By name | n/a | By name | LLM text only | None |
| **Motor** | **Dormant** | — | — | No | None |
| *Forward model* | Trains | — | — | No | None |

What each row is, and what its short cells mean:

- **Situation**: an [EC](/systems/entorhinal-cortex/) sensor cluster carrying
  [NAc](/systems/nucleus-accumbens/) `cluster_fear` or `cluster_reward_bias`. It is
  recalled by EC pattern completion, and the substrate chooses the action. It is
  specific only when a sensor swings from neutral to an extreme, and it has one
  boundary a day ([#899](https://github.com/dennys246/Maxim/issues/899)). Evidence:
  seven EARNED rows (Exp 45, 52, 53b, 56, 60, 61, 62 rung A).
- **Recognition**: an EC text node carrying a node-keyed `reward_bias`. Its centroid
  is a running mean that drifts, and reward widening adds to the drift
  ([#911](https://github.com/dennys246/Maxim/issues/911)). It reaches behaviour as
  LLM prompt text, plus a nudge of at most 0.20 on `tool:*` actions. Its claim is
  PARTIAL and was pulled from the 1.0 framing.
- **Episodic**: a [Hippocampus](/systems/hippocampus/) trace. It records honestly
  what it was encoded with, and it keeps the situation it formed in. It can be
  recalled by that situation, but the result is **not yet used**. Evidence: Exp 10
  (the trace persists across sessions).
- **Semantic**: an [ATL](/systems/anterior-temporal-lobe/) concept, formed and
  recalled by its name.
- **Motor**: a [Cerebellum](/systems/cerebellum/) program linked to a Hippocampus
  trace. **Dormant**: no production caller
  ([#909](https://github.com/dennys246/Maxim/issues/909)).
- *Forward model*: the Cerebellum's prediction of what an action will do, not an
  engram. It trains on real readings. Nothing reads its predictions, and its state
  is not saved ([#908](https://github.com/dennys246/Maxim/issues/908)).

Only the **situation engram** scores on all four counts without the LLM. The
[ledger](https://github.com/dennys246/Maxim/blob/main/docs/plans/behavioral_graduation_candidates.md)
earns it in seven rows. It is only as specific as the world channel's geometry allows
(see [its limits](#its-two-limits)).

The episodic and semantic families are real traces that form and come back, but they
reach behaviour only as text in the LLM's prompt. The Hippocampus can already be cued
by the current situation rather than by a word: the loop calls that cue and then
discards the result. The step that would let the result act, called
2S-e, is parked ([#848](https://github.com/dennys246/Maxim/issues/848)). Until it
lands, an episodic memory changes behaviour only if the LLM reads it and acts on it.

The motor family is **designed and not wired**. The code exists for the full cycle:
forming an engram on a painful or surprising outcome, linking it to an episode, and
querying it. No production code calls any of it. The
[Cerebellum page](/systems/cerebellum/#motor-programs-and-engrams-designed-not-wired)
has the details.

## The situation engram

```
sensor readings (world, interoception, audio)
   │
   ▼
EC: complete into a cluster (cosine ≥ 0.85),
    or allocate one; the cluster id = the situation
   │
   ▼
NAc: drowning or damage pain ─► cluster_fear
     relief or success       ─► cluster_reward_bias
   │
   ▼  a later reading completes into that cluster
NAc.recommend_action reads fear/want ─► body acts
```

**It forms** on a single encode. The first sensor reading that allocates a cluster
becomes that cluster's prototype and never changes, so these engrams do not drift.
Later matches only raise the cluster's count.

**It carries valence.** Pain from low oxygen or low health books a fear on the world
cluster that was active when the pain arrived. Fear does not decay tick by tick. Only a
slow wall-clock decay applies, when saved state is loaded. Unlearning it would take new
learning, and no code writes that yet. A want is booked the same way from relief or
success, and it decays as the agent runs.

**It acts without the LLM.** When a later reading completes into the same cluster,
`NAc.recommend_action` reads the fear or want, and the substrate chooses the action.
The LLM is not in that path.

**It travels.** A cluster's fear and want can be exported in a signed bundle and
re-keyed onto another agent's own clusters (see [The Oasis](/guides/oasis/)).

## The evidence

These are the three most recent EARNED rows, quoted from the
[graduation ledger](https://github.com/dennys246/Maxim/blob/main/docs/plans/behavioral_graduation_candidates.md).
Each one was pre-registered and run live in a Minecraft water classroom on Paper
1.20.4. Minecraft is the instrument here, not the product. Each row is substrate-primary:
no LLM in the action path.

**Exp 60: a fear learned from the game's own pain**
([prereg](https://github.com/dennys246/Maxim/blob/main/docs/experiments/exp60_drowning_avoidance_prereg.md),
EARNED 2026-09-16). An agent that felt air-hunger pain underwater later left the water
before the pain arrived. Its yoked twin had the same pain with the fear detached, and
never left. Five frozen seeds per arm; all five gates passed.

- The fear arm's median probability of surfacing before the pain rose from **0.0** to
  **1.0** (5/5 seeds). The ablated arm stayed at **0.0**, with zero executor calls in
  30 placements.
- Exact permutation test: **p = 1/252 = 0.004**, the floor for five seeds against five.
- Specific: water fear **−1.0** and shore fear **0.0** on every seed.
- Median latency to surface **1.72 s**, a median 3.4 s before the pain.
- **Caveat:** after each seed's first escape, the escape action also carried a positive
  causal link. Only the first placement per seed (5/5 surfaced) reads the fear alone.
- **Not claimed:** transfer between agents, other bodies of water, innate versus
  learned beyond the ablation, or persistence and extinction after a delay.

**Exp 61: the fear transfers to an agent that never felt it**
([prereg](https://github.com/dennys246/Maxim/blob/main/docs/experiments/exp61_shared_fear_prereg.md),
EARNED 2026-09-17). A receiver ingested a donor's exported fear through the real CLI
and left the water on its first loop-live submersion. All six frozen gates passed.

- Transferred **12/12** (Wilson **[0.758, 1.0]**), against **0/24** isolated receivers
  (Fisher one-sided **p = 8.0e-10**).
- The donor's cluster without its fear: **0/12** (**p = 3.7e-7**). The fear without
  its cluster was dropped at ingest: **0/24**.
- Before the test, every transferred receiver (12/12) read its water fear at exactly
  **−0.75**: the donor's fear after the ×0.75 ingest discount.
- **Caveat:** the experiment's measures cannot tell whether the discount's exact size
  matters.
- **Not claimed:** extinction, scaling, another pool, a want and a fear on one cluster,
  or promotion on the sharing side.

**Exp 62, rung A: the fear carries to a second pool**
([prereg](https://github.com/dennys246/Maxim/blob/main/docs/experiments/exp62_pressure_interoception_prereg.md),
EARNED 2026-09-20). An agent that learned the fear in pool 1 left the water on its
first submersion in pool 2, at a different altitude and spawn distance. There was no
mechanism change, no new sensor and no ingest. All five frozen gates passed.

- Cross-pool **12/12** (Wilson **[0.758, 1.000]**), same-pool **12/12**, ablated
  **0/3** with zero executor calls. Fisher one-sided cross against ablated
  **p = 0.0022**. Both fear arms sit at the ceiling by design, so read the interval,
  not the p.
- The ablated agents completed into the **same** cluster with fear set to zero, so the
  contrast isolates the fear, with the representation held identical.
- The committed offline replay predicted a cross-pool cosine of **0.9992**, and the
  live run agreed.
- **Bounded:** the apparatus has one world sensor that tells the situations apart:
  `is_in_water`, a binary flip. What transferred is invariance to *place*, not to a
  changed situation. A lit pond reads **0.588** against the 0.85 threshold, so the
  context wall still stands there.

The tracker counts four earlier EARNED rows for this family: Exp 45, 52, 53b and 56.
[Evidence](/research/evidence/) summarizes each one.

## Its two limits

**Cosine sees direction, not magnitude.** EC compares readings by cosine similarity. A
situation gets its own cluster only when some sensor swings from neutral to an
extreme, or across neutral. A move that stays on one side of neutral never separates,
at any gain. So a situation engram is exactly as specific as the world channel lets
it be. The engine's account is
[`cosine-separation-is-directional.md`](https://github.com/dennys246/Maxim/blob/main/docs/wiring/cosine-separation-is-directional.md).

**One boundary a day, just before the clock wraps.** The world channel encodes
`time_of_day` as a straight line from 0 to 1, but the in-game clock is a circle. So
the moments just before and just after the wrap sit at opposite ends of the sensor.
Measured against the 0.85 threshold, the drowning pool reads 0.903 at midnight
(0.75), 0.847 at 0.95 and **0.799 at 0.99**. The earned drowning fear therefore holds
through the night and **misses in roughly the last 5% of each in-game day**
([#899](https://github.com/dennys246/Maxim/issues/899)). The experiments hold the
in-game day frozen, which hides this. Earlier write-ups called the 0.799 reading
a "night miss". It is the wrap, not night.

## What's next

The engine's fix plan,
[`docs/plans/engram_formation.md`](https://github.com/dennys246/Maxim/blob/main/docs/plans/engram_formation.md),
lists seven items. None of them adds a new mechanism: each fixes, documents, measures
or connects one that already exists.

| Item | Issue | What | Gates 1.4.0? |
| --- | --- | --- | --- |
| E1 | [#908](https://github.com/dennys246/Maxim/issues/908) | Save the Cerebellum where it loads from | Yes (T7) |
| E2 | [#909](https://github.com/dennys246/Maxim/issues/909) | Say what runs in the motor path; mark what doesn't as Dormant | Yes (T7) |
| E3 | [#910](https://github.com/dennys246/Maxim/issues/910) | Remove a `[DANGEROUS]` label that can never fire | Yes (T7) |
| E4 | [#911](https://github.com/dennys246/Maxim/issues/911) | Measure the recognition-drift hazard offline | Yes (T7): the measurement, not a fix |
| E5 | [#899](https://github.com/dennys246/Maxim/issues/899) | Encode the daily clock without a wrap | No: owned by the 1.4 keying work |
| E6 | [#848](https://github.com/dennys246/Maxim/issues/848) | Let an episodic engram act without the LLM (2S-e) | No: owned by the memory line |
| E7 | [#909](https://github.com/dennys246/Maxim/issues/909) | Motor engrams: wire them, or retire them | No: owned by the 1.4 graded-predictor audit |

E1–E4 together make up release threshold **T7**, which gates 1.4.0. E5 moves the world
channel's geometry, so it will re-open the Exp 53b, 56, 60, 61 and 62 rows for
re-runs. That is why it waits for its own plan and review, not a quick patch.

For how these traces are stored and consolidated, see
[Memory systems](/memory/overview/).
