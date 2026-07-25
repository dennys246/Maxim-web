---
title: Embodying Maxim
description: What it means to give Maxim a body — the Sensor-Entity-Modulator protocol, headless versus embodied operation, capability-driven embodiment, and how to bring the substrate to a new robot.
---

Maxim is a bio-inspired cognitive architecture, not a robotics framework. It
does not need a body to run — the memory systems, the reward substrate, the
episodic loop all work on a purely software agent that never senses or moves.
Embodiment is an *option* you add when you want the agent to have a physical or
virtual body, and it changes what the same substrate can learn: sensation
arrives as percepts, actions have bodily consequences, and routine movement
gradually stops needing the language model.

This page is the map. It explains why you would embody Maxim at all, the one
idea (SEM) that the whole layer is built on, the difference between running
headless and running with a body, what porting to a new robot actually asks of
you, and where every other page in this section fits.

## Why embodiment

Run Maxim headless and you have a capable agent: it remembers, it forms
concepts, it learns what is worth doing. What it does not have is a stake in the
physical world. There is no joint that can overextend, no battery that drains,
no sensor reading that contradicts what the agent expected. Nothing hurts,
because nothing can.

Giving Maxim a body adds two things the headless agent structurally cannot have:

- **Sensation.** The body publishes percepts — joint angles, temperatures,
  battery level, a bearing to a sound. Failure modes fire real pain signals when
  a sensor crosses a threshold, and that pain flows into the same reward and
  memory machinery that governs everything else the agent does.
- **Motor learning.** Once actions have measurable consequences, the
  [Cerebellum](/systems/cerebellum/) can learn *what actions do* — building
  per-affordance forward models so the hundredth repetition of a known movement
  costs a table lookup instead of an LLM call, while genuinely uncertain
  outcomes still fall back to the model.

Be honest about the trade. A body is not free capability — it is a source of
constraints the agent now has to respect, and most of the engineering in this
section is about declaring those constraints faithfully. The payoff is an agent
whose behavior is *grounded*: shaped by what its actual hardware can sense and
do, not by an abstract description of a robot in general.

## The SEM idea, briefly

Everything in the embodiment layer rests on one abstraction: the
**Sensor-Entity-Modulator (SEM) protocol**. Instead of a bespoke class per robot
type, every interactive thing — a joint, a camera, a rusty sword, an NPC — is
described as a composable triple:

- **Entity** — the thing itself (a shoulder joint, a wrist camera, a ferryman).
- **Sensor** — reads state from the entity (angle, temperature, durability, trust).
- **Modulator** — changes state of the entity through named *affordances*
  (rotate, restart, slash, threaten).

Entities compose into trees — a robot arm is an entity with a child entity per
joint — and you declare the whole tree in YAML:

```yaml
body:
  name: my_robot
  entity_type: robot
  children:
    - name: arm
      entity_type: joint
      sensors:
        angle: {unit: degrees, range: [0, 180], initial: 90}
      modulators:
        motor:
          affordances:
            rotate: {params: {degrees: float}, description: "Rotate arm"}
      failure_modes:
        - name: overextension
          trigger: {field: angle, op: ">", value: 170, pain: 0.7}
```

From that declaration Maxim auto-generates the agent's tools (one per
affordance), wires failure triggers to the pain bus, and lets the cognitive
stack learn from every interaction. Crucially the same protocol covers things
that are not robots at all: a sword with `durability` and a `slash` affordance,
or an NPC with `trust` and a `threaten` affordance, is just an Entity whose
modulators are backed by software stubs instead of hardware. The Cerebellum
learns "swinging a damaged sword" with the same update rule it uses for
"rotating an elbow."

This page stays deliberately high-level. For the full specification — sensor and
modulator semantics, failure-mode composition, drives, the YAML field
reference — see the [SEM protocol page](/embodiment/sem-protocol/).

## Headless versus embodied

**Headless** is the default. Nothing about the core agent requires a body, and
most of the memory and reasoning documentation assumes there isn't one.

**Embodied** means an Entity tree is loaded and its affordance tools are
registered into the agent's tool registry. There are two ways to get there.

For a single-entity body, the CLI does it in one flag. A component registered in
the bundled library (or under `~/.maxim/components/`) is loaded by reference:

```bash
# Validate the ref before spinning up the agent
maxim doctor --embodiment weapons/rusty_sword

# Run an agent that has rusty_sword as its body
maxim --llm mistral-7b --embodiment weapons/rusty_sword
```

Behind the flag, the agent bootstrap instantiates the entity, wraps it in an
`Embodiment`, and generates its affordance tools so the LLM can invoke them by
name. When the agent misuses the body — slashing with a near-shattered sword —
the failure fires pain, the pain becomes a negative causal link in the
[NAc](/systems/nucleus-accumbens/), and the next turn's policy already knows.

For a multi-entity body (a full arm with child joints), you load the spec in
code instead:

```python
from maxim.embodiment.spec import load_spec
from maxim.embodiment.body import Embodiment
from maxim.embodiment.tool_bridge import generate_tools_for_entity
from maxim.tools.registry import ToolRegistry

spec = load_spec("scenarios/embodiment/my_robot.yaml")
registry = ToolRegistry()
tools = generate_tools_for_entity(spec.root_entity, registry)
emb = Embodiment(spec.root_entity)
```

### Capability-driven embodiment

