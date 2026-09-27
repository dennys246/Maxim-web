---
title: Orienting on the Reachy Mini
description: The hardware line — a substrate that learns to turn toward a sound on a physical robot, and a want taught in simulation that reads out on it — stated with its sample sizes, its retractions, and what it has not shown.
---

:::note[At a glance]
- **Line status:** active. Exp 54's hardware phases (B and C) have not run, and Exp 50 is
  designed but not run.
- **Dates:** 2026-07-15 → 2026-08-27, with re-validations on 2026-08-08 (the repaired robot)
  and 2026-09-02 (Exp 53b re-run on the robot).
- **Releases:** post-1.0 through 1.1; the cross-context result rests on a replication at tag
  `v1.1.0`.
- **Experiments covered:** [Exp 45](/research/experiments/exp-45/) ·
  [45b](/research/experiments/exp-45b/) · [45c](/research/experiments/exp-45c/) ·
  [45d](/research/experiments/exp-45d/) · [45e](/research/experiments/exp-45e/) ·
  [49](/research/experiments/exp-49/) · [50](/research/experiments/exp-50/) ·
  [53 / 53b](/research/experiments/exp-53/) · [54](/research/experiments/exp-54/) ·
  [H2 loudness bench](/research/experiments/h2-loudness-bench/)
- **Current as of 2026-09-26.**
:::

## The question

Can Maxim's substrate learn a sensorimotor skill on a physical robot, with no language model
choosing the actions: turning a Reachy Mini toward a voice, and then deciding how far to turn?
And can a want learned somewhere else entirely, in a simulated nursery, drive that robot once
its memory files are loaded onto it, without any learning on the robot?

## The claim, stated precisely

Two claims are earned, and each one is narrow. **First (Exp 45, earned):** on a physical Reachy
Mini, with no LLM in the action path, the substrate learned which way to turn toward a speech
source from an empty [NAc](/systems/nucleus-accumbens/). Its frozen-policy probe reached 1.00 by
trial 10, and a reloaded policy was correct at trial 0 in a later session. The state was a
hand-written four-bin azimuth string, and the platform had two broken motors throughout; the
row was re-validated on the repaired robot in August. **Second (Exp 53b, earned):** the persisted
NAc and EC of three infants taught in the [Exp 52 nursery](/research/cradle/), loaded unchanged
onto the robot with nothing crediting there, turned toward the speaker in 36 of 36 trials. The
never-hungry controls took no action, and the never-fed controls turned right regardless of side.
That is readout, not learning: one room, one source, n = 3 seeds per arm, one fixed step, front
hemisphere. The earned status rests on a clean-tree replication at `v1.1.0`. Magnitude (how far
to turn) was learned on the hand-binned apparatus (45b–45e), but mostly in single sessions, and
it was not learned when the nursery ran on the robot's own body (Exp 54).

## What it does not show

- **Learning on the robot in the cross-context result.** Exp 53/53b credit nothing on the
  hardware. The want was learned in simulation, and the robot only reads it out.
- **Loudness or onset salience.** No result here depends on sound level. The
  [H2 bench](/research/experiments/h2-loudness-bench/) showed that the level is readable from the
  robot's daemon. A salience design was deferred and has not shipped.
- **Magnitude as a general result.** The magnitude arms are single sessions (45b, 45c) or a single
  seed (45e). All of them run on a hand-binned state space, and the taught infants in Exp 54
  learned a flat preference for the small step at every distance.
- **Generalisation past the taught geometry.** The nursery's representation has three azimuth
  bins. In Exp 53b, a source at +0.2 turned the robot the wrong way in every trial, which was
  predicted before any robot data.
- **The back hemisphere.** Every hardware result is front-hemisphere. The microphone array is
  linear and cannot tell front from back. In Exp 49's simulated rig, the substrate is trapped by
  that fold on rear sources.
- **More than one room, source or robot.** Each result comes from one robot, one room and one
  source. Cross-unit transfer to a second Reachy has not run.
- **Sharing between independent agents on hardware.** Exp 45's merge arm was downgraded to a
  vacuous guard (2026-09-01). Exp 54, the prerequisite for sharing a taught want on hardware, has
  not reached its hardware phases.
- **An EC-clustered orient policy.** The Exp 45 series builds its state from a hand-written bin
  string upstream of the [entorhinal cortex](/systems/entorhinal-cortex/) (D10), so its earned
  status does not transfer to an EC-clustered policy.
- **Re-adaptation after the motor repair.** Exp 50 asks that question, and it has not run.

## The experiments

