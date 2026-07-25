---
title: Systems overview
description: A map of Maxim's bio-inspired subsystems and, more importantly, how the MemoryHub and CrossLayerGraph wire them together at runtime.
---

Maxim is a bio-inspired cognitive architecture. Its subsystems are named after
brain structures — Hippocampus, NAc, EC, ATL, SCN, Angular Gyrus — because those
names describe what each component is *for*, not because the code claims
biological fidelity. A "bio-system" here is an engineering structure whose
division of labour was borrowed from neuroscience: episodic storage kept
separate from semantic abstraction, reward learning kept separate from
retrieval, timing kept separate from content. The borrowing is at the level of
architecture, not mechanism. There are no spiking neurons in the Hippocampus
module, and the NAc is a table of causal links updated by Rescorla-Wagner, not a
model of dopaminergic signalling. The names are load-bearing as *labels for
roles*, and that is all they are meant to be.

If you want the agent pipeline — PerceptionAgent, ExecAgent, FearAgent, the
layered one-way dependency rules — that lives in
[Architecture](/concepts/architecture/). This page is the substrate underneath
it, and specifically the wiring between substrate parts. For the storage-side
detail (tiers, decay, consolidation policy) see
[Memory systems](/memory/overview/).

## The map

| System | Anatomical name | What it does | Page |
| --- | --- | --- | --- |
| Hippocampus | Hippocampus | Stores episodic memories — full perception → decision → action → outcome cycles — plus the associative graph between them | [Hippocampus](/systems/hippocampus/) |
| EC | Entorhinal Cortex | Similarity routing and indexing: MinHash/LSH plus optional neural semantic embeddings | [EC](/systems/entorhinal-cortex/) |
| ATL | Anterior Temporal Lobe | Semantic concepts, entities, and typed relationships distilled from episodes | [ATL](/systems/anterior-temporal-lobe/) |
| NAc | Nucleus Accumbens | Causal links and reward prediction errors; predicts outcomes before actions run | [NAc](/systems/nucleus-accumbens/) |
| SCN | Suprachiasmatic Nucleus | Temporal rhythm indexing, so memories can be queried by time-of-day pattern | [SCN](/systems/suprachiasmatic-nucleus/) |
| Angular Gyrus | Angular Gyrus / IPS | Mathematical and statistical cognition — fast IPS screening, slow precise confirmation | [Angular Gyrus](/systems/angular-gyrus/) |
| Cerebellum | Cerebellum | Motor learning and forward models; error-driven gain calibration below the agent loop | [Cerebellum](/systems/cerebellum/) |
| Fear circuit | Amygdala (modeled) | Harm prediction and action review before execution | [Fear circuit](/systems/fear-circuit/) |

**On the count.** The repo describes `integration/memory_hub.py` as the
coordinator that "wires all 11 bio-systems together," and names them:
Hippocampus, ATL, NAc, SCN, EC, plus the Salience, Attention, Fear, Spatial,
Planning, and Escalation bridges. Eight systems get pages here. Five of the
hub's eleven — Salience, Attention, Spatial, Planning, Escalation — are
*bridges*: caching adapters that load from the Hippocampus at session start and
then serve enrichment during the loop. They are documented as bridges rather
than as systems, and the attention and salience docs are currently archived in
the repo pending a rebuild. Conversely, two systems with pages here — Angular
Gyrus and Cerebellum — are not part of the hub's eleven at all. Angular Gyrus is
a peer memory layer reached through the math bridge; the Cerebellum sits below
the agent pipeline in the embodiment layer and never touches the hub.

## How they connect

Two structures do almost all of the connecting.

**The MemoryHub is the coordinator, not a store.** It holds no memories itself.
It routes perception, decision, action, and outcome events to the right
subsystem, manages session start/end lifecycle (including shutting down the
Hippocampus capture thread), exposes a single `on_cycle()` entry point for the
agent loop, and coordinates sleep consolidation across systems. It has no lock
of its own — it delegates to each subsystem's lock.

Its active-loop query surface is deliberately thin, and most of it is served
from bridge caches rather than from live stores:

```
MemoryHub.recall_concepts()          → atl.recall()               [ATL read]
MemoryHub.recall_with_knowledge()    → cross_layer_activation()   [CrossLayerGraph read]
MemoryHub.enrich_salience(dets)      → salience_bridge cache      [cache, no hippocampus]
MemoryHub.get_plan_templates(goal)   → planning_bridge cache      [cache, no hippocampus]
MemoryHub.get_spatial_boosts(goal)   → spatial_bridge cache       [cache, no hippocampus]
MemoryHub.get_escalation_threshold() → escalation_bridge cache    [cache, no hippocampus]
```

