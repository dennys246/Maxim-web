---
title: Nucleus accumbens
description: Maxim's NAc learns causal links between actions and outcomes, updates them with Rescorla-Wagner reward prediction, and surfaces those expectations before the next action runs.
---

The NAc is the reward-learning layer of Maxim's bio-inspired cognitive
architecture. It answers one question, repeatedly: *last time I did this, in
roughly this situation, what happened — and was it good?*

As with every subsystem name here, "nucleus accumbens" is a label for a role,
not a claim of biological fidelity. The NAc is a table of causal links updated
by a Rescorla-Wagner rule. There is no dopamine, no spiking, no basal ganglia
loop. What is borrowed is the division of labour: reward learning kept separate
from episodic storage ([Hippocampus](/systems/hippocampus/)) and from semantic
abstraction ([ATL](/systems/anterior-temporal-lobe/)).

## What it does

The NAc does four things, in a loop:

1. **Observes** action-outcome pairs as they happen.
2. **Learns** the strength of each event → outcome relationship.
3. **Predicts** the likely outcome of a candidate action before it runs.
4. **Surfaces** that prediction to whoever is about to decide.

That fourth step deserves a caveat up front, because it is where honest framing
matters most. In the shipped default configuration the NAc does not *choose*
anything. Its predictions are assembled into `StructuredContext.causal_context`
by `MemoryAgent._build_causal_context()` and shown to the LLM as text — learned
expectations like "stealth past guard → success (confidence=0.7)". The LLM then
decides. The [fear circuit](/systems/fear-circuit/) can hard-gate an action on a
negative prediction, which is a real veto, but the ordinary path is advisory.
The NAc biases choices by informing them, not by making them.

Two runtime sources feed it:

- **Tool outcomes.** Every tool execution in the agent loop
  (`runtime/agent_loop.py`) calls `nac.observe()` through `_record_outcome()`.
  This is how the NAc learns "tool X in context Y → success/failure."
- **Pain events.** The PainBus publishes pain signals to an NAc subscriber
  (`proprioception/pain_bus.py:create_pain_nac_subscriber`). This is how it
  learns "action X → pain", which is the basis for avoidance.

## How it works

### CausalLink

The unit of learning is a `CausalLink` — one event type paired with one outcome,
plus the state needed to weight and age it.

```python
@dataclass
class CausalLink:
    event_type: str           # "tool", "movement", "speech"
    event_signature: str      # "internet_search", "look_at:dy=45"
    outcome_type: str         # "tool_result", "pain_signal"
    outcome_signature: str    # "success", "excessive_velocity"
    outcome_valence: Valence  # POSITIVE, NEUTRAL, NEGATIVE

    # Temporal relationship
    temporal_delta: TemporalDelta  # Time between event and outcome

    # Learning state
    predicted_value: float    # 0.0-1.0, learned via Rescorla-Wagner (V)
    confidence: float         # How reliable is this link?
    observation_count: int    # Number of observations

    # Context matching
    event_context: dict[str, Any]  # Conditions when this link applies
```

`Valence` is a three-way enum — `POSITIVE`, `NEUTRAL`, `NEGATIVE` — standing in
for reward and punishment.

### The Rescorla-Wagner update

Link strength converges by the standard Rescorla-Wagner rule:

```
ΔV = α(λ - V)
```

Where `α` is the learning rate (`NACConfig.base_learning_rate`, default `0.2`),
`λ` is the actual outcome valence, and `V` is the current link strength. Each
observation moves `V` a fixed fraction of the way toward what actually happened.
Large surprises move it a lot; confirmations barely move it at all. That
prediction error — the `(λ - V)` term — is the *reward prediction error* (RPE)
the rest of the system reads.

### Decay

Links that stop being observed lose strength. `NACConfig.decay_interval_hours`
(default `24.0`) sets the window: links not re-observed within it weaken, so
stale predictions from old experience fade rather than persisting at full
confidence forever. The repo documents the behaviour and the knob, not the exact
decay curve.

### Context matching

A prediction is not just a signature lookup. Each link records the context it was
learned in, and predictions are weighted by how well the current context matches:

```python
context = {
    "mode": "exploration",     # Current operating mode
    "time_of_day": "morning",  # Temporal context
    "goal": "find_object",     # Current goal
}
```

`NACConfig.context_similarity_threshold` (default `0.5`) sets the floor for a
link to count at all; better-matching links are weighted higher. The returned
`OutcomePrediction` reports the match explicitly:

```python
@dataclass
class OutcomePrediction:
    event_signature: str          # What was queried
    predicted_outcome: str        # Expected outcome signature
    predicted_valence: Valence    # POSITIVE/NEUTRAL/NEGATIVE
    confidence: float             # 0.0-1.0
    contributing_links: list[str] # CausalLink IDs that informed this
    context_match: float          # How well context matches
```

Predictions below `min_confidence_threshold` (default `0.3`) are not returned.
`temporal_window_seconds` (default `300.0`) caps how long after an event an
outcome can arrive and still be credited to it.

### Reward-modulated recognition

Beyond action selection, the NAc modulates *perception*. When a reaction fires,
it credits recently-active [ATL](/systems/anterior-temporal-lobe/) nodes and
lowers the [EC](/systems/entorhinal-cortex/) pattern-completion threshold for
them — a rewarded concept becomes easier to recognise next time.

```python
nac.update_eligibility("agent-1", "node-abc", activation=0.85)
credited = nac.distribute_reward("agent-1", reward=1.0)
overrides = nac.get_threshold_overrides("agent-1")
# → {"atl-node-abc": 0.29}  (base 0.44 - bias)
```

Eligibility traces are set when a percept completes to a substrate node; when
reward arrives, credit is distributed to eligible nodes in proportion to their
activation strength. The bias is bounded and decays — `reward_bias_alpha` 0.15,
`reward_bias_decay_tau` 50.0 ticks, `max_reward_bias` 0.20 — to stop recognition
widening without limit.

One asymmetry is worth stating precisely, because it is easy to assume the
opposite. The ReactionBus subscriber maps `Valence.NEGATIVE` to
`reward = -intensity` and `Valence.POSITIVE` to `reward = +intensity`, but
`credit_node()` clamps at zero: **this bias only ever widens the recognition
radius, never narrows it.** Negative experience shapes causal links and gates
actions; it does not make the agent perceptually blind to the thing that hurt it.

## Across sessions

NAc state is a file, and that is the whole trick behind cross-session learning.
Links persist to `~/.maxim/util/nac_state.json` by default; simulation runs also
write `aut_nac.json` into their session directory under
`~/.maxim/sim_reports/{session_id}/`, holding causal links and reward biases.
That file is the cross-session payload. Nothing is fine-tuned and no gradients
are involved — the experience lives in the substrate snapshot.

You can inspect what a session actually learned by diffing two session
substrates:

```bash
maxim roy diff sim_20260606_140510_z9y8 sim_20260606_141203_a1b2
```

The NAc section reports `reward_bias L2`, `goal_reward_bias L2`,
`cluster_reward_bias L2`, and a causal-link count delta. Add `--json` for
machine-readable output. The signal that actually demonstrates aversion learning
is a nonzero `reward_bias L2` with **negative deltas on the hazard's action keys**
(for example `grip:rusty_sword: Δ -0.3120`). `cluster_reward_bias` only populates
when the substrate path was enabled with `MAXIM_SUBSTRATE_PATH=1`.

To carry a learned substrate into a new run, `--resume-sim <session_id>` restores
`aut_hippocampus.json` and `aut_nac.json` before the session starts.

Be careful about what that proves. Persistence and recall are the earned claims:
the links carry over and the resumed agent demonstrably recalls the prior
experience. Whether the recalled context *changes behaviour* is separate — a
strong LLM prior can override the carried aversion, and the repo's own 1.0
findings measured exactly that across four frontier models. Treat a drop in the
`Pain:` count on resume as a measurement, not a guarantee.

To wipe NAc state: `maxim --clear-memory nac`.

## Substrate-primary mode (experimental)

There is a phased plan to let the NAc score and select actions *directly*,
without the LLM in the decision path. `NAc.recommend_action()` exists today and
has unit tests, but the end-to-end wiring does not ship as a default.