| Exp | Date | Status | n per arm | Result |
|---|---|---|---|---|
| [54](/research/experiments/exp-54/) | 2026-08-27 | earned (Phase A only) | 12 seeds | Nursery on the robot's own body: taught 0.858 vs satiated 0.472, no-feed 0.514. Magnitude not resolved. Phases B/C (hardware) have not run. |
| [53 / 53b](/research/experiments/exp-53/) | 2026-08-26 (R1 2026-08-28) | earned (53b); Exp 53 was APPARATUS | 3 seeds | Nursery-taught files read out on the robot: taught 1.00, satiated 0.00, no-feed 0.50. Re-validated on the robot 2026-09-02. |
| [H2](/research/experiments/h2-loudness-bench/) | 2026-08-25 | reference | 1 session (75 s trace) | Sound level is one daemon read away. A bench note, not a result. |
| [50](/research/experiments/exp-50/) | 2026-08-07 | pre-registered | n ≥ 3 sessions planned | Re-adaptation after the motor repair: designed, not run. |
| [49](/research/experiments/exp-49/) | 2026-08-04 | earned | 10 trials | Simulated rig: head-only 0/10; the LLM's first body turn was correct 10/10; the substrate was ~20× faster where its policy applied. |
| [45e](/research/experiments/exp-45e/) | 2026-07-27 | earned | 1 seed | Population-vector readout resolved one seed's starved magnitude cell, and plain argmax held it afterwards. |
| [45d](/research/experiments/exp-45d/) | 2026-07-23 | earned | 3 seeds + 1 transfer session | Direction 1.00 on every seed; magnitude 0.75 / 1.00 / 0.75. The full policy transferred across sessions at 1.00 / 1.00. |
| [45c](/research/experiments/exp-45c/) | 2026-07-16 | earned | 1 session | A bin boundary derived from the measured gain took magnitude from 0.75 to 1.00. |
| [45b](/research/experiments/exp-45b/) | 2026-07-16 | earned | 1 session | With big and normal steps available, magnitude reached 0.75, as predicted, and direction reached 1.00. |
| [45](/research/experiments/exp-45/) | 2026-07-15 | earned | 1 session per arm | Direction learned from zero and carried across sessions. The merge arm was downgraded on 2026-09-01. |

Each experiment's page links its full record in the pymaxim notebook.

## The arc

### Exp 45 — learning to turn toward a voice, from zero

The first learned policy on physical hardware in the project. The Reachy Mini's on-board
XVF3800 array reports a direction of arrival. The orient backbone bins that reading into four
states: near or far, left or right. The NAc chooses `turn_left` or `turn_right` through
`recommend_action`, and each turn is credited only by relief: how much the re-measured
`|azimuth|` shrank. No LLM is in the action path. An apparatus generates the trials, and ground
truth never reaches the NAc. The design separates learning from a hard-coded servo, which would
be correct from trial 1. There are three pre-registered arms:

1. **Learning curve (session s1b, 40 trials, empty NAc): pass.** The frozen-policy probe went
   0.00 → 0.75 (trial 5) → 1.00 (trial 10) and held through trial 40. The 0.00 means the empty
   NAc abstains. It is not chance; the chance rate for executed actions is 0.50. An independent
   replication on a fresh NAc (m1) started its greedy turns at exactly 0.50 and ended at 1.00,
   with the probe at 1.00 by trial 15.
2. **Cross-session transfer (s2): pass.** The NAc was loaded in a new process and probed 1.00 at
   trial 0, before any experience. All 31 greedy actions in the session turned toward the source.
