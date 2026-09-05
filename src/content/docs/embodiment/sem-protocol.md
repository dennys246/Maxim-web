---
title: The SEM protocol
description: How Maxim describes a body or a world in YAML — sensors you read, modulators you act through, entities that compose them, and the agent tools generated automatically from all three.
---

Every interactive thing Maxim can touch — a robot joint, a wrist camera, a
rusty sword, a suspicious ferryman — is described the same way: as a
**composable triple**. There is the *thing* itself (the Entity), a set of ways
to *read* its state (Sensors), and a set of ways to *change* its state
(Modulators). That triple is the Sensor-Entity-Modulator protocol, or SEM, and
it is the single abstraction that lets one [bio-inspired cognitive
architecture](/concepts/architecture/) drive hardware and fiction with the same
machinery.

The payoff of describing things this way is that you never write tool code. You
write a YAML file, load it, and the agent's tool registry fills with functions
it can call. Pain triggers arm themselves from the thresholds you declared. The
[Cerebellum](/systems/cerebellum/) starts learning what your affordances do to
your sensors. Nothing in the cognitive stack knows or cares whether the entity
behind a tool is a servo or a story.

## The model

Three protocols, defined in `maxim/embodiment/sem.py`, do all the work.

**Entity** — the thing. An entity has a `name`, an `entity_type` (a semantic
hint, not an enforced class), and optionally child entities. Entities compose
into trees: a robot arm is an entity whose children are its joints, each joint
a child entity with its own sensors and modulators. `arm → elbow → wrist →
gripper` is a four-level entity tree, and the same nesting works for a dungeon
(`hero → right_hand`) as for a manipulator.

**Sensor** — a readable quantity. One sensor captures one thing: an angle, a
temperature, a durability ratio, an NPC's trust. Reading it returns a value with
a unit and a timestamp. Sensors with a numeric `range` are *scalar* and
participate in the parts of the stack that reason over magnitudes — pain
proximity, failure evaluation, engram similarity. Sensors with a `shape` (camera
frames, audio) are *non-scalar*: readable, but excluded from similarity and
failure math.

**Modulator** — a way to change state. A modulator groups **affordances**:
named actions with typed parameters, a description, and an optional timeout.
A `motor` modulator on a joint might expose `rotate_angle` and `brake`; a
`combat` modulator on a sword exposes `slash` and `parry`. The affordance's
parameter schema is the same shape a hand-written tool would use.

### Tools are generated, not written

When a spec loads, `generate_tools_for_entity` walks the entity tree and emits
three kinds of tool automatically:

| Pattern | Does | Example |
|---------|------|---------|
| `sense_{entity}` | Read all of an entity's sensors at once | `sense_shoulder` |
| `read_{entity}_{sensor}` | Read one named sensor | `read_shoulder_angle` |
| `{entity}_{affordance}` | Execute one affordance | `shoulder_rotate_angle` |

The agent's LLM sees those names alongside its standard tools and invokes them
like any other tool. If two entities share a name (two robots, each with a
`shoulder`), the generator disambiguates progressively: first the bare
`shoulder_rotate_angle`, then a parent-prefixed `robot2_shoulder_rotate_angle`,
then the full path if a collision remains.

## Defining a body in YAML

Here is a minimal, complete body — one robot with a single articulated joint:

```yaml
# scenarios/embodiment/my_robot.yaml
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

That is enough to generate `sense_arm`, `read_arm_angle`, and `arm_rotate`, and
to fire a pain signal of intensity `0.7` whenever `angle` crosses `170`.

### Top-level shape

A spec file has two possible roots, and may carry both:

```yaml
body:                      # the agent's own entity tree (a robot, a character)
  name: robot_arm
  entity_type: arm
  children: [...]

world_entities:            # interactive objects/NPCs in the environment
  - name: rusty_sword
    entity_type: weapon
  - name: ferryman
    entity_type: npc

