---
title: Vision behaviors
description: The shipped, detection-driven reflex path — gaze and orienting behaviors that read YOLO detections and propose pixel-targeted actions, with each behavior's exact parameters.
---

This is the **mature, shipped** behavior path. Every behavior in the Default
Network today is visual: it reads detections and proposes a gaze or motion
action, at the reactive thread's ~30 Hz and with no LLM in the loop. Read the
[behaviors overview](/research/behaviors/overview/) first for the general
`Behavior` contract, the `<10 ms` non-blocking rule, and how arbitration works;
this page covers the vision-specific input shape and the shipped behaviors with
their real parameters.

The package is `pymaxim` (imported as `maxim`); these behaviors live under
`maxim.default_network.behaviors`.

## Input: the detection dict

`evaluate(detections, state)` receives `detections: list[dict]` — YOLO
detections for the current frame. Producers don't always fill every key, so
access is defensive (`.get()`):

| key | meaning |
|---|---|
| `track_id` | persistent tracker ID (may fragment during head motion) |
| `class_id` | object class integer |
| `conf` | detection confidence |
| `bbox_xyxy` (or `bbox`) | `[x1, y1, x2, y2]` pixel box; center `u = (x1 + x2) / 2` |

The frame is **gated before behaviors run**: the tick returns early at
`if not detections: return`, so vision behaviors only ever see a non-empty
detection list. This is exactly why the current reactive layer is "visual-only"
— a modality that produces no detections (a sound off to the side) never reaches
behavior evaluation. That is the first blocker for the
[audio path](/research/behaviors/audio/).

## Targets are pixel coordinates — and they gate the proposal

Vision proposals carry `target=(u, v)` pixel coordinates. This matters beyond
aiming the gaze: the salience, inhibition-of-return (IOR, via a gaze history),
and fear gates all operate in pixel space and **short-circuit to "allow" when
`target` is falsy**. Because vision behaviors supply a real pixel target, they
get novelty and IOR gating *for free* — the robot doesn't keep re-fixating the
same spot. A behavior that omits the target loses that gating silently.

For tracking hysteresis once a behavior commits to a detection, use
`state.get_tracking_bonus((u, v))` and `state.record_tracking_target((u, v))`.

## Shipped behaviors

```text
priority
  0.95  StartleResponse   sudden peripheral appearance
  0.9   SocialAttention   faces / people
  0.8   OrientingResponse most novel object
  0.7   MotionTracking    moving objects
  0.3   TurnAround        body rotation at yaw limit
  0.2   IdleScan / ReturnToCenter
  0.1   Microsaccades
```

| behavior | file | what it does |
|---|---|---|
| `OrientingResponse` | `orienting.py` | look at the most novel object |
| `SocialAttention` | `social.py` | track people / faces |
| `MotionTracking` | `motion.py` | follow moving objects |
| `StartleResponse` | `startle.py` | react to sudden peripheral appearance |
| `TurnAround` | `turn_around.py` | rotate body when the head hits its yaw limit with interest beyond |
| `IdleScan` / `Microsaccades` / `ReturnToCenter` | `idle.py` | idle-time movement |

### OrientingResponse

Quickly orients to novel stimuli — the superior-colliculus analogue. It reads a
novelty tracker (pushed in via a setter) and fixates the most novel object.

```python
from maxim.default_network import OrientingResponse

orienting = OrientingResponse(
    novelty_tracker=novelty_tracker,
    novelty_threshold=1.2,
    min_confidence=0.4,
)
orienting.base_priority = 0.8
orienting.cooldown_seconds = 0.5
```

### SocialAttention

Prioritizes faces and people, with tracking hysteresis so it stays locked rather
than jittering between similar detections.

```python
from maxim.default_network import SocialAttention

social = SocialAttention(
    prefer_faces=True,
    tracking_hysteresis=0.1,
)
social.base_priority = 0.9
social.cooldown_seconds = 0.2
```

### StartleResponse

The highest-priority reflex — a rapid reaction to something appearing suddenly in
the periphery. Its 2-second cooldown is deliberately long so a single startle
doesn't monopolize the arbiter.

