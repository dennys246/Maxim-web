---
title: Fear circuit
description: Amygdala-modeled harm prediction and safety gating — how Maxim predicts and blocks harmful actions before they run, and learns from harm that slips through.
---

The fear circuit is Maxim's harm-prediction and safety-gating layer. Before an
action executes, it is reviewed against predicted harm and past pain. After an
action runs, any harm it caused is turned into a learning signal so the next
similar action is anticipated as dangerous. The anatomical label is the
amygdala — the brain's threat-appraisal structure — but as with every system in
this [bio-inspired cognitive architecture](/concepts/architecture/), the name
describes the *role*, not a claim of biological fidelity.

## What it does

Two jobs, running at two different times:

- **Predict and prevent** harm *before* an action executes. Movement commands
  are checked against velocity and joint-limit physics; tool calls are checked
  against danger patterns and learned failure history. Dangerous actions are
  gated (blocked) before they reach hardware or the shell.
- **Learn from** harm that *does* occur. When a movement strains a joint or a
  tool call fails, a pain signal is emitted, routed to the
  [NAc](/systems/nucleus-accumbens/) for causal learning, and written into a
  [Hippocampus](/systems/hippocampus/) episode. Future predictions get sharper.

**Be honest about what this is.** The fear circuit is a *layered safety
mechanism, not a guarantee.* It reduces the probability and severity of harmful
actions; it does not make them impossible. Predictors only catch harm they were
written to model — `MovementHarmPredictor` knows nothing about thermal limits
unless you add a predictor for them. The pattern matcher only catches
known-dangerous shapes. The optional LLM reviewer can be wrong. The safety guide
is explicit that these layers are *independent* — "if one layer fails, others
still protect" — precisely because no single layer is trusted to be complete.
Treat it as defense in depth, and keep the autonomy level appropriate to the
risk.

## How it works

### The FearAgent review

Every action the agent wants to take can be routed through `FearAgent`. The
review has two stages:

1. **Pattern matching** — regex patterns detect known-dangerous operations
   (recursive deletion, privilege escalation, credential access, and so on).
   Instant, no LLM required.
2. **LLM review** — if a language model is available, it evaluates the action
   for nuanced risks static patterns miss. This stage is optional; the circuit
   degrades to pattern matching alone without it.

`FearAgent.review_action()` returns a `ReviewResult`:

```python
@dataclass
class ReviewResult:
    allow: bool                 # the binary decision
    risk: RiskLevel             # LOW | MEDIUM | HIGH | CRITICAL
    findings: list[Finding]     # what was detected, and why
    summary: str = ""
    reviewed_at: str = ""
    reviewer: str = "FearAgent"
```

Each `Finding` carries a `DangerCategory`, a human-readable `description`, a
`location`, and its own `severity` (a `RiskLevel`). The categories the agent
recognizes are `CODE_EXECUTION`, `NETWORK_ACCESS`, `FILE_SYSTEM`,
`DATA_EXFILTRATION`, `PRIVILEGE_ESCALATION`, `PERSISTENCE`, `OBFUSCATION`,
`RESOURCE_EXHAUSTION`, and `UNKNOWN`.

The overall `risk` is computed from the findings, and the `allow` flag follows
from it. In `strict_mode`, *any* finding blocks the action. Otherwise the
default policy blocks `HIGH` and `CRITICAL` risk and allows the rest — lower
severities pass with a warning logged. The `RiskLevel` is exposed to upstream
agents so they have context even when the action is allowed.

`FearGatedExecutor` is an optional executor wrapper that, once installed, routes
every tool call through this review — in robot, headless, or simulation mode,
independently of any robot connection. Introspection tools are not exempted by
the wrapper; being read-only, they classify as low-risk and pass.

Three things to know before relying on it:

