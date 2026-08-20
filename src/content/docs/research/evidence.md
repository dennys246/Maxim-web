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

- **The measurement platform was degraded.** Two motors, broken for the entire 1.0+
  era, were replaced in August 2026. Every magnitude claim measured before that is
  **provisional** — delivered shift is exactly what a degraded platform corrupts.
  Direction findings are sign-based and expected to survive a proportional gain
  error. Re-validation on healthy hardware has passed its sensor half and now its
  delivered-shift half, but the large-step magnitude arms remain n=1 per side with a
  multi-rep block still queued.
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

## Under investigation

### Operant orienting — a case study in apparatus correction

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
is **complete but not graduated** — it landed on the PARTIAL branch it had
pre-registered in advance, which is the outcome the design anticipated for exactly
this case. The caregiver effect is real and causal, but the honest description
is credit-tipped attractor selection rather than graded skill. The result is not
retracted and it is not a code regression. The next step is the contest's other
pre-registered control — randomised stimulus order — with a v3 gate frozen before
the data. The finding was general enough to be promoted into the measurement-limits
ledger as L2. Full walkthrough: [the Cradle](/research/cradle/).

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

**The consequence for how Maxim is described.** The strong framing — that the
substrate drives action selection through specific bio-mechanisms — is explicitly
pulled from the release positioning. Maxim ships as a bio-inspired LLM harness: the
substrate supplies experience-grounded context to an LLM that still decides.
Substrate-*primary* discrimination, where the LLM is removed entirely, is the
separate and narrowly graduated result above.

## What isn't shipped

- **Peer substrate sharing (Oasis)** is the next build, not an available feature.
- **The cradle harness wired end-to-end into substrate-primary mode** is planned.
  `--aut-mode substrate-primary` is opt-in; `--aut-mode llm-primary` remains the
  default.
- **Architecture layering** is an intended contract with 33 open audit findings and
  no CI gate yet — see [architecture](/concepts/architecture/).
- **Fear gating** is opt-in and off in the stable Python API — see
  [tool safety](/reference/tools/#tool-safety).

## Where this is going

The direction — not a shipped claim — is that the substrate builds itself from lived
experience in the default LLM-primary path, so an agent's substrate stays current
through use rather than only being pre-loaded before a run. The first phase of that
work has landed in the engine; the behavioral validation that it produces a better
agent is future work, and nothing on this site should be read as claiming it yet.