3. **Merge (two trained NAcs folded with `nac_merge`): passed then, downgraded 2026-09-01.**
   When the gauntlet was re-run on the recorded parents, it also passed with the merge replaced
   by `return left`, or by `return right`. Both parents were already perfect. They also shared
   one agent id and one hard-coded bin space, so the parents were trained independently but
   were not independent agents. The guard was repaired in 1.1.3, and the downgrade of the
   original evidence stands. Arms 1 and 2 are unaffected. The
   [evidence page](/research/evidence/#sensorimotor-learning-on-real-hardware) gives the full
   correction.

**Correction, same day (2026-07-16).** The record first characterized the DoA sensor as a lagging
"tracking estimator". That finding was retracted. It was an artifact of a bug in the project's own
motion code: commanding body yaw without an explicit head pose made the robot counter-rotate its
head, and the microphones are in the head. The array rotated 0.32 rad for a 0.9 rad body command.
After the fix, the measured gain was 0.562 and the array settled in 0.23 s. **All three arms ran
with the bug active.** They survive because they depend only on sign: an array that rotated only
about a third as far as commanded still rotated the correct way, so relief kept its sign. The exception
is the ±1.4 rad yaw clamp, where the bug made saturation easier to hit. The first session (s1)
was poisoned there. The mitigations that kept the later sessions clear of the clamp (walking
motion in ≤ 0.3 rad increments, a placement cap) were adopted for the wrong reason and turned
out to be load-bearing. **The bug hurt magnitude, not direction.** Magnitude is judged against an
overshoot threshold, which is exactly what a proportional gain error corrupts. Any DoA gain quoted
from before the fix is unverified.

**The platform itself was degraded.** Motors 2 and 3 were broken for the whole 1.0+ era and
were replaced around 2026-08-05. The ledger marked the row stale and every magnitude claim
provisional until the healthy-hardware protocol
[H1](https://github.com/dennys246/Maxim/blob/main/docs/experiments/protocols/h1_healthy_hardware_doa_preregistration.md)
re-measured the robot. H1 session 1 (2026-08-08) passed the sensor sweep, with gain 0.578 and no
staircase. It also found a motor-zero miscalibration and a controller ratchet. After a per-motor
recalibration, session 2 the same day re-validated the row and measured the delivered shift of
normal turns. On 2026-08-24 a block measured the large step at 0.94 of the command on both sides
(n = 8 per side), which cleared the provisional flag on it. That was one session, and cross-session
replication is still outstanding.

### Exp 45b — how far, not just which way

The Exp 45 policy turned the right way but took the same step from every distance, because it
had only one step size. 45b gave it four actions: left and right at 0.3 rad and at 0.9 rad.
Relief has no cost for large moves, so the big step wins everywhere except where it overshoots a
source that is already near centre. That asymmetry is the whole of what makes magnitude
learnable. The pre-registration predicted a magnitude score of 0.75, not 1.00, and the first
attempt (mag1) was incoherent because the head-frame bug was still active. After the fix, mag2
passed: **direction 1.00 and magnitude 0.75**, stable across 8 probes. The clearest bin is
`near_left`, where the normal step (+0.185) beat the big one (+0.072). The substrate learned not
to overshoot from relief alone. The miss, `near_right`, had drawn placements at the top of its
bin, where the big step really is better. That bin straddles the point where the right answer
flips. The notebook marks 45b as a pass on the hardware it was recorded on, and it should be read
together with the later hardware and DoA re-characterization (above).

### Exp 45c — a derived boundary

If the near bin straddles the flip point, then the ceiling comes from how the state is
represented, not from motivation. The boundary where the big step starts to beat the normal one
can be derived from the measured gain: `gain × (0.9 + 0.3) / 2 ≈ 0.33`. With the boundary moved
there, one hardware session (100 trials) reached **magnitude 1.00**, held for 13 consecutive
probes, with every bin decisive. In `near_right`, the normal step scored +0.352 and the big step
−0.570: the substrate learned that the big step is harmful there. Greedy turns toward the source
started at 0.286, below chance, and rose to 1.000. The change was two constants, with no new
mechanism. The 13 probes are re-reads of one converged policy, not independent trials.

### Exp 45d — replication, and the magnitude policy across sessions

This run replicated 45c's single session with three seeds, the boundary frozen at 0.330, and 40
trials each. **Direction was 1.00 on every seed. Magnitude was 0.75, 1.00 and 0.75** (mode 0.75,
mean 0.83), which matches the simulation's prediction. The miss was the same each time: one far
bin's big-turn cell never received a positive exploration sample. That is a coverage limit of
per-cell argmax, not a capability limit, because seed 2 reached 1.00 when both far cells were
covered. The run added the arm Exp 45 never had, cross-session transfer of the *magnitude*
policy. Seed 2's NAc, loaded into a fresh session, probed **1.00 / 1.00 at trial 0** and held
through all 9 probes.

### Exp 45e — a population readout unsticks a starved cell

45e ran on seed 3, the seed 45d recorded as starved. A population-vector readout lets the two
far bins share their "far → big" evidence. It did not fix the number at readout time. What it
changed was the *executed* action. It borrowed the big magnitude from the mirror bin, executed
`turn_left_big` in `far_left`, and that cell then earned its own credit. A later session with
plain argmax on the same NAc read magnitude 1.00 (`turn_left_big` 0.93 against `turn_left` 0.42).
The fix outlived the readout that caused it. Centering did not improve. **n = 1 seed, and
multi-seed replication is outstanding.** Seed 3's left/right asymmetry also has a known left-motor
component that was pending replacement at the time. The session data was held on the operator's
machine when the record was written.

### Exp 49 — two joints, and the fold between the two intelligences

Some sound sources sit beyond the neck's reach (±40–160°). Exp 49 asked whether the runtime
uses body turns appropriately for them. It ran the full live stack against a **simulated
controller and a synthetic DoA reader**, so the physical robot was not moving. The synthetic
reader was honest about the linear array's front/back fold. There were 10 trials per arm, with
an LLM (Qwen 32B) proposing actions in arms A and B. **All three hypotheses held.** The head-only
agent centered 0 of 10 sources. The LLM with body turns centered 4 of 10, and its first body turn
was in the correct direction in 10 of 10 trials. Measured relief credit matched true progress:
23 of 23 turns on the LLM arm and 125 of 129 on the substrate arm (0.969, corrected on
2026-08-06 after a credit-to-motion matching bug in the harness was found).

The secondary finding is a split. The LLM crosses the fold and centered two ±120° rear sources,
because its policy does not follow credit. The substrate is trapped: behind the fold, an honest
reading punishes a correct turn, and its 77 fold-divergent credits pushed it toward the false
equilibrium at 180°. Where its trained policy applied, it centered in 4.65 s against the LLM's
86.8 s, roughly 20× faster. The substrate arm carried only one trained bias, and the per-trial
data for the dense arms was lost, so the tables in the record are the only copy.

### Exp 50 — re-adaptation after the repair (designed, not run)

The robot's orient policies were trained on a plant that no longer exists, because two motors
were replaced. Exp 50 pre-registers the motor-adaptation question. Would a policy trained on the
degraded robot show *savings* on the repaired one, meaning faster relearning than from scratch?
And did the bounds learner's pain-tightened limits persist as learned non-use? Its single
permitted amendment was filled from H1's constants on 2026-08-08. The gain barely moved (0.578
against 0.55), so the magnitude prediction converts to its pre-declared null form. **No trial has
been run.**

### H2 — the loudness bench

This is a bench note, not a behavioral result. One 75-second trace on the live robot showed that
the XVF3800's pre-AGC speech energy and its AGC gain are both served by the daemon's existing REST
parameter endpoint. The AGC gain readback is a graded, inverse loudness envelope. The speech-energy
register is gated by voice activity, so it reads zero for loud non-speech. It was one session, one
room and one speaker, with no calibrated reference. Loudness and onset salience were not part of
1.1. The design was deferred and has not shipped.

### Exp 53 / 53b — a want taught in simulation reads out on the robot

In the [Exp 52 nursery](/research/cradle/), a driveless infant learned to turn toward its mother's
voice because being fed relieved its hunger. Exp 53 took three of those infants' persisted NAc and
EC files and loaded them **unchanged** onto the physical Reachy Mini. There was no credit and no
decay, and the files were SHA-verified before and after. The same was done for three satiated and
three no-feed controls. The robot's live DoA drove the production substrate-primary path.

**The instrument gate passed.** Every live percept pattern-completed into a cluster the nursery
had built (120 of 120 across both runs). A pre-data dry run found the nursery's learned map:
three audio clusters, FAR-LEFT (≤ −0.5), CENTRE (−0.4…+0.3) and RIGHT (≥ +0.4), with `turn_left`
on the centre bin. The gated targets were moved to fit that map before any robot data.

**Exp 53 (δ = 0.55 rad): APPARATUS.** The taught agents chose the correct direction in 36 of 36
trials, but delivered directedness was 0.75 per seed. Every miss was at the −0.2 target, where the
declared step overshot centre. That is the pre-registered apparatus verdict, and no claim was
taken from it. **Exp 53b changed one declared thing, the step, to the body's own 0.30 rad. It
passed:** taught **1.00 / 1.00 / 1.00** (36 of 36 toward the source), satiated **0.00** (no action
in 36 of 36), and no-feed **0.50** (`turn_right` in 54 of 54, with zero learned bias). An
exploratory +0.2 placement turned the *wrong* way in every trial. This was predicted before the
data: +0.2 falls in the centre bin, which carries `turn_left`. It is the three-bin
representation's stated limit.

**The earned status rests on R1.** The 1.1.0 re-score found that the original 53 and 53b ran from
a dirty tree at a commit that `main` cannot reach, so the code they executed could not be
established. Replication R1 (2026-08-28) re-ran the frozen protocol at tag `v1.1.0` from a clean
worktree: taught **1.00 / 1.00 / 1.00**, satiated 0.00, no-feed 0.50, and a sign-rule agreement of
1.0. The originals stay in the record as the first observation, with their provenance caveat.

**Re-validated on the robot, 2026-09-02.** The row's trigger fired when D53 changed the orient
motor backend. The run used the original August files, SHA-verified, so that only the code
differed. It ran at a clean `main` and reproduced the result exactly: 1.00 / 0.00 / 0.50, with
+0.2 wrong-way 9 of 9 and −0.6 toward 9 of 9. **The caveat travels with it:** the controller
emitted 85 actuator-degradation warnings across 180 trials, all on roll and pitch and never once
on yaw. Azimuth readout rides on yaw, which is why the result is reported as sound, but it is a
pass on a platform that was warning. A roll/pitch recalibration is owed before the next hardware
block.

### Exp 54 — the nursery on the robot's own body (Phase A only)

Exp 53b needed an explicit step map and the infant body, because the learned keys were the
infant's tool names. Exp 54 re-runs the nursery with the infant *as* a Reachy Mini: the robot's own
body component, its four orient affordances and its tool names. The files a nursery writes are
then the files a user's robot reads. **Phase A passed every pre-registered gate** (12 seeds per
arm): taught late directedness **0.858** against satiated **0.472** and no-feed **0.514**, a
mother-taught margin of +0.34 and a hunger-necessary margin of +0.39. The apparatus checks were
clean: real per-seed spread and no phase-lock signature (L2). **Magnitude was not resolved.** The
taught infants chose the big step about 0.27 of the time in every distance bin, against 0.50 for
the controls, which is a flat preference for the normal step. The learned map mirrors Exp 53's for
most seeds, and the Phase B targets were declared from it before any robot data.