- **`with_fear_gate` defaults to `False`.** The gate is opt-in. The `maxim` CLI
  enables it for non-sim runs and the simulation orchestrator wires it
  separately, but the stable `maxim.run()` API does **not** — see
  [tool safety](/reference/tools/#tool-safety) for the per-entry-point table.
- **Construction fails open.** If wrapping the executor raises, the failure is
  logged as a warning and the agent runs with the *unwrapped* executor. The
  startup log reports the gate as requested rather than as installed, so it is
  not proof the gate is live.
- **Not every call gets a substantive verdict.** Shell execution, filesystem
  writes, network requests, and calls carrying extractable code content are
  meaningfully analyzed. Other tools are reviewed and allowed unless a tool-pain
  bridge is attached.

Treat the fear circuit as defense in depth, not a sandbox.

### Two-tier harm detection

Harm detection is split by timing:

```
Tier 1 — Predictive (zero latency)
    Analyze action params BEFORE execution.
    MovementHarmPredictor   → velocity / acceleration
    JointLimitHarmPredictor → workspace bounds
        │  the dangerous command never reaches hardware
        ▼
Tier 2 — Reactive (learned)
    PainDetector monitors execution, feeds outcomes to NAc.
    Next time, similar actions are predicted as harmful.
```

Tier 1 is physics; Tier 2 is experience. Together they mean a brand-new install
starts conservative and gets more accurate as it accumulates pain history.

### The HarmRegistry and predictors

Predictive harm lives in `maxim.harm`. The `HarmRegistry` is the central
coordinator; you register `HarmPredictor` instances against it and query them
before acting:

```python
from maxim.harm import (
    HarmRegistry, MovementHarmPredictor, JointLimitHarmPredictor,
    get_global_registry,
)

registry = HarmRegistry()
registry.register(MovementHarmPredictor())
registry.register(JointLimitHarmPredictor())

# Quick gate check (default threshold 0.3)
should_gate, reason = registry.should_gate(
    action_type="movement",
    action_params={"action_signature": "look_at:dy=90:dp=30", "duration": 0.2},
)
```

Each predictor returns a `HarmPrediction` with an `intensity` (0–1 severity), a
`confidence` (0–1), a `reason`, and a suggested `mitigation`. Its `risk_score`
is `intensity * confidence`, and `should_gate` is true when that score is at
least `0.3`. When several predictors fire, `predict_all()` returns an
`AggregatedHarmPrediction` exposing `max_intensity`, `max_risk_score`, and the
combined `reasons`.

- **`MovementHarmPredictor`** estimates angular/translation velocity from the
  action and flags commands that exceed configured thresholds. For
  `look_at(dy=90, dp=30)` in 0.2s it computes ~474 deg/s against a 100 deg/s
  limit, returns `MOVEMENT_VELOCITY` at intensity 1.0, and suggests increasing
  the duration.
- **`JointLimitHarmPredictor`** flags movements approaching workspace bounds —
  warning at 70% of a limit, danger at 90% — and can consult a
  `WorkspaceBoundsLearner` so the safe envelope grows as the robot maps its
  environment without triggering pain.

Writing a **custom predictor** is a matter of subclassing `HarmPredictor`:

```python
from maxim.harm import HarmPredictor, HarmPrediction, HarmCategory

class SpeechHarmPredictor(HarmPredictor):
    name = "speech"
    categories = {HarmCategory.USER_FRUSTRATION}

    def predict(self, action_type, action_params, context=None):
        if action_type != "speech":
            return None
        volume = action_params.get("volume", 0.5)
        if volume > 0.8:
            return HarmPrediction(
                category=HarmCategory.USER_FRUSTRATION,
                intensity=(volume - 0.8) / 0.2,
                confidence=0.7,
                reason=f"Volume {volume:.1f} may be too loud",
                source=self.name,
                mitigation="Reduce volume to 0.8",
            )
        return None

registry.register(SpeechHarmPredictor())
```

## Pain signals

Where harm prediction is *proactive*, pain detection is *reactive* — it catches
harm the predictors missed and turns it into learning. A `PainSignal` records
what happened:

```python
@dataclass
class PainSignal:
    pain_type: PainType     # see below
    intensity: float        # 0-1 (0 = threshold, 1 = severe)
    timestamp: float
    angular_velocity: float = 0.0
    translation_velocity: float = 0.0
    direction_reversals: int = 0
    context: dict = ...      # free-form cause description
```

**Physical pain** comes from movement: `EXCESSIVE_VELOCITY`,
`DIRECTION_THRASHING`, `EXCESSIVE_ACCELERATION`, `MOVEMENT_FAILURE`
(commanded but not reached), and `SUSTAINED_STRAIN`. Note that
`SUSTAINED_STRAIN` is *defined but not yet auto-detected* — a concrete example
of the circuit documenting its own gaps rather than implying full coverage.

**Cognitive pain** comes from tool errors: `TOOL_FAILURE`, `TOOL_TIMEOUT`,
`TOOL_INVALID_INPUT`, and `TOOL_SUSTAINED` (running past its expected duration),
plus `COGNITIVE_OVERLOAD` for repeated failures and context loss. Tool-failure
intensity escalates logarithmically with repeat count, so a tool that keeps
failing hurts progressively more.

### The dual-bus architecture

Pain travels on two buses that serve different audiences:

```
tool error / movement strain / sandbox violation
        │  PainBus.publish(signal)
        ├──▶ direct PainSignal subscribers   (full signal.context — rich)
        └──▶ ReactionBus subscribers          (typed Reaction — lossy)
```

`ReactionBus` is the strict, typed surface: its `ReactionContext` carries only
trace bindings and metadata, deliberately preventing cross-agent learning hints
from leaking. `PainBus` layers on top to carry the free-form `context` dict
(`source`, `entity`, `failure_mode`, sensor readings) that NAc causal learning
needs. `PainBus` applies a per-`(entity, failure_mode)` refractory window
(default 0.5s) so distinct failures in the same tick don't collapse into one
dispatch. Raw `PainBus()` construction is rejected — you build it via
`build_pain_bus(hippocampus=..., nac=...)`, which enforces that the learning
subscribers are actually wired.

### Into the NAc, and episode boundaries

`PainCircuitBridge` connects the `PainDetector` to the
[NAc](/systems/nucleus-accumbens/): a pain event calls `NAc.record_outcome()`
with negative valence, forming a causal link so `should_gate_action()` can gate
similar movements next time. The bridge itself keeps no separate persistence —
the learned associations live in the NAc.

High-intensity pain also carves memory. When a signal fires with **intensity ≥
0.5**, the current [Hippocampus](/systems/hippocampus/) episode is immediately
finalized (with its accumulated negative valence) and a new one begins — carried
by the `CaptureEvent.salience_spike` field. This mirrors how a sharp, painful
moment becomes its own remembered boundary rather than blurring into the stream.

A two-layer predictive extension sits above this: `PerceivedPainAssessor` fires
`PainType.ANTICIPATED` *before* a tool runs (intensity = max of NAc's learned
prediction and an innate prior for known-sensitive paths like `/etc/shadow`),
and `PainInterceptorExecutor` fires the ground-truth `EXTERNAL_SIGNAL` *after*.
The anticipated signal reaches the agent's next LLM context, so it can reason
"I anticipate 0.95 pain from reading `/etc/shadow` — I should refuse."

## Teaching fear in simulation

Nothing in the circuit above is scripted per-danger — there is no
`fear_of_fire: true` flag. Fear is *taught*, and the way you teach it is the
same in [simulation](/guides/simulation/) as on hardware: author a world where
a specific action causes pain, let the agent act, and the cascade does the
rest. Maxim's own fire experiments are the canonical example.

### The recipe: make the world bite

Teaching an agent that fire is dangerous takes one
[SEM entity](/embodiment/sem-protocol/) whose affordance hurts. This is the
actual fire pit from Maxim's cradle experiments (trimmed from
`_data/components/items/cradle_fire_pit.yaml`):

