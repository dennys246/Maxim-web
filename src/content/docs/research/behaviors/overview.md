---
title: Behaviors overview
description: The Default Network's reactive reflex layer — what a behavior is, the contract and lifecycle, ThalamicGate filtering, PriorityArbiter arbitration, and how reflexes relate to the deliberative agent and the fear circuit.
---

A **behavior** in Maxim is a lightweight *reactive* module — a reflex. Each tick
of the Default Network it looks at the current perceptual input and optionally
proposes one motor action. It turns the robot toward a novel object, tracks a
face, or startles at a sudden appearance — all **without** LLM deliberation, at
the reactive thread's ~30 Hz. As with every part of this
[bio-inspired cognitive architecture](/concepts/architecture/), the anatomical
names describe *roles*, not claims of biological fidelity.

Behaviors live in the Default Network (DN), the layer that handles routine
visual responses so the deliberative agent doesn't have to. Two things are worth
stating up front:

- **Vision behaviors are shipped and mature.** Every behavior in the package
  today is visual — it reads detections and proposes a gaze or motion action.
  See [Vision behaviors](/research/behaviors/vision/).
- **Audio behaviors are aspirational.** The orient-to-sound reflex is *not yet
  buildable* as "just one behavior"; it needs several generic-DN additions the
  visual path already has. See [Audio behaviors](/research/behaviors/audio/) for
  an honest account of what does and does not exist.

The package is `pymaxim` (imported as `maxim`); behaviors live under
`maxim.default_network.behaviors`.

## The Default Network layer

The Default Network is the reactive substrate. It provides four things:

1. **Reactive behaviors** — fast, pre-programmed responses to stimuli.
2. **Thalamic gating** — filtering percepts before escalating to deliberation.
3. **Priority arbitration** — selecting one winning behavior with hysteresis.
4. **Naturalistic movement** — human-like saccade-and-fixate dynamics.

```text
Visual Input → SalienceNetwork → ThalamicGate
                     ↓                 ↓
              AttentionNetwork    Escalate to LLM?
                     ↓                 ↓
              PriorityArbiter ← FilteredPercept
                     ↓
              Winning Behavior
                     ↓
              Motor Commands
```

The DN runs its own internal loop at `update_hz` (30 Hz by default) in a daemon
thread. Percepts arrive via handler methods; winning actions and escalated
percepts go out to registered callbacks. It is configured with a
`DefaultNetworkConfig`:

```python
from maxim.default_network import DefaultNetwork, DefaultNetworkConfig

config = DefaultNetworkConfig(
    enabled=True,
    update_hz=30.0,
    auto_release_timeout=5.0,       # max inhibition before auto-release
    publish_actions=True,
    fear_gate_enabled=True,
)
dn = DefaultNetwork(maxim=maxim_instance, config=config)
dn.start()
dn.add_action_callback(lambda action: motor.execute(action))
dn.on_detections(yolo_detections)   # feed raw detections
```

## ThalamicGate — deciding what deserves the LLM

The `ThalamicGate` filters percepts to decide what needs deliberative attention.
Most percepts are handled reactively inside the DN; only the ones that clear the
gate escalate to the LLM. The gate uses **adaptive thresholds** that learn from
experience — it targets a fixed escalation rate (default 5%) and adjusts novelty
and salience thresholds within bounds to hold it, persisting the learned values
to `~/.maxim/util/adaptive_thresholds.json`.

```python
from maxim.default_network import ThalamicGate, GateConfig

gate = ThalamicGate(GateConfig(
    novelty_threshold=0.7,
    salience_threshold=0.6,
    anomaly_threshold=0.7,
    safety_velocity_threshold=200.0,   # px/frame for rapid approach
    adaptive=True,
))
```

The gate is the seam between reflex and deliberation: reactive behaviors act on
what stays below the threshold; the deliberative agent loop acts on what rises
above it.

## The behavior contract

A behavior subclasses `Behavior` and sets a few class attributes. `evaluate()`
is the only abstract method; the base class provides cooldown bookkeeping and a
`_create_proposal` helper.

