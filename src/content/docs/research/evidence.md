---
title: Evidence
description: What Maxim has actually demonstrated, what it failed to demonstrate, and the caveat attached to each result — with links to the full experiment records.
---

This page is the short, honest version of Maxim's evidence base. Each entry states
the claim, the caveat that bounds it, and where the full record lives. Nothing here
is a benchmark: these are mechanism demonstrations at modest sample sizes, and
presenting them as competitive scores would invite exactly the wrong scrutiny.

The authoritative sources are in the pymaxim repo, and they win over this page if
they ever disagree:

- [Behavioral graduation ledger](https://github.com/dennys246/Maxim/blob/main/docs/plans/behavioral_graduation_candidates.md) — which bio-claims have earned a cited experiment, and their current lifecycle status
- [Known defects](https://github.com/dennys246/Maxim/blob/main/docs/bugs/README.md) — what is verifiably wrong or bounded right now
- [Measurement limits](https://github.com/dennys246/Maxim/blob/main/docs/limits/README.md) — what the instruments themselves cannot resolve ([summary on this site](/research/limits/))
- [All experiments](/research/experiments/) — the full lab notebook

## Graduated results

These have cited experiments and a settled disposition in the graduation ledger.

### Cross-session memory persistence

**The claim.** The substrate carries memory across sessions. On resume, a new
session opens with the prior session's store intact and surfaces roughly three
relevant memories per turn, accumulating causal links rather than re-deriving them.

**The evidence.** [Exp 10](https://github.com/dennys246/Maxim/blob/main/docs/experiments/10_cross_session_enrichment.md),
status EARNED. Re-validated in the August 2026 heartbeat walk — the cleanest pass
the row has recorded: phase 2 resumed phase 1's session with the hippocampus opening
at exactly its closing store, hit the roughly-three-per-turn bar on eight of eight
turns, and grew the store across the session. A third phase in a different setting
showed no negative transfer.

**The caveat.** This is memory *persistence*, not behavioral override. That the
agent remembers is well supported; that remembering changes what it does is a
separate and much more qualified claim — see [where it didn't hold up](#where-it-didnt-hold-up).

### Substrate-primary safe-vs-harm discrimination

**The claim.** With the language model removed from the action path entirely, the
substrate learns from embodied pain to prefer a safe warmth source over a harmful
one — and tracks *which source is currently safe* rather than latching onto a fixed
identity.

**The evidence.** [Exp 42](https://github.com/dennys246/Maxim/blob/main/docs/experiments/42_substrate_primary_preference.md),
GRADUATE, at ten seeds per arm with a counterbalance that swaps the safe source and
confirms preference follows the swap. Re-validated after a later refactor by
[Exp 42b](https://github.com/dennys246/Maxim/blob/main/docs/experiments/42b_drive_pain_fold_revalidation.md)
across 40 sub-sims with none failed.

**The caveat.** Two, both material. The experiment's own gating-OFF ablation
graduated *identically*, which refuted its pre-registered hypothesis about which
mechanism was load-bearing — the effect comes from per-source credit assignment, not
the drive-gating it was designed to test. And the metric is saturated: it sits at
0.98–1.00 with a standard deviation of 0.000 across every configuration, so a
passing re-run shows "not broken" and cannot detect a moderate regression. That is
recorded as limit L4. This is a mechanism-level result in a narrow embodied task,
not a general claim about substrate-driven behavior.

### Sensorimotor learning on real hardware

**The claim.** On a physical Reachy Mini, the substrate learned a closed-loop
sound-orienting policy from scratch — direction first, then magnitude — with no LLM
in the action path, and carried it across sessions. A third arm merged two
independently trained substrates; it has since been downgraded — see the first
caveat below for what it did and did not show.

**The evidence.** The [Exp 45 series](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45_reachy_orient_live.md).
Three pre-registered arms passed at the time: a learning curve from chance to perfect
in about ten trials, cross-session transfer probing correct at trial zero, and the
merge arm (downgraded 2026-09-01, below). Later arms extended this to magnitude —
[45b](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45b_orient_magnitude.md),
[45c](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45c_flip_bins.md),
[45d](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45d_magnitude_replication.md)
(replication across three seeds), and
[45e](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45e_orient_s4_population_readout.md)
(resolving a coverage ceiling via a population-vector readout).

**The caveats.** Several, and they matter more than the headline.

- **Correction (2026-09-01): the merge arm was a vacuous guard, and it is downgraded.**
  The arm's sentence is true as written — the merged policy scored at least as well as
  either input — but its evidential status was not. Re-run on the recorded parent
  policies, the arm's regression gauntlet **passed with `nac_merge` replaced by
  `return left`, and by `return right`**; only `return {}` failed, and the real
  merge's output is argmax-identical to `return left` in all four bins. Three
  vacuities compounded: the gate read direction-correctness only and never the
  magnitude score it printed on every run; both parents were already perfect, so
  "merged ≥ best parent" sat at ceiling and carried no information; and both parents
  share one `agent_id` and one hard-coded four-bin cluster space by construction, so
  "independently trained" is true and "independent agents" is not — this arm never
  tested sharing between agents that own their own clusters (D62). The guard was
  repaired in 1.1.3: it now gates magnitude as well as correctness, can derive two
  half-blind parents from one policy so that only a real fold passes, and
  `--assert-noop-fails` checks that every stub fails. The downgrade of the original
  evidence stands; what is restored is the guard's ability to fire. Arms 1 and 2 are
  unaffected. For what this means for substrate sharing as a whole, see
  [what isn't shipped](#what-isnt-shipped).
- **The measurement platform was degraded, and has since been re-validated.** Two
  motors, broken for the entire 1.0+ era, were replaced in August 2026, so every
  magnitude claim measured before that was provisional — delivered shift is exactly
  what a degraded platform corrupts (direction findings are sign-based and survive a
  proportional gain error). Re-validation on the repaired robot has now passed both
  halves: the sensor sweep, and on 2026-08-24 the large-step delivered shift at
  n = 8 per side (0.94 of the commanded rotation on both sides), which clears the
  provisional flag on that magnitude. It is still **one session** with
  cross-session replication outstanding, and it surfaced two open defects — head
  roll drifting under repeated body-only turns (D30) and a missing front/back fold
  guard on the credit path (D31). The sweep gain itself is scored as a full-range
  fit under an R² gate, a choice recorded as limit L9.
- **Several magnitude arms are single hardware sessions**, scoring a metric quantized
  to five values over four bins — against the ten-seeds-with-standard-deviation
  standard the substrate-primary row above is held to. The 45e bootstrap result is
  one seed.
- **This does not generalize to an EC-clustered orient policy.** The orient backbone
  builds its state from a hand-written bin string, never calling the entorhinal
  cortex. That is hand-curated discretisation upstream of the substrate, so any
  future EC-clustered orienting policy needs its own experiment. Recorded as D10.
- An earlier sensor-characterization finding was **retracted** as an artifact of a
  head-frame bug. The direction, cross-session, and merge arms were unaffected;
  magnitude required the fix.

### Caregiver-taught orienting through hunger relief

**The claim.** An infant with a hunger drive and *no* orient drive learns to turn
toward its mother's voice when — and only when — her feeding relieves its hunger.
Same feed events, same contingency, no need → no learning. No LLM in the action
path. This is the result the 1.1 "Sensorimotor" release was reopened to test.

**The evidence.** [Exp 52 (Nurture)](https://github.com/dennys246/Maxim/blob/main/docs/experiments/52_nurture.md),
EARNED 2026-08-25 and re-validated 2026-09-02, pre-registered with gates frozen
before the data. Phase A (scripted substrate, 8 seeds × 600 ticks): taught **0.892** against satiated 0.496,
yoked 0.496 and no-feed 0.496 — the satiated and no-feed curves are identical to the
digit, so a feed without need had zero effect, and the yoked arm received every one
of the taught arm's credits decoupled from its own actions and stayed at chance.
Phase B (embodied cradle-mother, apparatus v3 with shuffled stimulus order, 12 seeds
per arm, exposure-matched): taught late-bin directedness **0.878** against satiated
**0.441** (fed on 35% of turns, credited on 0%) and no-feed 0.413. LEARNED,
MOTHER-TAUGHT and HUNGER-NECESSARY all pass under gate v3, and the apparatus check
that Exp 48 failed is clean — every arm shows real per-seed spread, and the
seed-invariant twelfths of the deterministic apparatus are gone.

**Re-validated 2026-09-02.** The row's re-run trigger fired when the D53 credit-path
fix changed how drive relief is consumed, and Phase B was re-run whole on the fixed
code under the same frozen gate, same twelve seeds per arm: taught **0.837**,
satiated **0.413**, no-feed **0.413** — LEARNED, MOTHER-TAUGHT and HUNGER-NECESSARY
all pass and GRADUATE is reproduced. Every delta from the original (−0.042, −0.028,
0.000) sits inside the per-seed spread, so the fix did not move the result. Phase A
was not re-run; it is scripted and its credit does not route through the changed
path.

**The caveats.** Phase B was originally **one session at n = 12 per arm**; the
2026-09-02 re-run is a second session whose arm means reproduce the first. The
hardware row above still has its cross-session replication outstanding. The credit is
sign-only: it discriminates nonzero-from-zero relief, not "hungry" in the everyday
sense — hunger at the moment of feeding is roughly 0.05–0.1, far below any
deprivation threshold. Nothing here speaks to how *far* to turn, to loudness, to
the LLM-driven action path, or to credit that spans more than one turn; secondary
reinforcement of the voice itself and devaluation are not modeled.

**Correction (2026-09-02).** This page used to say that one taught seed was a weak
learner (late bin 0.54) and that the margin instrumentation explained it exactly, via
the visibility floor. That sentence is retracted — it is the one sentence of the
original write-up the re-run retracts. Per-seed values are **not reproducible
run-to-run**: only 4 of 36 (arm, seed) cells were identical across the two runs, and
per-seed late scores correlate at only r = +0.66 (taught), +0.29 (no-feed) and
−0.24 (satiated). The same seed read 0.667 in the re-run. The seed fixes the
stimulus order, not the trajectory, so the "one weak seed" story was a post-hoc
account of a number that does not hold still. Arm means replicate; per-seed
narratives from this apparatus do not, and this site no longer carries one. What
those infants learned was then read out on a physical robot — the next entry.

### Cross-context readout on hardware

**The claim.** The three infants taught in the Exp 52 nursery simulation, with their
persisted memory files (NAc + EC) loaded **unchanged** onto a physical Reachy Mini —
nothing is credited on the robot — turn toward the speaker. The never-hungry
controls, loaded the same way, do not. The want was learned in the nursery; the
robot only reads it out.

**The evidence.** [Exp 53b](https://github.com/dennys246/Maxim/blob/main/docs/experiments/53_cross_context_readout.md), EARNED 2026-08-26 and re-validated on the
robot 2026-09-02, pre-registered with an instrument gate that could stop the run and a
transfer gate frozen before the data.
Gate I (instrument): all three taught seeds pass; 60 of 60 live, speech-gated
percepts pattern-complete into the nursery's audio clusters (120 of 120 across Exp 53
and 53b). Gate T (transfer): taught seeds delivered directedness **1.00 / 1.00 / 1.00**
— 36 of 36 trials turned toward the source, with the chosen direction correct in
36 of 36; **satiated 0.00** — no action in 36 of 36, because the files hold no learned
preference; **no-feed 0.50** — `turn_right` in 54 of 54, a side-blind causal credit
with zero learned bias. Turn step δ = 0.30 rad, the body's own step; 180 trials, no
invalid reads; the files were SHA-verified unchanged before and after. This is the
cross-context half of the 1.1 claim — learning that carries across sessions *and*
contexts without fine-tuning; the cross-session half rests on Exp 45 above.

[Exp 53](https://github.com/dennys246/Maxim/blob/main/docs/experiments/53_cross_context_readout.md) ran the same files first with δ = 0.55 rad: direction correct in
36 of 36, but delivered directedness 0.75 per seed, and every miss was the −0.2 target
— an overshoot. That is the pre-registered **APPARATUS** verdict (no verdict on the
claim), recorded beside 53b as the finding that motivated the one declared change.

**Re-validated 2026-09-02, on the robot — a PASS on a platform that was warning.**
The row's trigger fired (D53 changed the orient motor backend), and 53b was re-run on
the physical Reachy Mini with the original August agent files, SHA-verified unchanged,
so only the code differed from the earned run. The original reproduced exactly:
taught **1.00 / 1.00 / 1.00**, satiated **0.00**, no-feed **0.50**, Gate I pass, and
the exploratory placements reproduced too (+0.2 wrong-way 9 of 9, −0.6 toward 9 of
9). The caveat travels with the number: the controller emitted **85
actuator-degradation warnings across 180 trials** — roll and pitch every time, yaw
never once. Azimuth readout rides on yaw, which is why the result is reported as
sound rather than retracted; a roll/pitch recalibration is owed before the next
hardware block. Read it as a pass on a platform that was complaining, not as a clean
win. Reading out the *new* post-fix nursery is a separate question that needs its own
registration and has not been run.

**The caveats.** This is **readout, not learning** — nothing credits on the robot, so
it says nothing about learning on hardware. One session, one room, one sound source,
n = 3 seeds per arm, one fixed step, front hemisphere only. An exploratory +0.2
placement turned the *wrong* way in 18 of 18 trials across both runs — predicted
before any robot data, because the nursery's representation is three azimuth bins
(far-left / centre / right) whose centre bin runs from −0.4 to +0.3 and carries
`turn_left`, so its right half turns left; the −0.6 placement turned toward in 18 of
18. That is the representation's stated limit, not generalisation. Seed 48, an
exploratory fourth taught seed, read out 0 of 12 — its nursery map differs
(`turn_right` on the centre bin), so it mis-learned rather than under-learned; the
"weak learner" explanation this page used to attach to it is retracted (see the
correction above). Nothing here is about how far to turn, or about loudness. A secondary block at exploration weight 1.5 is
reported, not gated: taught 0.75 per seed with direction still correct in 36 of 36
and exploration deciding none of them — every miss was again the −0.2 target, this
time because the delivered geometry had drifted about +0.07 over the session, so the
target already sat inside the ±0.05 centre band before the turn. Head-pose drift
under repeated turns was re-measured during the session (D30).

**Watch it.** [A demonstration with the same files](https://youtu.be/lLoPM2EkbPU): the
taught infant turns toward the voice it was taught to want; the never-hungry control,
loaded identically, sits still. This is a demo, not evidence — shot with a larger turn
step so the camera sees it, by a script that stamps itself `evidence=false` — and the
numbers above are the pre-registered record, not the video.

**Run it yourself.** Your install starts blank — there is no pre-loaded want. The
nursery that produces one is Exp 52; the exact agent files read out here are under
[`docs/experiments/data/53_agents/`](https://github.com/dennys246/Maxim/tree/main/docs/experiments/data/53_agents) with a SHA-256 manifest, and the harness is
[`scripts/orient_backbone/exp53_cross_context_readout.py`](https://github.com/dennys246/Maxim/blob/main/scripts/orient_backbone/exp53_cross_context_readout.py).

### Two-joint centering

**The claim.** Given sound sources beyond the neck's reach, an agent with
motor-bound body-turn affordances can center them; a head-only agent cannot, and
plateaus at the neck limit. The LLM chooses a direction-correct first body turn, and
measured relief credit matches true direction-progress.

**The evidence.** [Exp 49](https://github.com/dennys246/Maxim/blob/main/docs/experiments/49_two_joint_centering.md),
COMPLETE, all three hypotheses met. Head-only centered zero of ten trials with 60%
parked at the neck envelope; the first body turn was direction-correct in ten of ten;
credit sign accuracy passed on both the LLM and substrate arms.

**The caveat.** Ten trials per arm. The most interesting finding is a split rather
than a win: the LLM crosses the microphone array's front/back fold, while the
substrate is genuinely trapped by it — but is roughly twenty times faster where its
trained policy applies.

## Superseded

### Operant orienting on the constant-credit apparatus — a case study in apparatus correction

**What happened.** In July 2026 the embodied cradle-mother experiment reported a
large taught-versus-control gap and a GRADUATE verdict. A contest four weeks later
found the magnitudes did not reproduce and, more seriously, that the mechanism
conflicted with how the apparatus actually behaved.

Rather than retune the gate, the experiment was **re-baselined on a fixed apparatus
against a gate re-frozen before the new data**. On that apparatus the caregiver
effect was re-earned decisively (+0.482 against a required 0.20 margin) but the
learning gate failed — missing the level by 0.001, which was recorded and
deliberately not retuned, and missing the rise substantively.

Then the explore-weight sweep produced the real finding: every cell came out an
exact, seed-invariant twelfth, and at the lowest exploration weight **the arms
inverted** while the control moved with no teaching at all. The metric was measuring
phase alignment between the turn cycle and the stimulus cycle, not orienting skill.

**Where it stands.** [Exp 48](https://github.com/dennys246/Maxim/blob/main/docs/experiments/48_cradle_mother_seam.md)
is **complete but not graduated** for the constant-credit apparatus it measured —
it landed on the PARTIAL branch it had pre-registered in advance, and that verdict
stands. The caregiver effect on that apparatus is real and causal, but the honest
description is credit-tipped attractor selection rather than graded skill; the
result is not retracted and it is not a code regression. The next step it called
for — randomised stimulus order under a v3 gate frozen before the data — was run
as [Exp 52](https://github.com/dennys246/Maxim/blob/main/docs/experiments/52_nurture.md) with the credit sourced from the infant's actual relief, and
graduated (see [above](#caregiver-taught-orienting-through-hunger-relief)). Exp 48 is
therefore **superseded**: read it as the apparatus case study — v1 contest → v2
re-baseline → sweep → shuffle — that made that measurement possible. The
phase-locking finding was promoted into the measurement-limits ledger as L2, whose
mitigation the shuffle has now measured. Full walkthrough: [the Cradle](/research/cradle/).

### Exploratory: substrate influence on the LLM

**Status: exploratory, not a result.** Exp 44 asked whether a learned substrate
steers the language model, and its first arms completed — but it carries modest-N and
residual caveats, and the follow-up
[Exp 44b pilot](https://github.com/dennys246/Maxim/blob/main/docs/experiments/44b_pilot.md)
(one seed per arm, explicitly not a result) found that its transplant control is
name-mismatched and that its two reported axes encode the same entity/affordance pair
rather than independent effects. The confirmatory campaign is not frozen. Treat
[Exp 44](https://github.com/dennys246/Maxim/blob/main/docs/experiments/44_substrate_counterfactual.md)
as in-flight work, not evidence.

## Where it didn't hold up

The most useful results here are the negative ones, and they bound the whole project.

**Carried substrate does not override a strong contrary LLM prior.** Given a world
where the prior is *wrong* — a hearth whose warming action hurts — an agent carrying
direct cross-session pain from that exact hearth still warmed at it. This was tested
across four frontier models with a matched safe-fire control to isolate substrate
specificity, and the prior dominated in all of them.
([Exp 38](https://github.com/dennys246/Maxim/blob/main/docs/experiments/38_counter_prior_substrate.md).)
The reasoning-trained model was sharpest and worst: its substrate was demonstrably
load-bearing, but it amplified the carried association rather than the corrective
pain.

**Where substrate transfer *is* detectable, it sits in a narrow band.** Across four
model fires, a measurable behavioral delta appeared only where the base model's
priors left headroom between first-encounter and optimal behavior — a "Goldilocks
zone" governed by training method at least as much as parameter count. One model
failed because its priors were too weak to leverage the substrate; another failed
because it already solved the task perfectly, leaving nothing to improve.
([Exp 37 cross-model results](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_model_results.md).)
A further limit bounds those numbers: re-running the identical commit on the
identical seeds in August 2026 did not reproduce its own June result (0.71 against
0.42) — the serving environment moved the whole distribution more than the code
did, and the run records capture nothing that would let anyone reconstruct why. The
Exp 37 magnitudes are readings taken at one time, not reproducible constants
(limit [L8](https://github.com/dennys246/Maxim/blob/main/docs/limits/README.md)).

**The consequence for how Maxim is described.** The strong framing — that the
substrate drives action selection through specific bio-mechanisms — is explicitly
pulled from the release positioning. Maxim ships as a bio-inspired LLM harness: the
substrate supplies experience-grounded context to an LLM that still decides.
Substrate-*primary* discrimination, where the LLM is removed entirely, is the
separate and narrowly graduated result above.

## What isn't shipped

- **Peer substrate sharing (Oasis) is not an earned claim — and until 1.1.3 it did
  not work at all.** *Correction, dated 2026-09-03.* Before 1.1.3, merging a foreign
  substrate produced a want that read out as exactly **0.0** on the receiver.
  `ec_merge` computed the alignment between the donor's clusters and the receiver's
  and discarded it, while `nac_merge` folded reward biases on exact string keys, so
  every donor bias landed under a cluster id the receiver had no node for. The merge
  reported success and the bias dictionary grew — its size is the union of both key
  sets, which is maximal exactly when nothing aligned (D43). Nothing on this site
  should have been read as evidence that sharing between independent agents worked:
  the two results that looked like it, the Exp 45 merge arm and the Exp 46 crèche
  federation, both ran in the one configuration where the defect cannot fire — a
  shared agent id and a shared cluster space (see [the correction
  above](#sensorimotor-learning-on-real-hardware) and [the Cradle
  page](/research/cradle/#46--operant-orient-a-mother-teaches-a-crèche-pools)).
  **1.1.3 fixes the mechanism.** `maxim.hivemind.substrate_merge` aligns the donor's
  clusters onto the receiver's, re-keys the donor's biases through that map, then
  folds; on the shipped path a receiver that never saw a contingency goes **0.0 →
  1.0**, with four of four merged keys naming a reachable cluster. That is a
  mechanical fix verified by a behavioural unit gate (D44), not an earned behavioural
  row: it is **library-only** — no CLI verb performs a cross-substrate merge, and
  `maxim substrate import` extracts a bundle without merging it — and the
  pre-registered two-robot replication at n = 12 is 1.2 work. The first planned case
  study is the artifact above, the nursery-taught orient files that read out on the
  robot, as a shareable substrate; that is a
  [plan](https://github.com/dennys246/Maxim/blob/main/docs/plans/oasis_case_study_taught_orient.md),
  not something you can run.
- **The cradle harness wired end-to-end into substrate-primary mode** is planned.
  `--aut-mode substrate-primary` is opt-in; `--aut-mode llm-primary` remains the
  default.
- **Architecture layering** is an enforced contract with *reviewed* debt: CI fails on
  any finding outside a baseline shipped in the wheel, and burning that baseline down
  is 1.1.x work — see [architecture](/concepts/architecture/).
- **Loudness / onset salience** is not in 1.1. Nothing in the shipped audio path
  reads sound level, and no result on this site depends on it. A salience design was
  planned for the 1.1 line after a bench established the level is readable from the
  robot daemon; 1.1.1, 1.1.2 and 1.1.3 all shipped without it, so treat it as planned,
  not imminent.
- **Fear gating** is opt-in and off in the stable Python API — see
  [tool safety](/reference/tools/#tool-safety).

## Where this is going

The direction — not a shipped claim — is that the substrate builds itself from lived
experience in the default LLM-primary path, so an agent's substrate stays current
through use rather than only being pre-loaded before a run. The first phase of that
work has landed in the engine; the behavioral validation that it produces a better
agent is future work, and nothing on this site should be read as claiming it yet.