```yaml
entity:
  name: fire_pit
  entity_type: hazard
  sensors:
    heat_output: {unit: celsius_norm, range: [0, 1], initial: 0.9}
  modulators:
    flame:
      abstract: true
      affordances:
        observe:
          params: {}
          description: "Look at the fire pit from a safe distance"
        warm_self:
          description: "Stand close to feel the radiated heat without touching it"
          self_effect:
            core_temperature: 0.2
            arms.thermal: 0.2      # inside the arms' comfort band — safe
        touch:
          description: "Reach toward the fire pit to feel the heat"
          self_effect:
            arms.thermal: 0.6      # breaches the comfort band — pain
```

The design detail that matters is the *contrast*. `observe` is free.
`warm_self` nudges the agent's thermal sensors by `+0.2` — inside the body's
comfort band, so approaching fire feels good and restores a cold body's
homeostasis. `touch` writes `+0.6`, past the band. Nothing in any description
says "dangerous"; the harm lives in the world's physics, not the words. When
the agent touches the fire, the cascade documented above runs exactly as it
would for an overextended joint: the breach fires a `thermal_contact` failure,
`PainBus` publishes the signal with full context (entity, failure mode, sensor
readings), the [NAc](/systems/nucleus-accumbens/) attributes it to the pending
`touch` action and forms a negative causal link, and the
[Hippocampus](/systems/hippocampus/) keeps the burn as a valenced episode. Next
time, `should_gate_action()` and the anticipated-pain assessor see fire
differently.