name: "my_scenario"        # optional display name (defaults to body name)
description: "..."         # optional human-readable description
test_sequence: [...]       # optional validation sequence
expectations: [...]        # optional metric expectations
```

Specs load through `maxim.embodiment.spec.load_spec()`, producing a live entity
tree with tools attached.

### Sensors

```yaml
sensors:
  angle:
    unit: degrees
    range: [-180, 180]     # scalar range → implies type: float
    initial: 0             # optional; defaults to midpoint of range
  frame:
    unit: rgb_frame
    shape: [480, 640, 3]   # NDArray shape → implies type: ndarray
    dtype: uint8           # optional; defaults to float32
```

| Field | Required | Notes |
|-------|----------|-------|
| `unit` | Yes | Human-readable unit string (`degrees`, `celsius`, `ratio`, `kg`, `rgb_frame`) |
| `range` | No\* | `[min, max]` for scalar sensors; sets `type: float` |
| `shape` | No\* | `[h, w, c]` for array sensors; sets `type: ndarray` |
| `dtype` | No | Array dtype; only meaningful with `shape` |
| `initial` | No | Starting value; defaults to the midpoint of `range`, else `0` |
| `type` | No | Explicit `float`/`int`; usually inferred from `range`/`shape` |
| `modality` | No | Since 1.1.4: the exteroceptive substrate channel this sensor feeds — `world` or `audio`. Absent means no exteroceptive channel (the pre-1.1.4 behaviour); `interoception` is not declarable |

\* Provide at least one of `range` or `shape`. With neither, the sensor defaults
to `type: float`.

**`modality`, since 1.1.4.** A sensor may declare which exteroceptive substrate
channel carries it: `modality: world` or `modality: audio`. The `world` channel
exists only when a body declares into it, so every body that predates the field
behaves byte-identically; `interoception` is not declarable, because interoception
membership comes from the sensor's `drive:` block. It is an entity-level sensor
field — a modulator's sub-sensor cannot carry one — and an unknown tag raises at
parse time rather than leaving a sensor silently in no channel. For a world body
the declaration is not cosmetic: the `range` sets where the encoding's neutral
point sits, and the shipped `bodies/minecraft_player` re-centres its ranges so a
resting value sits at that neutral. The ceiling this is designed around is
[L11](/research/limits/#l11--the-sensor-count-discrimination-ceiling).

### Modulators

```yaml
modulators:
  motor:
    affordances:
      rotate_angle:
        params:
          degrees: float          # required float parameter
          speed: {type: float, default: 1.0}   # optional, with default
        description: "Rotate the joint to target angle"
        timeout: 30.0             # optional; default 30s
      brake:
        params: {}                # no parameters
        description: "Engage the brake"
```

Parameters may be `float`, `int`, `str`, or `bool`. The bare form
(`degrees: float`) is a required parameter; the expanded form
(`{type: float, default: 1.0}`) makes it optional with a default.

### Failure modes

Failure modes are the bridge from sensor readings to felt harm. When a trigger
fires, it publishes a pain signal that routes through the
[fear circuit](/systems/fear-circuit/) and into causal learning — the agent
comes to anticipate the action as dangerous.

```yaml
failure_modes:
  # simple trigger
  - name: overextension
    trigger: {field: angle, op: ">", value: 175, pain: 0.8}

  # compound trigger — ALL conditions must hold
  - name: tennis_elbow
    composes: [strain, fatigue]
    trigger:
      all:
        - {field: strain, op: ">", value: 0.6}
        - {field: fatigue, op: ">", value: 0.5}
    pain_intensity: 0.5

  # persistent failure — stays active until recovery
  - name: overheating
    trigger: {field: temperature, op: ">", value: 70, pain: 0.6}
    persistent: true
    recovery_condition: {field: temperature, op: "<", value: 40}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Failure mode name |
| `trigger` | Yes | A single `{field, op, value, pain}` or a compound `{all: [...]}` |
| `composes` | No | Base modes this failure is built from |
| `pain_intensity` | No | Overrides the trigger's `pain` |
| `persistent` | No | If true, stays active until `recovery_condition` is met |
| `recovery_condition` | No | Trigger that clears a persistent failure |

