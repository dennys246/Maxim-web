---
title: Audio behaviors
description: The aspirational orient-to-sound reflex — an honest account of why it is not yet buildable, the generic-DN additions it needs, and its intended design.
---

> **Status: not yet buildable.** There is no working audio behavior in Maxim
> today. This page documents an *intended* reflex and the specific plumbing it
> still needs, so that when it is built the seams are already understood. Nothing
> below should be read as a shipped feature. Where it describes an API or a code
> shape, that is the *design*, not something you can run.

Unlike a vision behavior — which, because the whole reactive path is built around
visual detections, really is "just one `Behavior`" (see
[Vision behaviors](/research/behaviors/vision/)) — an audio-driven behavior needs
**five generic Default-Network additions** the visual path already has for free.
This page records exactly what is missing and why, so the audio orienting reflex
(running the Exp 45 learned turn-toward-sound policy from the
[experiments](/research/experiments/)) can be built without re-discovering the
seams. Read the [behaviors overview](/research/behaviors/overview/) first for the
general contract.

The package is `pymaxim` (imported as `maxim`).

## Why audio is not symmetric with vision

The reactive action loop was built entirely around **visual detections**. Three
structural facts make an audio reflex fundamentally different from a vision
behavior:

1. **The tick is gated on visual detections.** The tick returns early at
   `if not detections: return`, *before* behaviors are evaluated. Orienting to a
   sound is precisely the *no-visual-detection* case — a voice off to the side,
   out of frame — so an audio behavior would essentially never run.
2. **`BehaviorState` has no audio field.** `evaluate(detections, state)` is
   handed YOLO detections only. There is no channel carrying a
   direction-of-arrival (DoA) azimuth into a behavior.
3. **The motor and gate machinery is pixel-shaped.** There is no body-turn
   dispatch branch that ships a head matrix, and the salience / IOR gates work in
   `(u, v)` pixel space and no-op on target-less proposals.

None of these is a flaw in the audio design — they are the cost of being the
*first* non-visual reflex, and each addition benefits every future non-visual
behavior.

## The five additions (A0–A4)

Each of these is generic Default-Network work that must land **before** an audio
behavior can exist. This table is a map of what does *not* exist yet.