**Phases B (readout on the physical robot) and C (the user path, under the plain
`bodies/reachy_mini` body) have not run.** This experiment is the prerequisite for sharing a taught
want on hardware. Until Phase B runs, this is a nursery result on the robot's body definition, not
a hardware result.

## Bounds

- **L3, azimuth resolution (about three nodes).** The raw azimuth encoding resolves roughly
  left, centre and right. Exp 53/53b is the hardware measurement of that limit: three clusters,
  and a centre bin whose right half turns the wrong way. A taught policy can be no finer than this
  partition.
- **L2, deterministic-apparatus phase-locking.** This limit shaped the nursery apparatus that Exp
  54 (and Exp 52) ran on. Exp 54's apparatus check was clean.
- **L1, the novelty-visibility floor (~0.11).** Exp 53's instrument gate required a probe margin
  above it.
- **L9 and L10, the DoA sweep.** The sweep gain is scored as a full-range fit under an R² gate.
  Sign-flipped (mirror-image) readings reject about half of all sweep passes, and one reached the
  production credit path during the August large-step block.
- **Known defects.** Head roll drifts under repeated body-only turns (D30). The credit path has
  no front/back fold guard (D31). The orient state is hand-binned upstream of EC (D10). The Exp 45
  merge guard was vacuous (D62, repaired in 1.1.3). One half of the Exp 45 baseline sweep file is
  a dry run, not a live sweep (D29). The large-step delivered-shift block ran from a dirty tree,
  and a clean re-run is owed before it is cited again.
