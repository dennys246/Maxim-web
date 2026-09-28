---
title: Evidence
description: The claim ledger — every claim Maxim makes, its status, the experiments behind it, and what each result does not show.
---

This page is the claim ledger: one row per claim Maxim makes, ordered by the strength of
its evidence, each with the limits that bound it and a link to the page that tells the full
story. Nothing here is a benchmark score: these are mechanism demonstrations at modest
sample sizes, and presenting them as competitive scores would invite exactly the wrong
scrutiny.

The authoritative sources are in the pymaxim repo, and they win over this page if they ever
disagree:

- [Behavioral graduation ledger](https://github.com/dennys246/Maxim/blob/main/docs/plans/behavioral_graduation_candidates.md) — which bio-claims have earned a cited experiment, and their current lifecycle status
- [Known defects](https://github.com/dennys246/Maxim/blob/main/docs/bugs/README.md) — what is verifiably wrong or bounded right now
- [Measurement limits](https://github.com/dennys246/Maxim/blob/main/docs/limits/README.md) — what the instruments themselves cannot resolve ([summary on this site](/research/limits/))
- [All experiments](/research/experiments/) — the full lab notebook, grouped by research line

## Summary

Strongest evidence first. "n" is per arm unless stated.

| Claim | Status | Key experiment(s) | n | Full story |
|---|---|---|---|---|
| [A taught want transfers between independent agents](#a-taught-want-transfers-between-independent-agents) | earned | [Exp 56](/research/experiments/exp-56/) | 50 receivers | [World seam](/research/experiments/world-seam/) |
| [A survival fear transfers between agents](#a-survival-fear-transfers-between-agents) | earned | [Exp 61](/research/experiments/exp-61/) | 12 transferred vs 24 isolated, 12 + 24 falsifiers | [World seam](/research/experiments/world-seam/) |
| [Caregiver-taught orienting through hunger relief](#caregiver-taught-orienting-through-hunger-relief) | earned, reproduced | [Exp 52](/research/experiments/exp-52/) | 12 seeds (embodied, run twice); 8 seeds (scripted) | [The Cradle](/research/cradle/) |
| [Substrate-primary safe-vs-harm discrimination](#substrate-primary-safe-vs-harm-discrimination) | earned | [Exp 42](/research/experiments/exp-42/), [42b](/research/experiments/exp-42b/) | 10 seeds; 40 sub-sims on re-run | [Roy harness](/research/experiments/roy-harness/) |
| [A learned fear carries to a second pool](#a-learned-fear-carries-to-a-second-pool-the-same-situation-a-different-place) | earned (rung A) | [Exp 62](/research/experiments/exp-62/) | 12 cross-pool, 12 same-pool, 3 ablated | [World seam](/research/experiments/world-seam/) |
| [Learned, anticipatory avoidance from the game's own pain](#learned-anticipatory-avoidance-from-the-games-own-pain) | earned | [Exp 60](/research/experiments/exp-60/) | 5 seeds × 6 placements | [World seam](/research/experiments/world-seam/) |
| [Cross-session memory persistence](#cross-session-memory-persistence) | maintained (narrow), 2026-09-27 | [Exp 10](/research/experiments/exp-10/), [Exp 12](/research/experiments/exp-12/) | single multi-phase runs, re-run twice | [Cross-session recall](/research/experiments/cross-session-learning/) |
| [Sensorimotor learning on real hardware](#sensorimotor-learning-on-real-hardware) | earned (merge arm downgraded) | [Exp 45](/research/experiments/exp-45/)–[45e](/research/experiments/exp-45e/) | mostly single hardware sessions; 45d three seeds | [Hardware orienting](/research/experiments/hardware-orienting/) |
| [Cross-context readout on hardware](#cross-context-readout-on-hardware) | earned | [Exp 53b](/research/experiments/exp-53/) | 3 seeds, 180 trials | [Hardware orienting](/research/experiments/hardware-orienting/) |
| [Two-joint centering](#two-joint-centering) (simulated) | earned | [Exp 49](/research/experiments/exp-49/) | 10 trials | [Hardware orienting](/research/experiments/hardware-orienting/) |
| [Pooling partial learners](#pooling-partial-learners--faster-per-participant-at-a-total-experience-cost) | partial | [Exp 57](/research/experiments/exp-57/) | 20 cohorts per rung | [World seam](/research/experiments/world-seam/) |
| [Carried memory shifts an LLM-driven agent's behaviour](#carried-memory-shifts-an-llm-driven-agents-behaviour) | partial | [Exp 37](/research/experiments/exp-37-graduation/) | 5 trials, four models | [Cross-session recall](/research/experiments/cross-session-learning/) |
| [What a carried drive is worth](#what-a-carried-drive-is-worth-the-r3-benchmark) | reference (nothing graduated) | [R3](/research/experiments/r3/) | 12 agents × 5 arms | [World seam](/research/experiments/world-seam/) |
| Carried substrate overrides a contrary LLM prior | null | [Exp 38](/research/experiments/exp-38/), [Exp 40](/research/experiments/exp-40/) | five models (four in Exp 38, one in Exp 40) | [Roy harness](/research/experiments/roy-harness/) |
| A shared want generalizes to a new layout | null | [R1](/research/experiments/r1/) | structural (no campaign) | [World seam](/research/experiments/world-seam/) |
| The world's own drives move behaviour | null | [R2](/research/experiments/r2/) | premise check | [World seam](/research/experiments/world-seam/) |
| "Dark means danger" can be learned | null (blocked at the instrument) | [Exp 58](/research/experiments/exp-58/) | dry run | [World seam](/research/experiments/world-seam/) |

The nulls are explained under [where it didn't hold up](#where-it-didnt-hold-up); every null,
block and dated correction is listed under
[nulls, retractions and corrections](#nulls-retractions-and-corrections).

## The claims

### A taught want transfers between independent agents

**Claim.** Agent A is taught by a contingent teacher that one action pays off at one world
situation. A's substrate is exported as a bundle — unsigned, through the shipped export and
ingest path — and ingested into agent B — a
different `agent_id`, a separately built entorhinal cortex and sensor encoder, disjoint
cluster ids. At B's **first contact** with that situation, B chooses A's taught action. The
1.2 headline.

**Evidence.** [Exp 56](/research/experiments/exp-56/), earned 2026-09-06, gates frozen before
any run. Live Paper 1.16.5 Minecraft world, n = 50 receivers per arm, no LLM in the action
path. Taught receivers chose the target on **0.84** of first contacts [0.71, 0.92] against an
isolated floor of **0.22**; **0.80** were decided by the situation-keyed bias channel
[0.67, 0.89] against **0.00** in every control. All four gates pass (TRANSFERRED 0.80 ≥ 0.70;
ABOVE-FLOOR 0.62; WANT-NOT-FILE 0.72; BOTH-HALVES −0.10 < 0.10) plus the anti-vacuity kit. A
satiated donor (same feeds, zero credit) and a dangling-half falsifier (bias keys without
their clusters, dropped loudly at ingest) both sit at **0.12**. Re-run on Paper 1.20.4
(2026-09-19) with every rate identical — a same-seed reproduction, not an independent
replication.

**What it does not show.**
- One campaign, one world layout, substrate-primary, in Minecraft, n = 50 per arm.
- Not scaling (that is [Exp 57](#pooling-partial-learners--faster-per-participant-at-a-total-experience-cost), partial); not hardware — the two-Reachy replication is its own pre-registration and has not run.
- Not aversion — a fear's transfer is its own result ([Exp 61](#a-survival-fear-transfers-between-agents)).
- Not cross-layout generalization: A trains and B probes the *same* seeded configuration, and the [R1](/research/experiments/r1/) null says the current readout cannot do otherwise.
- The want is installed by a contingent teacher, not acquired on the agent's own.

### A survival fear transfers between agents

**Claim.** A fear one agent learned from pain travels to an agent that never felt it, through
the shipped export and ingest path, and changes what that agent does the first time its own loop
runs underwater. The 1.3 headline: the 1.2 transfer claim moved from a taught want to a fear
the world taught.

**Evidence.** [Exp 61](/research/experiments/exp-61/), earned 2026-09-17, one campaign at one
code hash, 121 rows, zero refusals. The received fear is **discounted by a quarter at
ingest** (a fear you were told about is weaker than one you felt). **12 of 12** transferred
receivers left the water, against **0 of 24** isolated, **0 of 12** where the donor's cluster
and percept valence shipped without its fear (zero executor calls), and **0 of 24** where the
fear shipped without the cluster it keys on (dropped at ingest, loudly). Fisher one-sided
p = 8.0 × 10⁻¹⁰; all six frozen gates pass. Before any loop ran, every receiver read the fear
at exactly the discounted value.

**What it does not show.**
- One campaign, one pool, one world layout; teacher-free but substrate-primary throughout.
- "First loop-live submersion" is precise: the receiver is submerged once with the loop **off**, at the representation gate, before the measured run.
- The discount's magnitude is not tested — 0.75 clears the threshold, and so would other values.
- Extinction, scaling past one donor, the *received* fear's reach to a different pool, and promotion on the sharing side are all untested. [Exp 62](#a-learned-fear-carries-to-a-second-pool-the-same-situation-a-different-place) measured an agent's *own* fear crossing pools, not a received one.

### Caregiver-taught orienting through hunger relief

**Claim.** An infant with a hunger drive and *no* orient drive learns to turn toward its
mother's voice when — and only when — her feeding relieves its hunger. Same feeds, same
contingency, no need → no learning. No LLM in the action path.

**Evidence.** [Exp 52](/research/experiments/exp-52/), earned 2026-08-25, gates frozen before
the data. Phase A (scripted, 8 seeds × 600 ticks): taught **0.892** against satiated, yoked and
no-feed all **0.496** — the yoked arm got every taught credit decoupled from its own actions
and stayed at chance. Phase B (embodied, shuffled-stimulus apparatus v3, 12 seeds per arm,
exposure-matched): taught **0.878** against satiated **0.441** (fed on 35% of turns, credited
on 0%) and no-feed **0.413**; LEARNED, MOTHER-TAUGHT and HUNGER-NECESSARY pass, and the
apparatus check Exp 48 failed is clean. Re-run whole on 2026-09-02 after the D53 credit-path
fix, same gate and seeds: **0.837 / 0.413 / 0.413**, GRADUATE reproduced, every delta inside
the per-seed spread. Phase A was not re-run (scripted; its credit does not route through the
changed path).

**What it does not show.**
- Each Phase B run is one session at n = 12 per arm; the arm means reproduced once. **Per-seed values do not** — see the [2026-09-02 correction](#nulls-retractions-and-corrections).
- The credit is sign-only: it separates nonzero from zero relief, not "hungry" in the everyday sense (hunger at feeding ≈ 0.05–0.1, far below any deprivation threshold).
- Nothing about how *far* to turn, loudness, the LLM-driven action path, or credit spanning more than one turn. Secondary reinforcement of the voice and devaluation are not modeled.

### Substrate-primary safe-vs-harm discrimination

**Claim.** With the language model removed from the action path, the substrate learns from
embodied pain to prefer a safe warmth source over a harmful one, and tracks *which source is
currently safe* rather than latching onto a fixed identity.

**Evidence.** [Exp 42](/research/experiments/exp-42/), earned, ten seeds per arm (0.984 /
0.975), with a counterbalance that swaps the safe source and confirms preference follows the
swap. Re-validated after a refactor by [Exp 42b](/research/experiments/exp-42b/): 40 sub-sims,
none failed.

**What it does not show.**
- Not the mechanism it was designed to test: the gating-OFF ablation graduated *identically*, refuting the pre-registered hypothesis. The effect comes from per-source credit assignment, not drive-gating.
- The metric is saturated (0.98–1.00, SD 0.000 in every configuration), so a passing re-run shows "not broken" and cannot detect a moderate regression — limit [L4](/research/limits/).
- A mechanism-level result in one narrow embodied task, not a general claim about substrate-driven behaviour.

### A learned fear carries to a second pool: the same situation, a different place

**Claim.** An agent that learned the drowning fear in one pool leaves the water on its first
live submersion in a *second* pool, at a different altitude and distance from spawn. Nothing
shared, ingested or changed — no new mechanism, no new sensor. The fear travels because the
body reads the second pool as the same situation.

**Status.** Earned on the engine's ledger. It is **not a claim of the 1.3.1 release** until
a second reader's review of it is recorded.

**Evidence.** [Exp 62, rung A](/research/experiments/exp-62/), earned 2026-09-20 on the
shipped 1.3.0 body; 27 rows, zero refusals, one code hash. Cross-pool **12 of 12**, same-pool
**12 of 12**, fear-ablated **0 of 3** with zero executor calls (their readings resolve to the
*same* node, so the contrast is the fear alone). All five frozen gates pass; cross-pool vs
ablated Fisher one-sided p = 0.0022. The informative number is the Wilson lower bound, **at
least 0.758**, not "100%". The two arms' latency intervals overlap: no evidence the second
pool is slower.

**What it does not show.**
- Not a general generalization result. One world sensor discriminates situations (in water or not, binary), so the situation space has two points; what carried is invariance to *place* (two low-weight position readings), not to a changed situation.
- The context wall stands: a lit pond reads 0.588 against a 0.85 threshold, and the fear misses there.
- The fear also misses in roughly the last 5% of each in-game day (time ≈ 0.94–0.99), where the clock wraps — the frozen-day protocol hides this ([Engrams](/memory/engrams/#its-two-limits); the reading was once recorded as a night miss, [corrected 2026-09-25](#nulls-retractions-and-corrections)).
- Bounded to the sealed-shell, frozen-day class of pools it ran on. The ablated arm is n = 3. Rung B is designed, not built.
- No sharing: a *received* fear's reach to another pool is untested. Nothing here says Maxim is afraid of water anywhere.

### Learned, anticipatory avoidance from the game's own pain

**Claim.** An agent held underwater until air-hunger pain, then rescued, carries a fear keyed
to *that situation* — not to the place, not to a written rule — and on later submersions
leaves the water **before** the pain would fire. The learning signal is the game's: no
teacher, no LLM in the action path.

**Evidence.** [Exp 60](/research/experiments/exp-60/), earned 2026-09-16, frozen before any
trial. Live Paper 1.20.4 water classroom, five seeds per arm, six pain-free placements each.
The trained arm surfaced on **1.0** of placements (from 0.0 before training, every seed)
against **0.0** for its yoked ablated twin — same water, pain, episodes, actuator and loop,
fear subscriber detached — which made **zero** executor calls in 30 placements. Exact
permutation p = 1/252, the floor for five against five. Specific: water cluster −1.0, shore
0.0. Latency is measured from placement: across all 30 post-training placements the median
is **1.72 s** (range 1.28–3.34 s), inside the 4.34 s pain-free window and a median 3.4 s
before the 5.09 s pain edge. That median includes placements 2–6, which are link-assisted
(below); the fear-only read — the **first** post placement per seed — surfaced **5 of 5 at
2.9–3.3 s**, still inside the window.

**What it does not show.**
- Five seeds per arm.
- After a seed's first escape the escape action also carries a positive causal link, so placements 2–6 read fear *plus* that link; only the first placement per seed reads fear alone, and no per-placement decomposition is measured.
- Nothing about other geometries or bodies of water, persistence or extinction after a delay, or innate versus learned beyond the ablation.
- The contingency is water because "dark means danger" was tried first and [blocked at the instrument](#where-it-didnt-hold-up).

### Cross-session memory persistence

**Claim.** The substrate carries memory across sessions. A resumed session opens with the
prior session's store intact, surfaces roughly three relevant memories per turn, and
accumulates causal links rather than re-deriving them.

**Status: MAINTAINED (narrow), 2026-09-27.** 1.3.1 changed what the memory store saves,
which fired this row's re-run trigger, so [Exp 10](/research/experiments/exp-10/) was run
again before release, at engine commit `a1ba1e5d` (operator-attested). What it showed: both resumed sessions reloaded the saved
store exactly (100 memories); the fields the persistence change added came back unchanged
on all 100; and 3 memories surfaced on every resume turn observed. What it did not: each
resumed phase ran only **one turn**, against eight in August, because every run stopped
early on a known planning defect (D13, engine issue
[#935](https://github.com/dennys246/Maxim/issues/935)); and link accumulation was not
re-shown, since no run was long enough for a link to be observed twice. The discarded and
disclosed attempts are in the
[re-run record](https://github.com/dennys246/Maxim/blob/main/docs/experiments/data/rerun_exp10_2026-09-27/README.md).

**Earlier evidence.** The August 2026 heartbeat walk was the row's cleanest pass: phase 2
opened at exactly phase 1's closing store, hit the three-per-turn bar on 8 of 8 turns, and
grew the store; a third phase in a different setting showed no negative transfer.
[Exp 12](/research/experiments/exp-12/) isolates recall to the substrate alone (7 of 7
phases, including the one with every scaffold disabled).

**What it does not show.**
- Persistence, not behavioural override. That remembering changes what the agent does is a separate, much more qualified claim — [see below](#carried-memory-shifts-an-llm-driven-agents-behaviour).
- Single runs, not a statistical campaign. The original April raw logs were written to `/tmp` and lost; the surviving raw records are the August and September re-runs.
- "3 per turn" is the enrichment cap filled from carried memories, not a relevance measure.
- The September re-run is too thin to test negative transfer: its third phase took one action.

### Sensorimotor learning on real hardware

**Claim.** On a physical Reachy Mini, with no LLM in the action path, the substrate learned a
closed-loop sound-orienting policy from scratch — direction first, then magnitude — and
carried it across sessions.

**Evidence.** The [Exp 45 series](/research/experiments/exp-45/). Direction: probe correctness
went from 0.00 (the fresh policy abstains, which the probe counts incorrect — not chance) to
1.00 in about ten trials, and cross-session transfer was correct at trial zero. Magnitude:
[45b](/research/experiments/exp-45b/), [45c](/research/experiments/exp-45c/),
[45d](/research/experiments/exp-45d/) (three seeds) and [45e](/research/experiments/exp-45e/)
(population-vector readout). After two motors broken through the whole 1.0+ era were replaced
in August 2026, re-validation passed the sensor sweep and, on 2026-08-24, the large-step
delivered shift (n = 8 per side, 0.94 of commanded on both sides), clearing the provisional
flag on that magnitude.

**What it does not show.**
- **Arm 3 (merge) downgraded 2026-09-01 — a vacuous guard (D62).** Its gauntlet passed with the merge replaced by `return left` or `return right`; its gate read direction only, both parents were already perfect, and both shared one `agent_id` and cluster space — so it never tested sharing between independent agents (D62). The guard was repaired in 1.1.3; the downgrade stands. Arms 1 and 2 are unaffected.
- Magnitude measured before the motor repair was provisional (direction is sign-based and survives). The re-validation is **one session**, cross-session replication outstanding; it surfaced head-roll drift (D30) and a missing front/back fold guard on the credit path (D31). The sweep gain is a full-range fit under an R² gate (L9).
- Several magnitude arms are single hardware sessions on a metric quantized to five values over four bins; the 45e bootstrap result is one seed.
- Does not generalize to an EC-clustered orient policy: the state is a hand-written bin string, never the entorhinal cortex (D10).
- An early sensor-characterization finding was retracted (head-frame bug, 2026-07-16); magnitude needed the fix, direction did not.

Full story, including the merge arm's three vacuities and the repaired guard:
[Hardware orienting](/research/experiments/hardware-orienting/).

### Cross-context readout on hardware

**Claim.** Three infants taught in the Exp 52 nursery, with their persisted NAc + EC files
loaded **unchanged** onto a physical Reachy Mini — nothing credited on the robot — turn toward
the speaker; the never-hungry controls, loaded the same way, do not. The want was learned in
the nursery; the robot only reads it out. The cross-context half of the 1.1 claim.

**Evidence.** [Exp 53b](/research/experiments/exp-53/), earned 2026-08-26, instrument and
transfer gates frozen before the data. Gate I: 60 of 60 live percepts pattern-complete into
the nursery's clusters (120 of 120 across 53 and 53b). Gate T: taught **1.00 / 1.00 / 1.00**
(36 of 36 toward the source), satiated **0.00** (no action, 36 of 36), no-feed **0.50**
(`turn_right` 54 of 54, no learned bias). Step 0.30 rad; 180 trials; files SHA-verified
unchanged. [Exp 53](/research/experiments/exp-53/) at 0.55 rad overshot (0.75 per seed, every
miss at −0.2): the pre-registered APPARATUS verdict that motivated 53b's one change. Re-run on
the robot 2026-09-02 after D53, same files: reproduced exactly — on a platform that emitted
**85 actuator-degradation warnings in 180 trials**, all roll and pitch, never yaw (the axis
the readout rides on). A pass on a platform that was warning, not a clean win; a roll/pitch
recalibration is owed.

**What it does not show.**
- Readout, not learning — nothing credits on the robot.
- One session, one room, one sound source, n = 3 seeds per arm, one fixed step, front hemisphere only; nothing about how far to turn or loudness.
- A +0.2 placement turned the *wrong* way 18 of 18 across both runs, predicted before any robot data: the nursery's centre bin (−0.4 to +0.3) carries `turn_left`. The −0.6 placement turned toward 18 of 18. That is the representation's limit, not generalization.
- Exploratory seed 48 read out 0 of 12: its nursery map differs, so it mis-learned; the old "weak learner" explanation is retracted.
- A secondary block at exploration weight 1.5 (not gated) read 0.75 per seed, direction still 36 of 36; its misses came from about +0.07 of geometry drift over the session (D30 re-measured).
- Reading out the post-fix nursery is a separate question, not yet registered or run. A [demo video](https://youtu.be/lLoPM2EkbPU) with the same files is not evidence (larger step, stamped `evidence=false`). A fresh install starts blank — there is no pre-loaded want.

### Two-joint centering

**Claim.** Given sound sources beyond the neck's reach, an agent with motor-bound body-turn
affordances can center them; a head-only agent plateaus at the neck limit.

**Evidence.** [Exp 49](/research/experiments/exp-49/), all three hypotheses met, in
simulation. Head-only
centered 0 of 10 with 60% parked at the neck envelope; the LLM's first body turn was
direction-correct 10 of 10; relief credit matched true direction-progress on both arms (1.00
LLM, 0.969 substrate).

**What it does not show.**
- It is not a hardware result: it ran against a `SimulatedController` with a synthetic
  direction-of-arrival reader, and the robot never moved.
- Ten trials per arm.
- It is a split, not a win: the LLM crosses the microphone array's front/back fold; the substrate is trapped by it, though roughly twenty times faster where its policy applies.

### Pooling partial learners — faster per participant, at a total-experience cost

**Partial by pre-registration — read both halves.** The 1.2 scaling claim, run as its
may-fail second claim.

**Passed.** Pooling N partial learners lets each reach criterion in fewer of **its own**
trials: **21 → 21 → 15.5 → 10.5** across N = 1/2/4/8 (ordered-trend p ≈ 1e-4, surviving the
drop of fully-censored rungs). The mechanism is coverage — 0.25 → 0.50 → 0.75 → 0.75 — not
louder wants: the fold is a convex combination and cannot amplify.

**Failed.** Pooling is **not a total-sample free lunch**: N × τ of **42 / 62 / 84** against a
matched single agent's **41 / 46 / 43**. Averaging N partial biases recovers coverage but
dilutes signal. The honest sentence is *faster per participant, at a total-experience cost*.

**Evidence.** [Exp 57](/research/experiments/exp-57/), partial 2026-09-08, gates frozen at the
pre-registration merge. One ladder on live Minecraft, 4 rungs × 3 conditions × 20 cohorts
(9,200 rows); noise-floor, seed-variance and anti-vacuity gates pass.

**What it does not show.**
- One campaign, one layout, substrate-primary, in Minecraft, 20 cohorts per rung, teacher-taught wants.
- Not a scaling law — the gate is monotone decrease, not a functional form.
- The failing comparison is strict serial sample cost; pooling may still win in wall-clock terms, which was not measured.
- Whether a coverage-preserving fold closes the cost is open; 1.3 did not address it.

### Carried memory shifts an LLM-driven agent's behaviour

**Partial.** [Exp 37](/research/experiments/exp-37-graduation/), the pre-registered 1.0 gate,
found a cross-session behavioural shift only at ≥32B, and only where the model's prior left
headroom (a "Goldilocks zone" across four
[model fires](/research/experiments/exp-37-cross-model/)). The isolation arm failed on every
fire where the primary passed, so independence from the LLM prior is not established; the
identical commit on identical seeds did not reproduce its own June result in August (0.71
against 0.42, limit [L8](/research/limits/)). Details under
[where it didn't hold up](#where-it-didnt-hold-up) and on
[Cross-session recall](/research/experiments/cross-session-learning/).

### What a carried drive is worth: the R3 benchmark

**Nothing here graduated.** [R3](/research/experiments/r3/) is an instrument and a frozen
baseline, here because it answers "so what does the drive buy?" Five arms of twelve fresh
agents, one unrescued submersion each on a depth-calibrated gauntlet. Median time to air:

| arm | what it carries | time to air |
|---|---|---|
| A | the innate health reflex only | 28.0 s |
| B | learns the fear there, in the water | 8.6 s |
| C | carries a fear it learned earlier | 3.2 s |
| D | carries a fear it received from another agent | 3.1 s |
| E | the same pain exposure as C, fear subscriber detached | 28.1 s |

**What it does not show.**
- **Not life.** Every agent in every arm survived; with regeneration on, survival is a ceiling by design. The drive buys cost: about 25 s of latency, about 11 health points and about 22 s of oxygen pain. E ≈ A (pain without the fear subscriber buys nothing); D ≈ C (a received fear acts like a learned one).
- The frozen report read INCOMPLETE on two rules that were facts about the instrument (a code-hash rule no bench run could satisfy; a cadence band that measured tick phase on few-second events). Both were amended after the data, instrument-only, reviewed by two independent lenses, and published *beside* the frozen report. Restoring the refused rows moved the carried-fear median 0.10 s in the claim's favour — which is why the amendment rests on the instrument argument, and why both reports ship.

## Where it didn't hold up

The most useful results here are the negative ones, and they bound the whole project.

**Carried substrate does not override a strong contrary LLM prior.** In a world where the
prior is *wrong* — a hearth whose warming action hurts — agents carrying cross-session pain
from that exact hearth still warmed at it, across four frontier models with a matched
safe-fire control ([Exp 38](/research/experiments/exp-38/)); it held again on the one model
where a substrate effect had shown ([Exp 40](/research/experiments/exp-40/)). The
reasoning-trained model was sharpest and worst: its substrate was load-bearing, but it
amplified the carried association rather than the corrective pain.

**Where transfer *is* detectable, it sits in a narrow band.** Across four
[Exp 37 model fires](/research/experiments/exp-37-cross-model/), a behavioural delta appeared
only where the base model's priors left headroom between first-encounter and optimal
behaviour, governed by training method at least as much as parameter count: one model's
priors were too weak to use the substrate, another already solved the task. Those magnitudes
are readings taken at one time, not constants: the serving environment moved the whole
distribution more than the code did, and the run records cannot reconstruct why
([L8](/research/limits/)).

**"Dark means danger" was blocked at the instrument.** On the shipped sensors the dark and
safe situations never form distinct clusters, so a fear has nothing to key on — a dilution
like the [sensor-count limit](/research/limits/#l11--the-sensor-count-discrimination-ceiling),
verified unfixable by an encoding remedy. Only the mechanism's write side (pain → cluster
fear) was shown live; a 2026-09-16 correction notes that the dry run's staircase flee was a
preflight actuation check, not the agent loop. The mechanism was kept and the cue swapped to
drowning, which separates; recorded as blocked rather than quietly re-aimed
([Exp 58](/research/experiments/exp-58/)).

**A shared want is a cache entry, not a concept.** The want Exp 56 transfers is keyed on an
exact cluster, so a genuinely different layout misses it: cross-layout generalization is
unreachable in the current readout. Resolved as a pre-registered structural null from the
mechanism ([R1](/research/experiments/r1/), CACHE-CONFIRMED 2026-09-07) — an open design
question, not a defect. [Exp 62](#a-learned-fear-carries-to-a-second-pool-the-same-situation-a-different-place)
is consistent with it: the fear carried because the second pool reads as the *same*
situation, and misses where the situation reads as different (the lit pond). Generalization
across a changed situation is the 1.4 working direction, not a result. Transfer is
demonstrated; generalization is not.

**World-owned drives do not, on their own, move behaviour.** The Minecraft body's health and
food drives, drained by the game, did not push the agent toward the corrective affordances,
and the survival loop had three breaks; the dependent rungs stopped under their own
pre-registered stop rule ([R2](/research/experiments/r2/), PREMISE-NULL 2026-09-07).
*Updates, 2026-09-11 and 2026-09-12:* 1.3 closed all three breaks in engineering terms, and a
live smoke showed them composing (hungry agent selects food, eats, relief is signalled) — a
composition check that books no reward, not the measurement. Then two isolation designs, a
design review and offline experiments settled the learned-bias question: the drive-relief
cluster credit forms but is a behavioural messenger, not a cause — selection is carried by the
innate prior plus a state-blind tool-success link learned from eating. **R2 stays
PREMISE-NULL** for the cluster-credit claim, and no live learned-bias run is owed. Eating when
hungry remains prior-driven, not learned.

**The consequence for how Maxim is described.** The strong framing — that the substrate
drives action selection through specific bio-mechanisms — is pulled from the release
positioning. Maxim ships as a bio-inspired LLM harness: the substrate supplies
experience-grounded context to an LLM that still decides. Substrate-*primary* discrimination,
with the LLM removed, is the separate and narrowly graduated result above.

## Nulls, retractions and corrections

Every null, block, withdrawal and dated correction, oldest first. Each experiment's page
carries its record.

- **2026-04-06 — hippocampal recall, partial.** Memory survived (1.0) but behavioural recall was 0 ([run notes](/research/experiments/hippocampal-recall-run-notes/)).
- **2026-04-15 — P4 mug test withdrawn.** The v1 test was tautological ([P4 mug test](/research/experiments/p4-mug-test-sweep/)).
- **2026-04-16 — P4 bridge concepts, null.** Lift 0 across 10 seeds; option deferred ([P4 option 2](/research/experiments/p4-option2-measurement/)).
- **Never run — temporal credit validation.** Protocol shipped, never executed; no result ([record](/research/experiments/temporal-credit-validation/)).
- **2026-05-12 to 2026-05-28 — the Roy nulls.** Roy-1a and Roy-1b ([Exp 16](/research/experiments/exp-16/), [17](/research/experiments/exp-17/)) wrote substrate that never changed behaviour; [19](/research/experiments/exp-19/), [21](/research/experiments/exp-21/), [23](/research/experiments/exp-23/), [27](/research/experiments/exp-27/), [30](/research/experiments/exp-30/), [32](/research/experiments/exp-32/), [33](/research/experiments/exp-33/) and [34](/research/experiments/exp-34/) are nulls in the same line ([Roy harness](/research/experiments/roy-harness/)).
- **2026-06-13 — Exp 39 superseded without being run** ([Exp 39](/research/experiments/exp-39/)).
- **2026-06-13 / 2026-06-16 — prior dominance, null.** [Exp 38](/research/experiments/exp-38/), [Exp 40](/research/experiments/exp-40/).
- **2026-06-19 — Exp 41 withdrawn (void).** Could not isolate exploration and its metric floored ([Exp 41](/research/experiments/exp-41/)).
- **2026-07-16 — Exp 45 sensor-characterization finding retracted** as a head-frame bug artifact ([Exp 45](/research/experiments/exp-45/)).
- **2026-07-28 / 2026-08-11 — Exp 44 exploratory, not a result.** Modest N; the [44b pilot](/research/experiments/exp-44b/) (one seed per arm) found a name-mismatched transplant control and two axes encoding the same pair; the confirmatory run is not frozen ([Exp 44](/research/experiments/exp-44/)).
- **2026-08-11 to 2026-08-18 — Exp 48 retired and superseded.** Its July GRADUATE did not reproduce and its v1 magnitudes are retired. Re-baselined against a re-frozen gate, the mother effect held (+0.482, real and causal) but the learning gate missed (level by 0.001, not retuned; rise substantively); the sweep's seed-invariant twelfths and arm inversion showed the metric tracking phase alignment — credit-tipped attractor selection, not graded skill (L2). Not retracted, not a code regression; its PARTIAL stands for the constant-credit apparatus. Superseded by Exp 52 ([Exp 48](/research/experiments/exp-48/), [the Cradle](/research/cradle/#48--cradle-mother-seam-the-embodied-infant)).
- **2026-08-22 — Exp 37 does not reproduce itself** (0.71 against June's 0.42; limit L8) ([Exp 37](/research/experiments/exp-37-graduation/)).
- **2026-08-26 — Exp 53 APPARATUS verdict.** The 0.55 rad step overshot; 53b changed only the step ([Exp 53](/research/experiments/exp-53/)).
- **2026-09-01 — Exp 45 merge arm downgraded** to a vacuous guard (D62) ([above](#sensorimotor-learning-on-real-hardware)).
- **2026-09-02 — Exp 52 per-seed story retracted.** Only 4 of 36 (arm, seed) cells matched across runs; per-seed r = +0.66 / +0.29 / −0.24; the "weak" seed (0.54) read 0.667. Arm means replicate, per-seed narratives do not. The same date retracts the "weak learner" reading of Exp 53b seed 48 ([Exp 52](/research/experiments/exp-52/)).
- **2026-09-03 — merge between independent agents did not work before 1.1.3** (D43); the Exp 45 merge arm and the Exp 46 crèche federation both ran in the one configuration where the defect cannot fire ([not shipped](#not-shipped-not-claimed), [the Cradle](/research/cradle/#46--operant-orient-a-mother-teaches-a-crèche-pools)).
- **2026-09-07 — R1 null** (cache, not concept) and **R2 null** (premise) ([R1](/research/experiments/r1/), [R2](/research/experiments/r2/)).
- **2026-09-11 — R2 dated update:** the survival loop now composes on the live path; R2 stays PREMISE-NULL ([above](#where-it-didnt-hold-up)).
- **2026-09-12 — R2 learned-bias line resolved offline:** the cluster credit is a messenger, not a cause; v1 superseded and v2 withdrawn, both without live data ([v1](/research/experiments/r2-learned-bias-v1/), [v2](/research/experiments/r2-learned-bias-v2/)).
- **2026-09-14 — Exp 58 blocked at the instrument** ([Exp 58](/research/experiments/exp-58/)); **2026-09-16 correction:** its dry run never showed the loop-executed read, only the write side.
- **2026-09-18 — R3 post-data instrument amendment**, published beside the frozen report ([R3](/research/experiments/r3/)).
- **2026-09-25 / 2026-09-27 — Exp 37's NAc-bias-off arm voided, then Exp 38's** ([#889](https://github.com/dennys246/Maxim/issues/889)): it left the reward bias on and in effect switched off Wire-A's annotation instead, so the Wire-A and Wire-1 arms are the only valid ablations ([Exp 37](/research/experiments/exp-37-graduation/), [Exp 38](/research/experiments/exp-38/)).
- **2026-09-25 — Exp 62 "night pool" corrected** ([#899](https://github.com/dennys246/Maxim/issues/899)): the 0.799 reading was the in-game clock's wrap (time 0.99), not night; midnight reads 0.903. The fear misses only at time ≈ 0.94–0.99. The lit-pond miss (0.588) stands ([Exp 62](/research/experiments/exp-62/)).
- **2026-09-27 — Exp 56 and Exp 61 were unsigned.** Both harnesses exported through the real CLI without `--sign`; the claims rest on the shipped export and ingest path, not on signing ([Exp 56](/research/experiments/exp-56/), [Exp 61](/research/experiments/exp-61/)).
- **2026-09-27 — Exp 10 re-run: maintained, narrow.** Exact reload and 3 memories per observed resume turn, but one turn per phase (D13) and link accumulation not re-shown ([above](#cross-session-memory-persistence)).
- **Undated — the original cradle-mother design superseded.** Its intrinsic "centeredness drive" oriented the infant at 1.000 with no mother present ([the Cradle](/research/cradle/)).

## Not shipped, not claimed

- **Peer substrate sharing: transfer is earned; generalization, hardware and scale are not.**
  A taught want ([Exp 56](#a-taught-want-transfers-between-independent-agents)) and a learned
  fear ([Exp 61](#a-survival-fear-transfers-between-agents)) transfer at their stated scopes, over
  an exchange that ships end to end ([the Oasis](/guides/oasis/)). Not earned: cross-layout
  generalization (R1), replication across two physical robots (its own pre-registration, not
  run), scaling beyond the named partial, and — for a shared fear — its reach to a different
  pool, extinction, scaling past one donor and hive-side promotion. *Correction, 2026-09-03:*
  before 1.1.3, merging a foreign substrate produced a want that read **0.0** on the receiver:
  `ec_merge` computed the donor-to-receiver cluster alignment and discarded it, `nac_merge`
  folded biases on exact string keys, and the merge reported success while the bias dictionary
  grew to the union of both key sets (D43). The Exp 45 merge arm and the Exp 46 federation ran
  with a shared agent id and cluster space, where the defect cannot fire, so neither was
  evidence of sharing between independent agents. 1.1.3 fixed the mechanism
  (`maxim.hivemind.substrate_merge` aligns, re-keys, then folds), verified by a behavioural unit
  gate (D44) but library-only and not an earned row; 1.2 shipped `maxim substrate ingest` and
  Exp 56 measured it on a live world.
- **A shared fear is not a shared concept.** Nothing on this site should be read as "Maxim is
  afraid of water".
- **Eating when hungry is prior-driven, not learned.** The world-owned drives move the agent
  toward food because the substrate prior already favours the corrective action — a much
  weaker statement than the fear results (R2 above).
- **The cradle harness as a standard way to raise an agent.** The Phase 0 substrate-primary
  cradle harness shipped and was smoke-tested on 2026-05-09
  ([Exp 13](/research/experiments/exp-13/)), with no behavioural claim; its validation is
  pending. `--aut-mode substrate-primary` is opt-in; `--aut-mode llm-primary` remains the
  default.
- **Architecture layering** is an enforced contract with *reviewed* debt: CI fails on any
  finding outside a baseline shipped in the wheel, and burning it down is 1.1.x work — see
  [architecture](/concepts/architecture/).
- **Loudness / onset salience** is not shipped. Nothing in the audio path reads sound level,
  and no result here depends on it. A bench ([H2](/research/experiments/h2-loudness-bench/))
  established the level is readable from the robot daemon; 1.1.1 through 1.1.4 shipped
  without it, so treat it as planned, not imminent.
- **The Minecraft world seam is apparatus, not a result.** 1.1.4 built it — a server the
  substrate does not control, real hostiles, real timing — with an encoding change so a
  sixteen-sensor body can register events; its one measurement was a limit re-measure that
  confirmed a partial mitigation and did **not** retire
  [L11](/research/limits/#l11--the-sensor-count-discrimination-ceiling). The claims measured on
  it (Exp 56, 57, 60, 61, 62) are about one contingency in one world, not about playing the
  game. The apparatus moved to Paper 1.20.4 in 1.3; Exp 56 reproduced there row for row (same
  seeds, not an independent replication). A `pip install` carries the engine half (bridge
  client, `bodies/minecraft_player`, world backend, two-agent harness); the Mineflayer bridge
  lives in the repository's `scripts/`, so the live seam needs a checkout.
- **Queen-tier promotion is deliberately not shipped.** An Oasis can serve signed Queen-tier
  releases and accept contributions into an experimental tier, but nothing promotes a
  contribution: the gauntlet that would score one does not exist, so the blocker is
  [recorded](https://github.com/dennys246/Maxim/blob/main/docs/plans/archive/hivemind_p2p_scope.md)
  rather than shipping a gate that cannot gate. `maxim hive contribute` is write-only. See
  [the Oasis](/guides/oasis/).
- **Fear gating** is opt-in and off in the stable Python API — see
  [tool safety](/reference/tools/#tool-safety).

## Where this is going

The direction — not a shipped claim — is that the substrate builds itself from lived
experience in the default LLM-primary path, so an agent's substrate stays current through use
rather than only being pre-loaded before a run. The first phase of that work has landed in
the engine; the behavioural validation that it produces a better agent is future work, and
nothing on this site should be read as claiming it yet.