| # | addition | why it's needed | layer |
|---|---|---|---|
| **A0** | a `src/maxim/` home for `az_bin` / `decision_boundary` / the `.meta.json` sidecar loader / orient-action loading | those helpers live only under `scripts/`, which `src/` can't import; the reflex has no way to bin a live azimuth the way the policy learned it | generic |
| **A1** | a non-visual cue channel into the tick — un-gate behavior eval on audio-only ticks and push the gated azimuth (and an NAc reference) into behaviors via setters | the tick discards no-detection frames; there is no seam for an azimuth to reach a behavior; the DoA reader is a **blocking** HTTP call so it can't be pulled inside `evaluate()` | generic |
| **A2** | a non-blocking `turn_body` motor branch that ships a head matrix | no `turn_body` branch exists; reusing `turn_around` counter-rotates the head (mics don't turn) **and** blocks the DN thread 5–8 s | generic dispatch + Reachy-specific controller method |
| **A3** | isolate the reflex's NAc learning (a dedicated `agent_id` and a separate NAc instance or a filtered namespace) | crediting at DN rate on the shared NAc would flood the LLM's tool-value prompt, and the LLM's history would perturb the reflex's action scores | generic |
| **A4** | register the bearing into an azimuth IOR map so novelty / IOR gating fires | target-less proposals skip the salience / IOR gates — "don't chase every cough" is silently absent otherwise | generic |

These mirror blocking findings from an internal three-lens review; the detailed
code anchors live in the source plan and review, linked at the bottom.

## The intended behavior shape

**This code does not run today.** Once A0–A4 exist, the behavior itself is small
— a sibling to the visual `OrientingResponse`, intended to live at
`default_network/behaviors/audio_orienting.py`:

```python
class AudioOrienting(Behavior):        # INTENDED — not shipped
    name = "audio_orienting"
    base_priority = 0.8

    # az + nac are PUSHED in by DN each tick (A1) — never pulled here (<10 ms, non-blocking)
    def evaluate(self, detections, state):
        az = self._latest_az                      # set by DN from the DoA source (A1)
        if az is None or abs(az) <= self._band:
            return None
        bin = az_bin(az, self._band, self._boundary)   # helpers from src/ (A0)
        rec = self._nac.recommend_action(         # dedicated reflex NAc / agent_id (A3)
            agent_id=self._reflex_agent_id,
            available_tools=self._orient_affordances,   # e.g. ["turn_left", "turn_right", ...]
            current_cluster_id=bin,
        )
        if rec is None:
            return None
        action = rec["tool"]
        return self._create_proposal(
            action_type="turn_body",              # non-blocking dispatch, ships a head matrix (A2)
            target=self._bearing_target(az),      # spatial target so IOR gates fire (A4)
            yaw_delta=self._deltas[action] * sign,
            bin=bin, az_before=az,
        )
```

### Learning: credit that spans ticks

Orienting *adaptation* — learning how far to turn for a given bearing — is
intended to use an act-now-credit-later pending map: stash `(bin, action,
az_before)` on dispatch; on a later settled tick read `az_after` and reward the
policy by `|az_before| − |az_after|`; discard uncredited entries rather than
fabricate a direction.

**A bio-fidelity caveat that constrains the whole design:** this credit signal is
*error correction* (cerebellar territory), not dopaminergic reward. It suits the
**discrete**, binned policy — NAc reward-bias can re-rank a fixed set of action
deltas — but it *cannot* recalibrate **gain** (the same action yielding a
different change in azimuth), which is exactly the head-frame failure regime.
Continuous-gain adaptation belongs in the [Cerebellum](/systems/cerebellum/) and
is deliberately deferred.

## What *does* exist

To be precise about the boundary between shipped and aspirational: the **percept
source is shipped**. The off-robot DoA reader and the source builder already
exist — `build_reachy_audio_orienting_source(...)` and
`make_reachy_rest_doa_reader(...)` in
`maxim.embodiment.audio_localization` (the reader routes through
`maxim.utils.http` and accepts a `fetch` seam for offline tests). The Exp 45
policy itself is trained and usable **as-is** — no retrain is required.

What is missing is **A1**: the wiring that pulls an azimuth from that source once
per tick and pushes it into a behavior. Everything in the "five additions" table
above is still to be built. So the honest summary is: *the ears work and the
policy exists, but nothing connects them to a reflex yet.*

## Cross-modal note: the bearing is exteroceptive

Azimuth is an **allocentric world-bearing** (parietal / collicular), not
interoceptive homeostatic state. The reflex deliberately keys on the hand-binned
`az_bin` string rather than routing azimuth through the interoception encoder
(which would fold away the left/right sign). This is the bio-correct call and it
is why the Exp 45 policy is usable without retraining. A future learned
exteroceptive "audio" encoder is the principled long-term path but is out of
scope here.

## Inhibition and efference copy

Two more things the audio reflex will have to get right, neither of which exists
yet:

- **Inhibition is one-way.** A voluntary, LLM-driven head move should suppress
  the reflex, never the reverse (the antisaccade direction). That per-tool
  suppression hook does **not** exist today — currently only `turn_around`
  self-inhibits DN — so it is net-new wiring.
- **Efference copy is mandatory.** The reflex should be silent as to its
  *decision* (orienting is pre-attentive), but it *must* emit a self-motion
  signal — "the body turned Δyaw; the source is now centered" — into cognition,
  or the LLM will misread its own reflexive turn as the world moving.

## Where to go next

- [Behaviors overview](/research/behaviors/overview/) · [Vision behaviors](/research/behaviors/vision/)
- [Experiments](/research/experiments/) · [Fear circuit](/systems/fear-circuit/)
  · [Cerebellum](/systems/cerebellum/) · [Architecture](/concepts/architecture/)
  · [Reachy Mini guide](/guides/reachy-mini/)
- Source: the [audio behaviors doc](https://github.com/dennys246/Maxim/blob/main/docs/behaviors/audio_behaviors.md)
  and the [Default Network architecture doc](https://github.com/dennys246/Maxim/blob/main/docs/default_network.md).