```python
action = nac.recommend_action(
    agent_id="my_infant",
    available_tools=["pick_up_food", "examine_rock", "rest"],
    current_drives={"hunger": 0.8},
)
```

It scores each available tool from causal-link confidence (positive links add,
negative links subtract, weighted lower to permit exploration), plus a capped
per-agent reward-bias nudge, plus a drive-relevance heuristic used only as a
cold-start fallback. The highest scorer above `min_confidence` wins; ties resolve
by tool name. If nothing scores high enough, the method returns `None` — it never
falls back to random selection.

**Status.** Phase −1 (the method itself) is complete and shipped. Phase 0 —
end-to-end wiring, cradle harness, telemetry — is *planned*, as are phases 1
through 4 (vocabulary-constrained mode, symbol binding, a sequence model, and a
pretrained-vs-grounded comparison). The `--aut-mode substrate-primary` flag is
opt-in and slated for v1.1; `--aut-mode llm-primary` remains the user-facing
default indefinitely. Read this section as a roadmap with one shipped
foundation, not as a feature you can turn on today and expect to work end to end.

## How it connects

```
   pain / harm signals            movement outcomes
   (fear circuit,                 (cerebellum-adjacent
    proprioception PainBus)        motor commands)
              │                            │
              ▼                            ▼
        ┌───────────────────────────────────────┐
        │                NAc                    │
        │  CausalLink table · ΔV = α(λ - V)     │
        │  reward bias · eligibility traces     │
        └───┬───────────┬──────────┬────────────┘
            │           │          │
   RPE      │  valence  │  reward  │  threshold
 magnitude  │  tagging  │ signals  │  overrides
   (0.35)   │           │          │
            ▼           ▼          ▼
      Significance  Hippocampus   ATL        EC
       weighting     episodes   promotion  recognition
```

- **[Hippocampus](/systems/hippocampus/)** — episodes carry valence, and the NAc
  queries similar episodes for inference when `enable_hippocampus_queries` is on.
  The episode-level valence shift is one of the things `maxim roy diff` measures.
- **[ATL](/systems/anterior-temporal-lobe/)** — NAc reward signals gate which
  recurring patterns are worth promoting to semantic concepts. The
  `SemanticPromoter` draws candidates from NAc rewards alongside StatisticianAgent
  patterns.
- **[EC](/systems/entorhinal-cortex/)** — per-node reward bias lowers the
  pattern-completion threshold for rewarded nodes.
- **[Fear circuit](/systems/fear-circuit/)** — reviews actions against NAc pain
  history and negative predictions, and can block before execution. This is the
  one path where an NAc prediction directly stops an action.
- **[Cerebellum](/systems/cerebellum/)** — motor pain signals recorded by the NAc
  inform which movement signatures to avoid, complementing the cerebellum's
  error-driven gain calibration below the agent loop.
- **[SCN](/systems/suprachiasmatic-nucleus/)** — supplies temporal context for
  when a pattern applies, plus oscillator feedback: event-type phase tracking
  pre-activates eligibility traces for events predicted to be imminent.
- **[Memory systems](/memory/overview/)** — `rpe_magnitude` is the top-weighted
  significance heuristic at 0.35, so NAc surprise is the single largest driver of
  what gets staged for consolidation.

In Hivemind bundles, NAc links can be merged between peers via
`hivemind/merge.py::nac_merge`, using Bayesian aggregation with provenance
tracking.

## Going deeper

- [Systems overview](/systems/overview/) — the full substrate map and wiring
- [Architecture](/concepts/architecture/) — the agent pipeline around it
- [Memory systems](/memory/overview/) — tiers, decay, consolidation policy
- [`docs/decisions.md`](https://github.com/dennys246/Maxim/blob/main/docs/decisions.md) — the NAc reference: config, API, learning algorithm
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md) — store protocols and NAc's coupling to the memory layers
- [`docs/user/cross-session-learning.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/cross-session-learning.md) — the end-to-end walkthrough and `maxim roy diff`
- [Substrate-primary mode](https://www.dennyschaedig.com/maxim/substrate-primary) — the phased plan for NAc-driven action selection