```python
from maxim.default_network import Behavior, BehaviorState, ActionProposal

class MyBehavior(Behavior):
    name = "my_behavior"          # unique id; also the inhibition/arbitration key
    base_priority = 0.6           # 0.0–1.0, scaled per proposal
    cooldown_seconds = 0.5        # minimum time between activations
    enabled = True

    def evaluate(self, detections: list[dict], state: BehaviorState) -> ActionProposal | None:
        if not self.can_activate():          # respect the cooldown
            return None
        # ... decide cheaply (<10 ms, non-blocking) ...
        return self._create_proposal(
            action_type="look_at",
            target=(u, v),
            priority_scale=1.0,
            confidence=0.9,
        )
```

**The one rule that dominates all others:** `evaluate()` must run in `<10 ms`
and must never block. It runs on the DN loop thread, once per enabled behavior
per tick. Any blocking call — network I/O, `sleep`, a motor command that waits
for completion — freezes the entire reactive layer. Anything a behavior needs
beyond `detections` and `state` (head pose, a novelty tracker, a sensor reading)
is **pushed in by DN via a setter between ticks**, never pulled inside
`evaluate()`. Exceptions are caught, logged, and the behavior skipped for that
tick — a silently-skipped behavior looks exactly like one that "never triggers,"
so validate inputs.

A behavior returns an `ActionProposal` (a frozen dataclass):

| field | meaning |
|---|---|
| `behavior_name` | the behavior's `name` (set by `_create_proposal`) |
| `action_type` | dispatch key — must have a branch in `_dispatch_action_to_motor` |
| `target` | `(u, v)` pixel coords, or `None` — **load-bearing** (gating depends on it) |
| `priority` | `base_priority * priority_scale` |
| `confidence` | 0.0–1.0 |
| `metadata` | free-form dict the motor dispatch reads |

The arbiter ranks on `effective_score() = priority * confidence`.

## Lifecycle: how a proposal becomes motion

Every DN tick runs the same pipeline:

1. **Idle-exploration short-circuit** — if nothing interesting happened recently,
   DN may run an idle scan and return early.
2. **Input gate** — `if not detections: return`. *Today this is the **visual**
   gate*, and it is precisely why an audio-only tick never reaches behavior
   evaluation (see [Audio behaviors](/research/behaviors/audio/)).
3. **Perception update** — novelty, spatial, salience, movement, scene.
4. **State push** — current head pose and interests are pushed into behaviors
   that declared setters for them.
5. **Evaluate** — build a `BehaviorState`, loop enabled and un-inhibited
   behaviors, collect proposals, apply per-behavior priority modifiers.
6. **Arbitrate** — `PriorityArbiter.select` picks one winner.
7. **Dispatch** — route the winner's `action_type` to a motor method.

Behaviors are **constructed and passed as a list** to
`DefaultNetwork(behaviors=[...])`; there is no dynamic `register_behavior()`. A
new `action_type` is a silent no-op until it has a branch in
`_dispatch_action_to_motor` — which today handles exactly `look_at`, `scan`,
`track`, and `turn_around`.

Inside `evaluate()`, a behavior reads the `BehaviorState`: the frozenset of
`inhibited_behaviors`, per-behavior `priority_modifiers`, `current_goals`,
`interests` (class IDs of interest), a `salience_map`, a `focus_learner`, the
`frame_timestamp`, and — the link to the safety layer — `fear_level`.

## Arbitration and inhibition

`PriorityArbiter.select` picks one winner across all proposals by
`effective_score()`, with **hysteresis** to prevent thrashing between behaviors.

```python
from maxim.default_network import PriorityArbiter, ArbiterConfig

arbiter = PriorityArbiter(ArbiterConfig(
    hysteresis_bonus=0.1,       # bonus for the current behavior
    min_switch_interval=0.3,    # min seconds between switches
    score_threshold=0.1,        # min effective score to act
))
```

Set `base_priority` relative to siblings deliberately — startle (0.95) beats
social (0.9) beats orienting (0.8) beats motion tracking (0.7) beats turn-around
(0.3). A high-priority reflex that neither habituates nor cools down will starve
the others, so every reflex must carry a cooldown or habituation.

**Inhibition is one-way by design: cognition suppresses reflex, never the
reverse.** A behavior whose `name` appears in `state.inhibited_behaviors` is
skipped. Today that set is populated from **mode config** (a `priority_modifier`
of `<= 0`), not from live per-tool deliberative suppression — the hook for "the
LLM's voluntary head move suppresses my reflex" is net-new wiring that does not
yet exist.