The design principle that makes this scale is that **Maxim hardcodes no
particular robot**. A platform *declares* its capabilities — which sensors it
has, what they can resolve, which actuators it can drive — in its body YAML, and
the agent adapts to whatever is declared. The same cognition and substrate code
runs unchanged across platforms; the differences live entirely in the
declarations.

The corollary matters as much as the rule: when a capability is absent — a
microphone array that cannot resolve elevation, say — the body simply *does not
declare it*. No code change, no dead configuration, no stubbed-out method. The
hardware's limits are load-bearing, and "declare what the hardware supports,
adapt the rest" is the whole point.

### The default embodiment

In simulation mode the agent always has a body. If you do not pass
`--embodiment`, Maxim auto-loads a genre-neutral default:
**`bodies/base_humanoid`** (v0.7+). It ships a small, deliberately generic
loadout — a handful of entity sensors (stamina, hunger, visibility,
carrying weight, with health derived), around eight affordances (look, listen,
rest, pick up, drop, use, move, speak), and a few failure modes (concussion,
exhaustion, injury, and so on). It exists so that "the agent has a body" is the
baseline assumption in sim, not a special case you have to opt into.

## Bringing Maxim to a new robot

Porting is where the capability-driven principle earns its keep. Because the
substrate is body-agnostic, most of what makes an agent work is *already
portable* — the learning core, the reward rules, the episodic loop, the
evaluation methodology all key on abstract state and affordance names, not on any
particular hardware. Porting is therefore not "reimplement the agent for my
robot"; it is "supply the small set of things that are genuinely robot-specific
and let the rest run unchanged."

Concretely, a new robot supplies four things:

1. **A body YAML** — the SEM declaration of the robot's sensors, drives, and
   affordances. This is where the hardware's real capabilities and limits get
   written down. Copy the shape of a bundled body and adapt it; the bundled
   `bodies/reachy_mini` template is a full worked model (head pose, body yaw,
   antennas, camera and microphone health, battery, motor temperature) you can
   start from.
2. **A controller** — a `RobotController` subclass, registered through
   `maxim.hardware` (`RobotController` ABC, `RobotRegistry`, and a host entry in
   `~/.maxim/robots.yaml`). The controller is the seam between the SEM model and
   the vendor SDK: it connects to the hardware, reads the real sensors, and drives
   the real actuators. The SEM template is deliberately independent of this — you
   can run an agent against the model in pure simulation, then wire the same model
   through to live hardware.
3. **Sensor readers and a motor mapping** — the wiring that turns a declared
   sensor into a real reading and a declared affordance into a real actuator
   command. Hardware enters through narrow, injected callables; the loop around
   them is untouched.
4. **Calibration answers** — the constants that must be *measured on your device*
   rather than copied. This is the part people get wrong. Design constants such as
   state-bin boundaries are *derived from your robot's own measured gain*, and a
   constant guessed by feel (rather than derived) is a classic source of
   silently-wrong learning. Measure first, derive second, and record the numbers
   on your platform page — never hardcode them into shared code.

The porting walkthrough that spells this out end to end — including the
per-robot calibration protocol and a hard-won failure-mode appendix (a wrong
actuation assumption is indistinguishable from a broken sensor) — is
[`porting_orient_loop.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/porting_orient_loop.md)
in the repo. For a fully worked example on real hardware, the
[Reachy Mini guide](/guides/reachy-mini/) takes a desktop humanoid head from
first connection to a substrate-learned behavior.

## Where the pieces live

This section has several pages, each covering one part of the embodiment layer:

- [**SEM protocol**](/embodiment/sem-protocol/) — the full specification: sensors,
  modulators, affordances, failure-mode composition, drives, and the YAML
  reference. Read this after the overview when you want the details.
- [**Component library**](/embodiment/component-library/) — the bundled catalog of
  ready-made entities (bodies, weapons, creatures, environments) and how
  component references and semantic discovery work.
- [**Asset foundry**](/embodiment/asset-foundry/) — how new SEM components get
  generated and curated, including auto-authored synonyms and near-duplicate
  checking.
- [**Imagination**](/embodiment/imagination/) — how entities named in narrative
  text but absent from the library get designed on the fly as ephemeral,
  provenance-tagged overlays.
- [**Reachy Mini guide**](/guides/reachy-mini/) — the worked hardware example:
  wiring the SEM model through to a live robot and learning a policy on it.
- [**Cerebellum**](/systems/cerebellum/) — the motor-learning system underneath
  the SEM layer: forward models, motor programs, and the confidence gate that
  decides when to skip the LLM.

## Going deeper

The primary sources in the repository:

- [`docs/embodiment_guide.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment_guide.md)
  — the SEM protocol manual: authoring entities, the CLI deployment path, the
  learning loop.
- [`docs/embodiment/README.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/README.md)
  — the platform-adaptation index and the capability-driven principle.
- [`docs/embodiment/porting_orient_loop.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/porting_orient_loop.md)
  — the concrete porting walkthrough and calibration protocol.
- [Embodiment](https://www.dennyschaedig.com/maxim/embodiment) — the design essay
  behind the SEM layer and the forward-model idea.

One caution carried over from the [Cerebellum page](/systems/cerebellum/): the
embodiment write-ups circulate figures like a "60% reduction in LLM calls" and
various pass counts. Treat them as illustrations of a mechanism, not benchmarks —
the sources rarely state the scenario, body, model, or sample size behind them.
Where the repo does attach conditions, cite the conditions; a bare number tells
you someone's run looked good, and nothing about how it will behave on your body
and your workload.