Comparison operators are `>`, `<`, `>=`, `<=`, `==`. There are **six fixed base
failure modes** — `overextension`, `overheating`, `strain`, `fatigue`, `impact`,
`exhaustion` — and custom failures are expected to `compose` from them rather
than invent new primitives.

### Drives

A scalar sensor can carry a `drive:` block that wires it into the homeostatic /
entropic pain system. Drives cause pain automatically as a value drifts, with no
explicit failure mode: hunger that climbs until it hurts, a core temperature
that wants to sit at its set point.

```yaml
sensors:
  hunger:
    unit: ratio
    range: [0, 1]
    initial: 0.0
    drive:
      drift_mode: entropic          # drifts toward a bound
      drift_direction: up           # "up" (→1) or "down" (→0)
      drift_rate: 0.006             # per-second drift
      deprivation_threshold: 0.7    # pain fires beyond this
      deprivation_pain: 0.3
      satisfaction_threshold: 0.3   # positive reaction on crossing back

  core_temperature:
    unit: celsius_norm
    range: [-1, 1]
    initial: 0.0
    drive:
      drift_mode: homeostatic       # self-regulates toward set_point
      set_point: 0.0
      drift_rate: 0.001
      comfort_band: 0.25            # no pain within ±band
      pain_scale: 1.5
      pain_model: linear            # "linear" only in v1.0
```

Entropic drives take `drift_mode` (required, `"entropic"`), `drift_direction`
(default `"up"`), `drift_rate` (default `0.001`), `deprivation_threshold`
(default `0.7`), `deprivation_pain` (default `0.3`), and `satisfaction_threshold`
(default `0.3`). Homeostatic drives take `drift_mode` (required,
`"homeostatic"`), `set_point` (default `0.0`), `drift_rate` (default `0.001`),
`comfort_band` (default `0.0`), `pain_scale` (default `0.5`), and `pain_model`
(default `"linear"`).

#### A cold drift that disrupts homeostasis

A homeostatic drive is stable on its own: `core_temperature` sits at its
`set_point` of `0.0` and the slow `drift_rate` of `0.001`/s nudges it back
whenever it wanders inside the `comfort_band` of `±0.25`. Left alone, the agent
never feels its own temperature.

Now introduce an external chill — the agent steps into a blizzard, or loses the
heat source it was banking on. Something drives `core_temperature` **down far
faster than the homeostatic pull can correct it**:

```yaml
sensors:
  core_temperature:
    unit: celsius_norm
    range: [-1, 1]
    initial: 0.0
    drive:
      drift_mode: homeostatic
      set_point: 0.0
      drift_rate: 0.001       # gentle self-correction toward 0.0
      comfort_band: 0.25      # no pain within ±0.25 of set_point
      pain_scale: 1.5
      pain_model: linear
```

Once the value falls past `-0.25` it leaves the comfort band, and the `linear`
pain model begins firing homeostatic pain that grows with the distance beyond the
band and scales by `pain_scale`. At `core_temperature ≈ -0.6` the agent is `0.35`
below the band and in sustained, rising pain. Crucially, this pain is **not** a
scripted `failure_mode` with a threshold rule — it is intrinsic to the drive
itself: the system is simply out of balance.

From there the [SEM pain cascade](/systems/fear-circuit/) takes over. The chill
registers as pain, the episode is tagged with negative valence, and the
[nucleus accumbens](/systems/nucleus-accumbens/) records the drift as aversive.
Whether that record changes what the agent *does* in a later session is the open
question here, not the guarantee — see the limitation below.