```python
from maxim.default_network import StartleResponse

startle = StartleResponse(
    peripheral_threshold=0.7,    # how far out counts as "peripheral"
    appearance_window=0.3,       # seconds — how sudden is "sudden"
    min_confidence=0.5,
    frame_size=(640, 480),
)
startle.base_priority = 0.95
startle.cooldown_seconds = 2.0
```

### IdleScan

Exploratory scanning when nothing is interesting, after an idle timeout.

```python
from maxim.default_network import IdleScan

idle = IdleScan(idle_timeout=5.0)   # seconds before scanning starts
idle.base_priority = 0.2
idle.cooldown_seconds = 0.5
```

### TurnAround — the closest precedent for a body-rotation reflex

`TurnAround` is the one shipped behavior that rotates the **body** rather than
just the head. It fires when the head is at its yaw limit and there is something
interesting beyond what the head can reach. Only horizontal yaw limits trigger it
— pitch limits don't, since body rotation is around the vertical axis. The turn
is slow and deliberate (5 ± 1 seconds) to look natural.

```python
from maxim.default_network.behaviors.turn_around import TurnAround

turn = TurnAround(
    yaw_threshold=0.85,       # trigger at 85% of yaw limit
    edge_threshold=0.15,      # detection within 15% of frame edge
    turn_angle=90.0,          # degrees to rotate the body
    base_duration=5.0,        # seconds for the turn
    duration_jitter=1.0,      # random ± seconds for a natural feel
    max_yaw=55.0,             # workspace yaw limit
    image_width=640,
)
turn.cooldown_seconds = 10.0  # don't turn too frequently
```

It is worth studying because it demonstrates two patterns *and* two live
pitfalls:

- **The setter pattern.** It needs the current head yaw, which isn't in
  `detections`, so DN pushes it in via `set_head_yaw()` each tick. Copy this
  shape for any external state a behavior needs.
- **The yaw sanity guard.** It ignores `|head_yaw| > 90°` as a corrupted
  (world-frame) reading — a scar from head-frame confusion. Any body-rotation
  behavior that reads head pose must know whether the reading is in world or
  body frame.
- **The dispatch pitfall.** Its proposal (`action_type="turn_around"`) routes to
  a motor call that **blocks the DN thread** for the full multi-second turn and
  dispatches `body_yaw` with **no head matrix** — which counter-rotates the head
  in world frame, so head-mounted sensors (camera, mics) don't actually turn.
  That is tolerable for a slow, rare "look behind me" gesture but is *wrong for a
  fast reflex* and wrong for anything that reads a head-mounted sensor afterward.
  A new body reflex should use a **non-blocking** dispatch that ships an explicit
  head matrix — do not reuse `turn_around`. This head-frame invariant is why the
  aspirational [audio orienting reflex](/research/behaviors/audio/) needs its own
  motor branch, and why continuous gain correction belongs in the
  [Cerebellum](/systems/cerebellum/).

## Adding a vision behavior

Because the vision path's `action_type`s, gates, and input gate all already
exist, a new **vision** behavior really is "just one `Behavior`":

1. Subclass `Behavior`; key off `class_id`, novelty, or `bbox` from
   `detections`.
2. Return `_create_proposal(action_type="look_at" | "track" | "scan",
   target=(u, v), ...)`.
3. `look_at`, `track`, and `scan` already have motor branches — no new dispatch
   needed.
4. Register the behavior in the DN `behaviors=[...]` list and export it from
   `behaviors/__init__.py`.
5. Offline-test with a synthetic `detections` list; assert the proposal,
   cooldown, and inhibition paths.

That simplicity is *not* true of a new modality — see
[Audio behaviors](/research/behaviors/audio/) for what a non-visual behavior has
to build first.

## Where to go next

- [Behaviors overview](/research/behaviors/overview/) · [Audio behaviors](/research/behaviors/audio/)
- [Experiments](/research/experiments/) · [Fear circuit](/systems/fear-circuit/)
  · [Cerebellum](/systems/cerebellum/) · [Architecture](/concepts/architecture/)
  · [Reachy Mini guide](/guides/reachy-mini/)
- Source: the [vision behaviors doc](https://github.com/dennys246/Maxim/blob/main/docs/behaviors/vision_behaviors.md)
  and the [Default Network architecture doc](https://github.com/dennys246/Maxim/blob/main/docs/default_network.md).
