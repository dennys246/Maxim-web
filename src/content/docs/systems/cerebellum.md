---
title: Cerebellum
description: Motor learning and forward models — error-driven prediction of what an action will do to the body, so routine movement stops needing the LLM.
---

The Cerebellum is the part of Maxim's bio-inspired cognitive architecture that
learns what actions *do*. Every other system on the [systems
map](/systems/overview/) is concerned with what happened, what it meant, or what
it was worth. The Cerebellum is concerned with a narrower question: given this
entity, this modulator, this affordance, and roughly these parameters, what
value will the sensor read afterwards?

That sounds trivial until you notice what it replaces. Without it, every
`rotate_angle(degrees=45)` on a shoulder joint is a question for the language
model — *what will this do?* — answered from scratch, at LLM latency, forever.
The Cerebellum's job is to make the hundredth repetition of a known movement
cost nothing but a dictionary lookup, and to keep the LLM in the loop only where
the outcome is still genuinely uncertain.

Be clear about the scope of the name. There are no climbing fibres here, no
Purkinje cells, no timing circuitry. What is borrowed from the biological
cerebellum is the *role* — error-driven calibration of movement, sitting below
deliberation — plus one learning rule that cerebellar adaptation shares with a
lot of other error-correcting systems. The implementation is a keyed table of
running estimates.

Unlike most of the substrate, the Cerebellum does not connect to the MemoryHub
at all. It lives in the embodiment layer, underneath the agent pipeline, reached
through the SEM (Sensor-Entity-Modulator) protocol.

## What it does

Three things, in increasing order of time horizon.

**Forward models** — per-affordance predictions of resulting sensor state,
updated on every observation. This is the fast, continuous layer.

**Motor programs** — sequences of SEM actions that have been repeated enough
times, for the same goal, to be worth storing as a unit and replaying.

**Motor engrams** — links from a motor program back to the hippocampal episode
in which it mattered, so that context can modulate future execution.

Alongside these, and sharing the same learning rule, the proprioception module
runs a `FocusLearner` that calibrates the gain constants converting tracking
error into commanded movement.

## How it works

### Forward models and the learning rule

A forward model is keyed by the tuple `(entity, modulator, affordance,
param_bucket)`. Parameters within 10% of their declared range share a bucket, so
`rotate(degrees=45)` and `rotate(degrees=47)` train the same predictor rather
than fragmenting into thousands of one-observation models.

Each model holds a running expectation updated by the Rescorla-Wagner rule:

```
expected += lr * (actual - expected)
```

The same rule appears in the proprioception module's `FocusLearner`, written in
its classical form:

```
ΔV = α(λ - V)
```

where `α` is the learning rate (0.0–1.0), `λ` is the target value — the gain
that would have minimised the observed tracking error — and `V` is the current
gain estimate. The [NAc](/systems/nucleus-accumbens/) uses the same rule for
causal-link strength. It recurs across Maxim wherever something needs to
converge on an observed average without storing history.

Wiring a Cerebellum into a SEM body:

```python
from maxim.embodiment.cerebellum import Cerebellum
from maxim.embodiment.backends.cerebellum_modulator import cerebellum_modulator_factory
from maxim.embodiment.spec import attach_backends

cb = Cerebellum()
factory = cerebellum_modulator_factory(cb, fallback_factory=llm_mod_factory)
attach_backends(root, modulator_factory=factory)
```

In production this is automatic: `build_bio_stack` constructs
`BioStack.cerebellum` and `build_executor(cerebellum=...)` forwards it to
`generate_tools_for_entity`, so every generated affordance tool has a live
Cerebellum behind it, with prediction, training, and reaction emission all
wired.

Other documented properties: per-key locks for thread-safe concurrent
predict/observe, and persistence to `<persistence_dir>/cerebellum.json`
(default `~/.maxim/memory/cerebellum.json`).

### The confidence gate

The `CerebellumModulator` is the decision point. It has a cached prediction and
a confidence score, and one threshold:

```
confidence < 0.3  →  fall back to the LLM; the LLM's answer trains the model
confidence ≥ 0.3  →  serve the cached prediction; the LLM is never called
high variance     →  fall back to the LLM regardless
```

The high-variance escape is the important one. A model can be confident in the
sense of having many observations and still be useless if those observations
disagree — a joint that sometimes reaches its commanded angle and sometimes
stalls. Sample count alone would promote that model; variance demotes it back to
the LLM.