The cascade's plumbing is validated end to end in the
[SEM pain cascade PoC](https://github.com/dennys246/Maxim/blob/main/docs/experiments/p2_sem_pain_cascade.md)
— affordance use → sensor failure → `PainBus` → NAc causal learning →
`nac.predict` → policy pick, with no mocks in the middle. Note what that PoC ran
on, though: a scripted `PoCAgent` driving `weapons/rusty_sword` past its `shatter`
threshold, in one session, with no LLM in the loop. That is the *scripted
`failure_mode`* path — the one this example is explicitly not using. The
homeostatic-drive route described above has no equivalent end-to-end run, and the
closest thing to a behavioural test of it went the other way: the drive-gating arm
in [Exp 42](https://github.com/dennys246/Maxim/blob/main/docs/experiments/42_substrate_primary_preference.md)
graduated identically with gating switched **off** (`safe_pref` 0.984 vs 0.965),
so drive gating was not load-bearing for the preference it was meant to produce.
You can still drive a body cold yourself with a test sequence in
[simulation](/guides/simulation/).

:::caution[Known limitation: priors can override learned pain]
The [deceptive-hearth counter-prior study](https://github.com/dennys246/Maxim/blob/main/docs/experiments/38_counter_prior_substrate.md)
exposes a real limit of the system today. An agent carries cross-session burn pain
from a hearth that warms but then harms — yet across four frontier models, a strong
LLM's baked-in `fire → warm` prior **dominated the freshly learned substrate**, and
the agent re-engaged the harmful source anyway. In other words, having *felt* the
consequence does not yet reliably change behavior when it contradicts what the model
already believes.

Two directions aim to close this gap. Near term, **substrate-primary mode** takes the
LLM out of — or down-weights it in — action selection, so the
[nucleus accumbens](/systems/nucleus-accumbens/) acts on learned causal links directly
rather than only advising a model that overrules it. Longer term, the plan is to
**train a substrate-primary LLM** — a model trained to act on the agent's learned
substrate instead of overriding it with baked-in priors, so the two stop fighting. Both
are experimental/roadmap, not shipped; the current results, including where substrate
helps and where priors still win, are laid out in
[Substrate-primary evidence](/research/experiments/substrate-primary-evidence/), and the
mode itself is described under [operating modes](/concepts/operating-modes/).
:::

> **This schema tracks the code.** The field lists above are captured faithfully
> from the reference at the time of writing, but the YAML schema is drift-prone —
> it follows `maxim/embodiment/sem.py` and `spec.py`, not this page. Treat
> [`embodiment_yaml_reference.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment_yaml_reference.md)
> in the repo as canonical when they disagree.

## Virtual entities

SEM is not a hardware protocol that happens to allow fiction — it is one
abstraction that treats both the same. A sword, an NPC, or a door is just an
Entity whose modulators are backed by software stubs (or a Cerebellum-backed
modulator with an LLM fallback) instead of a motor driver. The Cerebellum, the
[nucleus accumbens](/systems/nucleus-accumbens/), and the engram system learn
from these interactions exactly as they learn from a joint.

A **durability-sensing sword** reads `durability`, `sharpness`, and `weight`;
acts through `slash`, `parry`, `throw`, `sharpen`, and `repair`; and fails by
`shatter` (durability below `0.1`) or `dulled` (sharpness below `0.15`). The
Cerebellum learns that swinging a damaged blade at a stone golem drops durability
by about `0.15` per swing — using the same Rescorla-Wagner update it applies to a
physical joint's angle.

```yaml
world_entities:
  - name: rusty_sword
    entity_type: weapon
    sensors:
      durability: {unit: ratio, range: [0, 1], initial: 0.3}
    modulators:
      combat:
        affordances:
          slash: {params: {target: str}, description: "Slash at target"}
    failure_modes:
      - name: shatter
        trigger: {field: durability, op: "<", value: 0.1, pain: 0.6}
```

A **trust-sensing ferryman** reads `trust`, `mood`, and `health`; acts through
`speak`, `offer_payment`, `threaten`, and `punch`; and fails by `hostility`
(trust below `0.1`) or `refusal` (mood below `-0.5`). Threatening him is,
mechanically, the same kind of event as overextending a joint: an affordance that
drives a sensor toward a failure threshold and teaches the agent to expect the
consequence.

## Imagination: SEM specs the LLM writes mid-simulation

Hand-authored YAML and the [component library](/embodiment/component-library/)
only cover what someone bothered to write down. A simulation does not stay
inside that boundary — the narrator mentions a rusty iron gate, and no
`environments/rusty_iron_gate` exists. The **imagination system**
(`maxim/imagination/`) closes that gap: when the agent keeps encountering an
entity that has no SEM component, a language model designs one on the spot,
and it enters the scene as a live, session-scoped SEM entity — same sensors,
affordances, and failure modes as anything you would have written by hand.

### The trigger pipeline

`ImaginationTrigger.process_percept()` runs in the agent loop after each state
update, on every percept the agent receives:

1. **Extract.** Lightweight noun-phrase heuristics (regex patterns like *"you
   see a …"* / *"a … blocks"*, plus an indicator-word scan — no spaCy) pull
   SEM-relevant phrases out of the narration. Abstract concepts, body parts,
   and clothing are filtered out; only things that could plausibly be entities
   survive — creatures, weapons, items, vehicles, NPCs, environmental features.
2. **Recognize.** Each phrase is checked against the session's
   `ImaginationCache`, then the `ComponentIndex` (alias and embedding lookup).
   A match on an existing component doesn't design anything — it *instantiates*
   that component as a live **scene entity**: observable through `sense` /
   `sense_presence`, but exposing no affordance tools of its own. The agent
   acts on scene entities with its own body's tools.
3. **Accumulate.** A truly novel phrase has to earn its design call. Mentions
   are counted by head noun — "fire-breathing dragon", "large dragon", and
   "the dragon" all accumulate under *dragon* — and imagination fires only
   once the phrase crosses the mention threshold (two by default).
4. **Gate.** Two checks stand before the LLM call. The default network's
   arousal gate allows imagination only during low-arousal idle states — the
   bio-metaphor in the code is blunt: *you don't daydream while fighting*. And
   the energy budget is consulted — if LLM energy is critical, the design is
   skipped.
5. **Design.** `ImaginationDesigner.imagine()` infers an entity type and a body
   **archetype** (quadruped, serpentine, avian, humanoid, machine, vehicle,
   environmental) from the phrase, then calls the `EntityDesigner` — an LLM
   whose system prompt teaches the full SEM JSON schema: sensors with
   `unit`/`range`/`initial`, modulators grouping typed affordances, failure
   modes with pain intensities, and a list of synonyms for future lookups. The
   archetype provides a body-part scaffold the generated spec inherits when the
   LLM leaves structure out. The result gets *quick validation only* — schema
   and sensor sanity checks, not the full foundry gauntlet, which is too slow
   for real time — plus a dedup check against the index (a near-duplicate at
   ≥ 0.80 similarity reuses the existing component instead).
6. **Register.** A validated spec is registered as an **ephemeral component**
   with `provenance: "imagined"`, added to the `ComponentIndex` under its
   synonyms, and placed in the entity map as an observe-only scene entity. Its
   affordance names are decomposed into concepts (`fire_breath` → *fire*,
   *breath*) and encoded through the EC → ATL →
   [NAc](/systems/nucleus-accumbens/) substrate, which is what a shared *fire*
   node across two entities would be built on. The cross-entity reward transfer
   itself is a design goal, not a measured result — the nearest evidence measures
   *sentence* decomposition for cross-modal recall, and the behavioural-transfer
   claim is explicitly withheld in the engine's own ledger.

### Scene manifests: imagination before turn one

The [simulation](/guides/simulation/) orchestrator also uses the pipeline
proactively. Before the first sim turn, it hands the scene manifest — the
natural-language description of the setting — to `process_manifest()`, which
resolves every entity it names. Because pre-triggering is a deliberate
orchestrator action rather than a reactive mid-sim response, it bypasses the
mention threshold and both gates; known components resolve instantly from the
index, and truly novel ones draw from a capped budget (at most 5 LLM designs,
8 entities total). The agent wakes up in a scene that is already populated.

### Imagined provenance

Imagined entities are session-scoped, and the learning they produce is marked
as such. The trigger tracks every imagined ref, and at session end the
[nucleus accumbens](/systems/nucleus-accumbens/) retroactively tags causal
links involving those entities with `imagined=True`, then halves their
confidence. The agent keeps what it learned from an imagined dragon — just at
reduced weight compared to links earned against real (or hand-authored)
entities.

The whole system sits behind one master switch: set
`MAXIM_DISABLE_IMAGINATION=1` to turn off every imagination surface, including
the manifest pre-trigger.

## Running a body

For a single entity that already exists in the component library, one CLI flag
gives a live agent a body:

```bash
# Validate that the ref resolves before spinning up the agent
maxim doctor --embodiment weapons/rusty_sword

# Run an agent whose body is the rusty sword
maxim --llm mistral-7b --embodiment weapons/rusty_sword
```

`maxim doctor` is the fast check. On success it confirms the ref resolves to an
entity; on a typo it lists the available components, same-category first, capped
at 20 per category:

```
$ maxim doctor --embodiment weapons/nonexistent_sword
━━━ Embodiment ━━━
  ✗ Embodiment ref: Component ref 'weapons/nonexistent_sword' not found
    → Components in 'weapons':
    →   weapons/combat_knife
    →   weapons/rusty_sword
    →   ...
```

Behind the flag, the agent bootstrap instantiates the entity through the
`ComponentRegistry`, wraps it in an `Embodiment`, and calls
`generate_tools_for_entity` to register the affordance tools — for the sword,
`rusty_sword_slash`, `rusty_sword_parry`, `rusty_sword_throw`,
`rusty_sword_sharpen`, `rusty_sword_repair`. When the agent slashes with a
near-shattered blade, `evaluate_failures()` fires `shatter`, publishes pain, and
the accumbens forms a negative causal link on `tool:rusty_sword_slash` so the
next turn's prediction warns against it.

The flag works in simulation too — `--embodiment` composes with `--sim` across
its modes, and with the curation flags (`--auto-curate`, `--no-curate`) when you
want the run to add or freeze the component library.

**Where bodies live.** Refs resolve against the bundled component tree at
`_data/components/`, with user-local components under `~/.maxim/components/`.
Ad-hoc scenario specs live as loose files under `scenarios/embodiment/` (for
example `robot_arm_3dof.yaml`, `sword_npc_demo.yaml`).

**Multi-entity bodies** — a full robot arm with child joints — are not loadable
through the single `--embodiment` flag. Load those in code, which is also how you
verify tool generation:

```python
from maxim.embodiment.spec import load_spec
from maxim.embodiment.body import Embodiment
from maxim.embodiment.tool_bridge import generate_tools_for_entity
from maxim.tools.registry import ToolRegistry

spec = load_spec("scenarios/embodiment/my_robot.yaml")

registry = ToolRegistry()
tools = generate_tools_for_entity(spec.root_entity, registry)
print(f"Generated {len(tools)} tools: {[t.name for t in tools]}")

emb = Embodiment(spec.root_entity)
print(emb.format_body_state_for_prompt())   # inspect current sensor state
print(emb.evaluate_failures())               # list any firing failures
```

Printing the generated tool names is the direct way to confirm a spec produced
the `sense_`, `read_`, and affordance tools you expected.

## How it connects

The SEM protocol is the front door to Maxim's embodied learning; the systems
behind it are where the interactions turn into behavior.

- The [Cerebellum](/systems/cerebellum/) consumes SEM outcomes — every affordance
  call is a chance to learn a forward model of what that action does to a sensor,
  so routine actions stop needing the LLM.
- The [fear circuit](/systems/fear-circuit/) is where failure modes land: a fired
  trigger becomes pain, pain becomes a negative causal link, and the agent starts
  anticipating harm before it acts.
- The [component library](/embodiment/component-library/) is the shelf of
  prebuilt entities — the `weapons/`, `bodies/`, and `creatures/` refs the CLI
  resolves against.
- The [embodiment overview](/embodiment/overview/) frames where SEM sits in the
  larger picture of giving Maxim a body.

## Going deeper

The two canonical references live in the repo and lead the code:

- [`embodiment_guide.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment_guide.md)
  — the SEM protocol manual: architecture, the Cerebellum and motor-program
  phases, virtual entities, and the production run path end to end.
- [`embodiment_yaml_reference.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment_yaml_reference.md)
  — the field-by-field YAML schema, and the authority when this page drifts.