**The CrossLayerGraph is the wiring between layers.** Where the Hippocampus has
its own internal associative graph linking episode to episode, `memory/cross_layer.py`
maintains bidirectional edges *across* systems — an episode to a concept, an AG
record to a concept, an SCN rhythm to a memory. Edge types are typed:
`INSTANCE_OF` (episode → concept), `DERIVED_FROM` (concept → episodes),
`QUANTIFIES` (AG record → concept), `STATISTICALLY_CONFIRMS` (AG → concept),
`COMPUTED_FROM` (AG → layer data), and `TEMPORALLY_CORRELATES` (SCN → memory).
Spreading activation traverses these edges with configurable decay and depth.

Edge weight is a fixed blend of three similarity terms:

```
weight = 0.6 * perceptual_overlap
       + 0.25 * goal_overlap
       + 0.15 * temporal_proximity
```

The same 0.6 / 0.25 / 0.15 weighting appears inside the Hippocampus when
`_form_associations()` creates bidirectional `ASSOCIATES` edges between similar
episodes. Perceptual overlap dominates by design: what you saw matters more than
what you were trying to do, which in turn matters more than when it happened.

### The wiring diagram

```
                        ┌──────────────────────────┐
   percept ────────────►│      MemoryHub           │◄──── on_cycle()
                        │  (coordinator, no store) │
                        └────────────┬─────────────┘
        routes perception / decision / action / outcome events
                                     │
   ┌────────────────┬────────────────┼───────────────┬────────────────┐
   ▼                ▼                ▼               ▼                ▼
┌────────┐     ┌────────┐      ┌────────┐      ┌────────┐      ┌───────────┐
│  Hip-  │     │  ATL   │      │ Angular│      │  NAc   │      │    SCN    │
│pocampus│     │semantic│      │ Gyrus  │      │ causal │      │ temporal  │
│episodic│     │concepts│      │  math  │      │ + RPE  │      │  rhythm   │
└───┬────┘     └───┬────┘      └───┬────┘      └───┬────┘      └─────┬─────┘
    │ RWLock       │ RWLock        │ RWLock        │                 │
    │ (writer-     │               │               │                 │
    │  priority)   │               │               │                 │
    │              │               │               │                 │
    │  capture callback chain      │               │                 │
    ├──────────────────────────────┼───────────────┼─────────────────┤
    │      ▼                       │               │                 │
    │  ┌────────┐  schedule_embedding (async, own thread pool)       │
    │  │   EC   │◄─────────────────┘                                 │
    │  │  LSH + │                                                    │
    │  │ neural │                                                    │
    │  └────────┘                                                    │
    │                                                                │
    └────────────┬───────────────────────────────────────────────────┘
                 ▼
        ┌──────────────────┐        edges: INSTANCE_OF, DERIVED_FROM,
        │  CrossLayerGraph │        QUANTIFIES, STATISTICALLY_CONFIRMS,
        │  0.6 / 0.25/0.15 │        COMPUTED_FROM, TEMPORALLY_CORRELATES
        └──────────────────┘
                 ▲
                 │  written at session end only
        ┌──────────────────┐
        │ SemanticPromoter │◄── candidates from NAc + StatisticianAgent
        └──────────────────┘    (IPS randomness gate → ATL.find_or_create)

  Off the hub, below the pipeline:
        Fear circuit  ── reviews actions before execution (NAc pain history)
        Cerebellum    ── calibrates motor commands after they leave the loop
```

### Capture, indexing, consolidation

The end-to-end flow of a memory has three stages.

**Capture.** `hippocampus.capture()` (via `capture_from_loop()` in the agent
loop) stores the record, builds the index, checks promotion thresholds, forms
associations, then fires the capture callback chain.

**Indexing.** Three indices are built off the same record, each answering a
different question:

```
Perception / Action / Decision
          ↓
    Hippocampus.capture()
          ↓
    ┌─────┴─────┐
    │ Hash keys │ → O(1) lookup by goal, tool, object, person, success, mode
    │ SCN bins  │ → temporal query ("what usually happens at this hour")
    │ EC embed  │ → semantic search across synonyms
    └───────────┘
          ↓
    StateStore (content-addressed snapshot cache)
          ↓
    Sleep consolidation
```

**Consolidation.** At session end, `hippocampus.sleep()` promotes, compresses,
and prunes. Promotion to `LONG_TERM` requires salience > 0.9, novelty > 0.9, a
successful user interaction, `access_count >= 5`, or use-based
`promotion_pressure >= 3.0`. Old records compress to `CompressedMemory`;
low-retention records are removed, with graph edges and deletion callbacks
cleaned up automatically. Then the `SemanticPromoter` collects candidates from
its `PromotionSource` instances (NAc rewards, StatisticianAgent patterns),
applies the IPS randomness quality gate, calls `ATL.find_or_create()`, and
creates the cross-layer edges linking the new concept back to its source
records. ATL and Angular Gyrus consolidate, all three layers save.

## A worked trace

Follow one percept from camera to disk.

1. **Perception.** The PerceptionAgent builds a `Percept` with salience and
   novelty scores. `MemoryHub.enrich_salience()` adjusts detection salience from
   the salience bridge's cache — no Hippocampus read.