## Relation to the fear circuit and the agent loop

Behaviors sit *below* deliberation and *beside* safety:

- **Deliberative agent loop.** The [ThalamicGate](#thalamicgate--deciding-what-deserves-the-llm)
  is the boundary. Reactive behaviors handle what stays below threshold;
  escalated percepts go to the LLM. Deliberation can also `inhibit()` the
  reactive layer while it acts.
- **[Fear circuit](/systems/fear-circuit/).** `fear_level` is delivered into
  every `BehaviorState`, and the DN's fear gate (`fear_gate_enabled`) can veto a
  proposal before dispatch. Note the caveat that matters for new reflexes:
  target-less proposals *skip* the salience, IOR, and fear gates, because those
  gates operate in pixel space and short-circuit to "allow" when `target` is
  falsy. Give a proposal a spatial target, or the safety gating is silently
  absent.
- **[Cerebellum](/systems/cerebellum/).** Continuous motor-gain adaptation
  (recalibrating *how far* a movement lands) is cerebellar territory, not a
  behavior's job — relevant to the aspirational audio reflex.

## The behavior catalog

Every behavior below is **shipped and visual**. The audio behavior is *not* in
this table because it does not yet exist as a runnable behavior.

| Behavior | Base priority | Trigger | Status |
|---|---|---|---|
| `StartleResponse` | 0.95 | Sudden peripheral appearance | Shipped |
| `SocialAttention` | 0.9 | Face / person detected | Shipped |
| `OrientingResponse` | 0.8 | Novel object appears | Shipped |
| `MotionTracking` | 0.7 | Moving object detected | Shipped |
| `TurnAround` | 0.3 | Head at yaw limit with interest beyond | Shipped |
| `IdleScan` | 0.2 | No interesting stimulus after timeout | Shipped |
| `ReturnToCenter` | 0.2 | Head drifted beyond threshold | Shipped |
| `Microsaccades` | 0.1 | During prolonged fixation | Shipped |
| `AudioOrienting` | 0.8 (intended) | Off-frame sound (direction of arrival) | **Aspirational — not buildable yet** |

The anatomical mapping is loose but intentional: the coordinator echoes the
Default Mode Network, `ThalamicGate` the thalamus, `OrientingResponse` the
superior colliculus, `GazeController` the frontal eye fields, and
`StartleResponse` / `SocialAttention` the amygdala.

## Configuration

Behaviors are configured from a bundled YAML (`data/util/default_network.yaml`),
overridable via `build_default_network(config_path=...)`:

```yaml
default_network:
  enabled: true
  update_hz: 30.0
  behaviors:
    orienting:
      enabled: true
      priority: 0.8
      novelty_threshold: 1.2
      min_confidence: 0.4
      cooldown_seconds: 0.5
    social:
      enabled: true
      priority: 0.9
      prefer_faces: true
      tracking_hysteresis: 0.1
    turn_around:
      enabled: true
      priority: 0.3
      yaw_threshold: 0.85
      edge_threshold: 0.15
      turn_angle: 90.0
      cooldown_seconds: 10.0
  arbiter:
    hysteresis_bonus: 0.1
    min_switch_interval: 0.3
  gate:
    novelty_threshold: 0.7
    salience_threshold: 0.6
    adaptive: true
```

## Where to go next

- [Vision behaviors](/research/behaviors/vision/) — the shipped detection-driven
  path, with each behavior's exact parameters.
- [Audio behaviors](/research/behaviors/audio/) — the aspirational
  orient-to-sound path, and an honest map of what is missing.
- [Experiments](/research/experiments/) · [Fear circuit](/systems/fear-circuit/)
  · [Cerebellum](/systems/cerebellum/) · [Architecture](/concepts/architecture/)
  · [Reachy Mini guide](/guides/reachy-mini/)
- Source: the [behavior authoring guide](https://github.com/dennys246/Maxim/blob/main/docs/behaviors/README.md)
  and the [Default Network architecture doc](https://github.com/dennys246/Maxim/blob/main/docs/default_network.md).