Either path emits a reaction onto the ReactionBus. A failed affordance emits
NEGATIVE at intensity 0.3–0.5; a confident prediction that skipped the LLM emits
POSITIVE at 0.1–0.3. The asymmetry is deliberate — a negativity bias, in the
repo's framing, so that things going wrong move the substrate further than
things going right.

### Bounded convergence

Learned gains do not roam. The `FocusLearner` clamps yaw and pitch gain to a
configured operational window, and will not adjust at all until it has enough
samples:

```python
from maxim.proprioception import FocusLearner, FocusLearnerConfig

config = FocusLearnerConfig(
    min_yaw_gain=0.1,
    max_yaw_gain=3.0,
    min_pitch_gain=0.1,
    max_pitch_gain=3.0,
    learning_rate=0.15,           # Rescorla-Wagner α
    error_scaling_factor=0.01,    # Converts pixels to gain delta
    sample_threshold=5,           # Min samples before adjusting
    persist_path="~/.maxim/util/focus_learner.json",
)

learner = FocusLearner(config)

learner.record_sample(
    expected_yaw=45.0, actual_yaw=42.5,
    expected_pitch=10.0, actual_pitch=11.2,
)

yaw_gain, pitch_gain = learner.get_gains()
commanded_yaw = error_yaw * yaw_gain
```

Gains persist to disk, so calibration survives a restart rather than being
relearned every session.

### Motor programs and engrams

When the agent repeats the same SEM sequence three or more times for the same
goal, the Cerebellum crystallizes it as a reusable `MotorProgram`. The
`ProgramRegistry` indexes programs three ways — by goal, by entity, by
affordance:

```python
programs = cb.find_programs_for_entity("sword")     # by entity
programs = cb.find_programs_for_affordance("slash") # by affordance
programs = cb.find_related_programs("attack")       # unified search
```

The program executor replays steps with a pain gate checked before each one
(abort if a sensor is near its failure threshold), a PainBus subscription for
mid-sequence interrupts, and gate tightening of 10% per painful execution — so a
program that keeps hurting becomes progressively harder to trigger.

Motor engrams sit on top. They form only on significant outcomes — pain above
0.3, surprise (RPE) above 0.3, or a genuinely novel program — and they decay
after roughly two days unless reinforced. The division of labour:

```
   Cerebellum          engram link          Hippocampus
   ──────────          ───────────          ───────────
   the HOW      ◄──── associative graph ───►  the WHEN / WHERE / WHAT
   program steps                              contextual episode
```

Context therefore modulates motor execution without the motor store having to
carry episodic data.

## A worked example: orienting toward a sound

The clearest end-to-end case on real hardware is a Reachy Mini learning to turn
toward speech. It is worth reading for what it shows about calibration
constants — and worth stating up front that the *policy* in this case study is
learned in the [NAc](/systems/nucleus-accumbens/) substrate, not in the
Cerebellum's forward models. The Cerebellum-family contribution is the gain
constant everything else is derived from.

An XVF3800 microphone array computes direction-of-arrival on-device and emits a
normalized azimuth in −1..+1, with 0 straight ahead. That continuous value is
binned into `far_left`, `near_left`, `near_right`, `far_right`, and the NAc maps
bin to turn action. The credit signal is not the raw bearing error but *relief* —
the reduction in error per step:

```
azimuth_0 → turn_left/right → robot rotates →
azimuth_1 measured → relief = |az_0| − |az_1| →
cluster_reward updated → persisted
```

The interesting failure was in the bin boundaries. Placed by hand at 0.5, they
straddled the threshold where the robot's actual step size flips which action is
correct, producing contradictory training signal that capped accuracy at 75%.
The fix was to derive the boundary from the measured gain rather than guess it:

```
boundary = gain × (d_small + d_large) / 2
```

which for that robot gives `0.546 × (1.2/2) = 0.33`. Repositioned there,
reported direction accuracy went from 0% to 100% over roughly ten hardware
trials; magnitude execution rate moved from 0.29 to 1.00 over 40 trials; and a
reloaded substrate started a fresh session at 100% correct on trial 0, before
any new experience. An untrained policy performed *worse* than chance at the
0.29 baseline, which is the observation that separates learning from a
hard-coded servo.

These are single-robot, single-configuration figures from one case study, not a
benchmark. The point they support is structural: the calibration constant is
measured per robot rather than shipped, which is why the same policy ports to
identical hardware without retraining.

## On the LLM-call reduction figure

The embodiment write-up states that "in testing, LLM calls drop from 100 to ≤40
over 100 actions" as the Cerebellum accumulates observations — the source for
the frequently-quoted "60% reduction."