2. **Formation begins.** The MemoryAgent calls `_begin_memory_formation()`,
   creating a `FORMING` entry holding Perception and Context. `FORMING` entries
   are eviction-protected.
3. **Prediction.** The `PatternCompleter` (wired in by the ATL) matches concepts
   against the percept's objects, people, and goal tokens; loads linked episodes
   via `concept.memory_refs["hippocampus"]`; and returns `PredictedOutcome`
   objects enriched with per-concept `MathContextEntry` data from the Angular
   Gyrus. The NAc contributes predicted outcomes with valence and strength.
4. **Context assembly.** `memory.build_context()` pulls relevant memories from
   the MemoryAgent's *own* association index, then reads `atl.recall()`,
   `atl.find_by_relationship()`, and `angular_gyrus.recall()` for knowledge
   context. In parallel, `math_bridge.enrich_context(goal)` calls
   `angular_gyrus.recall_method(goal)`. SCN supplies temporal context.
5. **Decision and review.** The ExecAgent proposes a goal from that context. The
   fear circuit reviews the resulting action against harm predictors and NAc
   pain history, returning allow or block before anything executes.
6. **Execution and outcome.** The tool runs. Post-execution, four sub-millisecond
   writes fire — `context_pool.add_outcome()`, `llm_worker.record_outcome()`,
   `recent_outcomes.append()`, `memory_hub.record_plan_outcome()` — followed by
   `hippocampus.capture_from_loop()`, which takes 10–200 ms under the write lock.
7. **Callbacks.** Capture completion fires `_on_memory_captured`, which reaches
   `MemoryHub._on_memory_captured()` and schedules an EC embedding on the
   embedder's own thread pool. Meanwhile `_complete_forming_memory()` fills the
   Outcome and transitions the entry to `SHORT_TERM`, and the NAc observes the
   (event, outcome) pair to update its causal link.
8. **Significance.** The `SignificanceWeightLearner` scores the completed cycle
   across six heuristics — `rpe_magnitude` 0.35, `user_interaction` 0.20,
   `novelty` 0.15, `plan_phase_boundary` 0.10, `outcome_valence_extremity` 0.10,
   `energy_state_change` 0.05. Above the staging threshold (default 0.5), a JSON
   sidecar is written to `data/short_term_memory/`.
9. **Sleep.** At session end the consolidation pipeline above runs, and whatever
   survived is on disk for the next session.

## Concurrency

The repo's runtime analysis corrects several plausible-sounding assumptions, and
they are worth stating precisely.

- **Bridges do not read the Hippocampus during the loop.** They perform their
  heavy reads once, at `on_session_start()` — the salience bridge, for instance,
  pulls 500 successful and 200 failed memories plus spreading activation — and
  then serve from internal caches for the rest of the session.
- **ATL and Angular Gyrus are read every tick**, not only at session end. ATL is
  read by `memory_agent._build_knowledge_context()`; AG is read by
  `math_bridge.enrich_context()` and written, infrequently, by
  `math_bridge.promote_patterns()`. Only consolidation and promotion are
  session-end operations.
- **The MemoryAgent does not query the Hippocampus for relevant memories.** It
  uses its own `_association_index` and `_association_graph` — separate,
  lighter-weight structures, not the Hippocampus dependency graph.
- **CrossLayerGraph edges are created at session end only**, by the
  SemanticPromoter. Active-loop `cross_layer_activation()` calls are read-only
  against a stable graph.
- **The only Hippocampus write during the active loop is `capture_from_loop()`.**
  Combined with the point about bridges, that means effectively zero read-write
  contention on the Hippocampus lock while the loop is running.

Locks: Hippocampus, ATL, and Angular Gyrus each hold their own `RWLock` (the
Hippocampus one is writer-priority); the CrossLayerGraph uses a thread-safe
dict; the ContextPool uses an `RLock`; the MemoryHub has none. Separately
running threads include the 30 Hz main loop, the LLM worker, the DefaultNetwork
reactive fallback, camera capture, segmentation, audio transcription, and the EC
embedder.

The known bottleneck is `_form_associations()`. It scores candidate memories by
overlapping detected objects and people in an O(n) scan over all memories
(`association_limit` 5, `association_threshold` 0.5), which dominates capture
cost at 50–200 ms once the store passes ~1000 memories. This is the reason
capture is a candidate for moving onto its own worker thread.

## Going deeper

- [Architecture](/concepts/architecture/) — the agent pipeline and layer rules
- [Memory systems](/memory/overview/) — tiers, decay, and consolidation policy
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md) — MemoryHub, CrossLayerGraph, store protocols
- [`docs/memory-system-interactions.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory-system-interactions.md) — runtime access patterns, threading, locking
- [`docs/memory-layer-lifecycle.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory-layer-lifecycle.md) — tier progression and the promotion pipeline
- [`docs/index.md`](https://github.com/dennys246/Maxim/blob/main/docs/index.md) — full documentation index and biological mappings