- **Data gaps.** Exp 49's dense-arm trial data was lost, and Exp 45e's session data was held
  off-repo when the record was written.
- **Re-run triggers named in the ledger.** For the Exp 45 row: a change to NAc
  `cluster_reward_bias` / `recommend_action`, to `nac_merge` semantics, to the orient affordance
  YAML, to the DoA front end or transport, or to how motion is commanded (verify
  `d(head)/d(body)` ≈ +1.0 first), or any shell or acoustic modification. A `nac_merge` change
  on 2026-09-26 fired this trigger without exercising it; the hardware-free merge re-run passed
  byte-identically. For the Exp 53b row: a change to `_encode_current_clusters`, `_sensor_embed`
  or EC pattern completion ("the representation is what transfers"), to the NAc/EC persistence
  format, to `DoAFeed` or `ReachyOrientMotorBackend`, or to the `infant_operant` body; an Exp 52
  re-run with new files; or a minor-version heartbeat. Flipping interoception or audio into the
  gained encoding would re-stale it.

The limits are summarized on [measurement limits](/research/limits/), and the claim ledger is on
the [evidence page](/research/evidence/#cross-context-readout-on-hardware).

## What came next

The next step was sharing: exporting a taught want as a bundle so that it changes an independent
agent's first choice. That was earned in simulation and on the Minecraft world seam, not on the
robot. See [Sharing and survival on the world seam](/research/experiments/world-seam/). On the
hardware, several things remain open and owed: Exp 54's Phases B and C, a roll/pitch
recalibration, the two-Reachy cross-unit replication, Exp 50's savings test, and any attempt at
the back hemisphere. Setup for the robot itself is in the [Reachy Mini guide](/guides/reachy-mini/).