Treat it as an illustration of the mechanism, not a benchmark. The source does
not identify the scenario, the entity or body used, the model behind the
fallback, the number of runs, or the variance across them. What the number
demonstrates is the shape of the thing: with a 0.3 confidence threshold and
10%-range param bucketing, a workload that revisits the same affordances will
stop consulting the LLM for most of them, and the fraction that keeps consulting
it is the fraction that stayed uncertain. How large that fraction is for *your*
body and *your* workload is not something this figure answers.

The same caution applies to the pass-count claims that circulate around the
embodiment layer. Where the repo does attach conditions, cite them: the
behavioral-convergence wiring is described as validated by "Experiment 2 (13/13
hypotheses confirmed)" with per-entity reward biases of food +0.753, water
+0.135, poison −0.495 — and that experiment is about the SEM learning loop
feeding valence back to the prompt, not about forward-model accuracy. A bare
"11/11 PASS" with no named test, no configuration, and no sample size tells you
that someone's suite was green, and nothing more.

## How it connects

```
  proprioception / SEM sensors
            │  position, velocity, sensor reads
            ▼
     ┌─────────────┐   predict/observe    ┌──────────────┐
     │ Cerebellum  │◄────────────────────►│ LLM fallback │
     │ forward     │   confidence < 0.3   └──────────────┘
     │ models      │
     └──────┬──────┘
            │ reactions (POSITIVE 0.1–0.3 / NEGATIVE 0.3–0.5)
            ▼
      ReactionBus ──┬──► NAc.distribute_reward   (reward learning, EC threshold)
                    └──► hippocampus.capture_reaction (episode valence)
            ▲
            │ engram links program ↔ episode
   PainBus ─┘   (pain > 0.3, RPE > 0.3, novelty; ~2-day decay)

   FearGatedExecutor wraps the executor outermost — unsafe actions
   never reach the modulator at all.
```

- **Input** comes from SEM sensors and the proprioception module — position,
  velocity, acceleration, direction reversals, commanded-versus-actual error.
- **Outcomes go to the [NAc](/systems/nucleus-accumbens/)**, which credits
  eligible substrate nodes proportionally to eligibility traces. Positive
  rewards widen [EC](/systems/entorhinal-cortex/) recognition by lowering its
  threshold; negative rewards clamp at 0, so the bias never narrows.
- **Traces go to the [Hippocampus](/systems/hippocampus/)** via
  `capture_reaction`, annotating episode valence; on episode close,
  `apply_hebbian_on_close` writes valence onto graph edges, and later retrieval
  with `spreading_activation(propagate_valence=True)` carries the affective tag
  forward. Concepts distilled from those episodes land in the
  [ATL](/systems/anterior-temporal-lobe/).
- **The [fear circuit](/systems/fear-circuit/) gates execution.** In the
  canonical executor stack `FearGatedExecutor` is outermost, so an action judged
  unsafe is blocked before any modulator — cached or LLM-backed — sees it.
- **Pain is two-layered**: `PerceivedPainAssessor` predicts pain before a tool
  runs (reading NAc experience), `PainInterceptorExecutor` fires ground-truth
  pain after, and the NAc link between them strengthens with repetition.

For where this sits relative to the rest of the substrate, see the [systems
overview](/systems/overview/) and [Architecture](/concepts/architecture/); for
the storage side of what the engrams point at, [Memory
systems](/memory/overview/). Timing context comes from the
[SCN](/systems/suprachiasmatic-nucleus/), and quantitative pattern confirmation
from the [Angular Gyrus](/systems/angular-gyrus/). To run any of this on real
hardware, start with the [Reachy Mini guide](/guides/reachy-mini/).

## Going deeper

- [`docs/embodiment_guide.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment_guide.md) — the SEM protocol manual: forward models, motor programs, engrams, the learning loop
- [`docs/proprioception.md`](https://github.com/dennys246/Maxim/blob/main/docs/proprioception.md) — FocusLearner, MovementTracker, PainDetector, the two-layer pain architecture
- [Embodiment](https://www.dennyschaedig.com/maxim/embodiment) — the design essay behind the forward-model layer
- [Sound orientation](https://www.dennyschaedig.com/maxim/sound-orientation) — the full hardware case study, including the actuation bug
- Source: `embodiment/cerebellum.py`, `embodiment/motor.py`, `embodiment/engrams.py`, `embodiment/backends/cerebellum_modulator.py`, `proprioception/focus_learner.py`
