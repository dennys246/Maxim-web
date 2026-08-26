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
- [Measurement limits](https://github.com/dennys246/Maxim/blob/main/docs/limits/README.md) — what the instruments themselves cannot resolve
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
in the action path, carried it across sessions, and merged two independently trained
substrates into a combined policy at least as good as either input.

**The evidence.** The [Exp 45 series](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45_reachy_orient_live.md).
Three pre-registered arms all passed: a learning curve from chance to perfect in
about ten trials, cross-session transfer probing correct at trial zero, and the merge
arm. Later arms extended this to magnitude —
[45b](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45b_orient_magnitude.md),
[45c](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45c_flip_bins.md),
[45d](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45d_magnitude_replication.md)
(replication across three seeds), and
[45e](https://github.com/dennys246/Maxim/blob/main/docs/experiments/45e_orient_s4_population_readout.md)
(resolving a coverage ceiling via a population-vector readout).

**The caveats.** Several, and they matter more than the headline.

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
EARNED 2026-08-25, pre-registered with gates frozen before the data. Phase A
(scripted substrate, 8 seeds × 600 ticks): taught **0.892** against satiated 0.496,
yoked 0.496 and no-feed 0.496 — the satiated and no-feed curves are identical to the
digit, so a feed without need had zero effect, and the yoked arm received every one
of the taught arm's credits decoupled from its own actions and stayed at chance.
Phase B (embodied cradle-mother, apparatus v3 with shuffled stimulus order, 12 seeds
per arm, exposure-matched): taught late-bin directedness **0.878** against satiated
**0.441** (fed on 35% of turns, credited on 0%) and no-feed 0.413. LEARNED,
MOTHER-TAUGHT and HUNGER-NECESSARY all pass under gate v3, and the apparatus check
that Exp 48 failed is clean — every arm shows real per-seed spread, and the
seed-invariant twelfths of the deterministic apparatus are gone.

**The caveats.** Phase B is **one session at n = 12 per arm**; cross-session
replication is outstanding, as it is for the hardware row above. The credit is
sign-only: it discriminates nonzero-from-zero relief, not "hungry" in the everyday
sense — hunger at the moment of feeding is roughly 0.05–0.1, far below any
deprivation threshold. Nothing here speaks to how *far* to turn, to loudness, to
the LLM-driven action path, or to credit that spans more than one turn; secondary
reinforcement of the voice itself and devaluation are not modeled. One taught seed
was a weak learner (late bin 0.54), and the margin instrumentation explains it
exactly: its learned margin sat at the visibility floor (limit L1), so exploration
decided 18% of its choices. What those infants learned was then read out on a
physical robot — the next entry.

### Cross-context readout on hardware

**The claim.** The three infants taught in the Exp 52 nursery simulation, with their
persisted memory files (NAc + EC) loaded **unchanged** onto a physical Reachy Mini —
nothing is credited on the robot — turn toward the speaker. The never-hungry
controls, loaded the same way, do not. The want was learned in the nursery; the
robot only reads it out.

**The evidence.** [Exp 53b](https://github.com/dennys246/Maxim/blob/main/docs/experiments/53_cross_context_readout.md), EARNED 2026-08-26, pre-registered with an
instrument gate that could stop the run and a transfer gate frozen before the data.
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

**The caveats.** This is **readout, not learning** — nothing credits on the robot, so
it says nothing about learning on hardware. One session, one room, one sound source,
n = 3 seeds per arm, one fixed step, front hemisphere only. An exploratory +0.2
placement turned the *wrong* way in 18 of 18 trials across both runs — predicted
before any robot data, because the nursery's representation is three azimuth bins
(far-left / centre / right) whose centre bin runs from −0.4 to +0.3 and carries
`turn_left`, so its right half turns left; the −0.6 placement turned toward in 18 of
18. That is the representation's stated limit, not generalisation. Seed 48,
the weak nursery learner, read out mis-learned (0 of 12). Nothing here is about how
far to turn, or about loudness. A secondary block at exploration weight 1.5 is
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

- **Peer substrate sharing (Oasis)** is the next build, not an available feature. Its
  first planned case study is the artifact above — the nursery-taught orient files
  that read out on the robot — as a shareable substrate; that is a
  [plan](https://github.com/dennys246/Maxim/blob/main/docs/plans/oasis_case_study_taught_orient.md),
  not something you can run.
- **The cradle harness wired end-to-end into substrate-primary mode** is planned.
  `--aut-mode substrate-primary` is opt-in; `--aut-mode llm-primary` remains the
  default.
- **Architecture layering** is an enforced contract with *reviewed* debt: CI fails on
  any finding outside a baseline shipped in the wheel, and burning that baseline down
  is 1.1.x work — see [architecture](/concepts/architecture/).
- **Loudness / onset salience** is not in 1.1. Nothing in the shipped audio path
  reads sound level, and no result on this site depends on it; the engine's 1.1.1
  plan covers a salience design after a bench established the level is readable from
  the robot daemon.
- **Fear gating** is opt-in and off in the stable Python API — see
  [tool safety](/reference/tools/#tool-safety).

## Where this is going

The direction — not a shipped claim — is that the substrate builds itself from lived
experience in the default LLM-primary path, so an agent's substrate stays current
through use rather than only being pre-loaded before a run. The first phase of that
work has landed in the engine; the behavioral validation that it produces a better
agent is future work, and nothing on this site should be read as claiming it yet.