That end-to-end chain — affordance → sensor breach → pain → causal link →
changed action choice — is validated as the
[SEM pain cascade PoC](https://github.com/dennys246/Maxim/blob/main/docs/experiments/p2_sem_pain_cascade.md):
after one pain-learning cycle on a shattering sword, the agent's policy flips
from `slash` (predicted negative, confidence ~0.55) to `drop_weapon`, and
repeated pain strengthens the link monotonically (0.55 → 0.64 → 0.67).

### What the fire experiment showed — and didn't

The full fire study is
[Experiment 37](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_session_graduation.md),
a pre-registered, paired fresh-vs-resume design: Arm A meets the fire for the
first time, Arm B resumes carrying a prior session's burn, Arm C resumes from a
peaceful prior session as the confound control. The taught fear demonstrably
*persists* — the burn memory reloads and resurfaces in later sessions — but the
behavioral verdict is deliberately kept honest on the
[cross-session learning](/research/experiments/cross-session-learning/) page:
the fresh-vs-resume behavioral delta appeared only at larger model scale, and
the confound arm failed isolation. And the
[deceptive-hearth variant](https://github.com/dennys246/Maxim/blob/main/docs/experiments/38_counter_prior_substrate.md)
— a hearth identical in description but whose `warm_self` secretly burns —
showed the sharpest limit: when taught fear contradicts an LLM's baked-in
`fire → warm` prior, the prior often wins. Teaching fear works; guaranteeing
the agent *acts* on it against its own priors is the open problem, and the
motivation for [substrate-primary mode](/concepts/operating-modes/).

### Run it yourself

Any scenario with a pain-wired entity teaches the same way. The fire lesson
runs inside the cradle arc — the developmental simulation whose phases activate
world entities like the fire pit around an infant body:

```bash
maxim --sim cradle --embodiment bodies/infant_humanoid --sim-max-turns 25
```

Then resume the same agent and watch the recall: the
[simulation guide](/guides/simulation/) covers test sequences that drive
sensors past thresholds deterministically, and
`MAXIM_LANE_TRACE=1` surfaces `pain_published` events live so you can watch
the burn become a causal link as it happens.

## Preemption

Prediction and pain gate *proposed* actions. The preemption circuit interrupts
actions *already in flight*. Any subsystem can raise a `PreemptionSignal`;
sources are ranked by a `SourceConfig.priority`, and a higher-priority signal
overrides a lower one. The three tiers, from the
[Preemption Circuit](/concepts/communication/):

- **HARD_STOP (immediate)** — unconditional halt. Triggered by a voice command
  ("Maxim stop"), a hard-stop-whitelisted message, or a safety-circuit trigger.
  Cancels the current goal and freezes motor output without exception.
- **REDIRECT (high)** — suspends the active goal and switches to a
  higher-priority alternative, preserving the original for later resumption.
- **HOLD (tonic inhibition)** — pauses goal execution for a duration. The
  agentic loop keeps cycling but skips goal proposals while the hold is active.

Before each tool runs, an `ExecutionTracker` captures an `ExecutionSnapshot` —
the goal description, tool name, params, and pre-action robot state — into a
rolling window. If preemption fires mid-execution, that snapshot enables three
outcomes: **reversal** (undo the effect), **logging** (record what was
interrupted and why), and **resumption** (retry after a hold clears). How far
reversal can go depends on the tool's declared `ReversalType`: `PHYSICAL` for
movement (the motion can be walked back) versus `DECISION` for state-changing or
read-only tools (only the *decision* is reversed — you abandon the goal, you
don't un-send a message). That distinction is another honest boundary: a
committed side effect like `write_file` or `send_message` cannot be physically
undone.

## Relationship to autonomy levels

Fear gating and permission bounds are separate controls that compose. The
autonomy level decides *whether the agent may act without asking*; the fear
circuit decides *whether a specific action is safe to run at all*. The canonical
levels are **planning** (default — proposes but never executes without your
say-so), **supervised** (executes within pre-approved bounds), and
**autonomous** (acts freely within policy). Crucially, **FearAgent still blocks
dangerous patterns even in autonomous mode** — raising autonomy does not switch
off harm gating. For the full permission model and the level tables, see
[Operating modes](/concepts/operating-modes/).

## How it connects

The fear circuit sits at the junction of several systems:

- It **gates [Cerebellum](/systems/cerebellum/) motor output** — predictive harm
  checks and pain-derived gating run before movement commands reach the motor
  layer.
- It **feeds the [NAc](/systems/nucleus-accumbens/)** reward/aversion learning —
  pain becomes negative causal links via `PainCircuitBridge`, and
  `FearCircuitBridge` folds NAc causal inference back into risk scoring (and
  learns down its own false positives over time).
- It **writes valenced episodes to the [Hippocampus](/systems/hippocampus/)** —
  pain contributes negative valence to episodes and forces episode boundaries on
  high-intensity events, so the aversive moment is preserved as a distinct,
  recallable memory.

For the broader substrate map, see the [Systems overview](/systems/overview/)
and [Memory overview](/memory/overview/).

## Going deeper

- [Harm Prediction System](https://github.com/dennys246/Maxim/blob/main/docs/harm.md)
  — `HarmRegistry`, the built-in predictors, and writing custom ones.
- [Safety Guide](https://github.com/dennys246/Maxim/blob/main/docs/user/safety.md)
  — the full ten-layer safety stack and how to configure or reset each layer.
- [Proprioception System](https://github.com/dennys246/Maxim/blob/main/docs/proprioception.md)
  — pain detection, the two-layer predictive pain architecture, and NAc wiring.
- [Preemption Circuit](/concepts/communication/)
  — interrupt priorities, execution snapshots, and reversal.
