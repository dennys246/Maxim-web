---
title: Hippocampus
description: Maxim's episodic memory system — how full perception → decision → action → outcome cycles are captured, associatively linked, recalled by spreading activation, and consolidated during sleep.
---

The Hippocampus is Maxim's episodic store. It owns every `EpisodicMemory` the
system keeps, the associative graph between them, the indices that make recall
cheap, and the sleep-time consolidation that decides what survives. If a
question starts with "what happened when…", this is the system that answers it.

The name is a role label. In the brain, hippocampal damage prevents the
formation of new long-term memories while leaving older ones intact, and damage
to the anterior temporal lobe produces the opposite dissociation — episodic
recall preserved, conceptual knowledge lost. That dissociation is the reason
Maxim keeps episodes and concepts in separate modules with separate decay
policies. What is borrowed is the division of labour, not the mechanism. There
are no spiking neurons here; the associative graph is a weighted edge dict and
the consolidation pass is a scored sweep over records.

This page is the deep dive. [Memory systems](/memory/overview/) is the shorter
summary of the same territory, and [Systems overview](/systems/overview/)
covers how the subsystems are wired together at runtime.

## What it stores

An episodic memory is a complete cycle, assembled from five record types:

| Type | Class | Contents |
| --- | --- | --- |
| Perception | `Perception` | Sensory input — vision, audio, CLI text, transcript |
| Decision | `Decision` | Planning decisions and rationale |
| Action | `Action` | Executed action and its parameters |
| Outcome | `Outcome` | Result and feedback |
| Context | `Context` | Environmental state at the time |

### Capturing a memory

```python
from pathlib import Path

from maxim.memory import Hippocampus, HippocampusConfig, Perception
from maxim.memory.encoding import EncodingSignals

store = Path("my_hippocampus.json").resolve()  # a scratch store, not the agent's own

config = HippocampusConfig(
    max_nodes=10_000,
    persistence_path=str(store),
    indexed_keys=frozenset({"goal", "tool", "object", "person"}),
)

hippo = Hippocampus(config)  # starts EMPTY, even if the file exists (see below)

perception = Perception(
    observations={"scene": "office", "confidence": 0.95},
    cli_input=None,
    transcript=None,
    detected_objects=["person", "book"],
    detected_people=["alice"],
    salience=0.8,
    novelty=0.6,
)
memory_id = hippo.capture(
    perception,
    encoding=EncodingSignals.unmeasured("api"),  # required since 1.3.1
)
hippo.save()
```

**`encoding=` is required since 1.3.1** on `capture()`, `capture_from_loop()` (and its
async form) and `store()`, and a call without it raises `TypeError`. It records which
importance signals were actually measured at the capture — salience, novelty, surprise,
pain — and where the capture came from. `EncodingSignals.unmeasured("api")` is the
honest declaration that you measured none of them. Under the default retention strategy
the record changes nothing (see [what 1.3.1 records](#what-131-records-and-does-not-yet-use)).

:::caution[Opening an existing store]
`Hippocampus(config)` does **not** read the file at `persistence_path`. It starts empty,
and its next `save()` overwrites what was there — on 1.3.1, three saved memories, reopened
this way, are gone after the next save; only what the new instance captured is kept. `maxim.create.hippocampus(persistence_path=...)` does
the same (engine issue [#939](https://github.com/dennys246/Maxim/issues/939), open). To
reopen a store, load it:

```python
import maxim

hippo = maxim.load.hippocampus(str(store))
```

Check `len(hippo)` before you save: given a `"~/..."` path, `load.hippocampus` returns an
empty store instead of raising. Paths are used as written, so pass absolute ones — a
`persistence_path` of `"~/..."` is not expanded either, and saves into a directory named
`~` under your working directory. And do not point an example at `~/.maxim/memory/hippocampus.json`, which is
the running agent's own store.
:::

In the live agent loop, capture happens through `capture_from_loop()` (and its
async variant) rather than a direct `capture()` call. That is the *only*
Hippocampus write during the active loop — bridges do their reads once at
session start, so lock contention on the store is effectively zero while the
loop runs.

### Selective capture

Recording every tick at 30 Hz would produce noise, not memory. Capture is
gated on:

- **User interactions** — always recorded.
- **High novelty** — above a 0.7 threshold.
- **High salience** — contextually significant events.
- **Goal changes** — transitions between objectives.
- **Failures** — mistakes are worth keeping.
- **Periodic checkpoints** — regular snapshots so continuity survives quiet
  stretches.

Each captured record is indexed by hash keys drawn from `indexed_keys`
(default `goal`, `tool`, `object`, `person`, `success`, `mode`), which makes
"every memory involving a coffee mug" an O(1) lookup rather than a scan.

## The associative graph

When a memory is captured, `_form_associations()` recalls similar existing
memories and creates bidirectional `ASSOCIATES` edges to them. This is an
engineering analogy to engram co-allocation in neuroscience: things encoded near
each other, about the same stuff, get linked at encoding time rather than at query
time. It is an analogy, not a claim. The traces it links reach behaviour only as
LLM prompt text today; [Engrams](/memory/engrams/) scores each memory family.

Edge weight is a fixed blend of three terms:

```
weight = 0.60 * perceptual_overlap   # shared detected objects and people
       + 0.25 * goal_overlap         # word-level Jaccard over active goals
       + 0.15 * temporal_proximity   # closer in time = stronger, decays over hours
```

Perceptual overlap dominates by design — what you saw matters more than what
you were trying to do, which matters more than when it happened. The same
0.6 / 0.25 / 0.15 weighting is reused by the `CrossLayerGraph` for edges
*between* memory layers, which is a deliberate consistency rather than a
coincidence.

Two knobs bound the work: `association_limit` (5) caps how many edges a new
memory forms, and `association_threshold` (0.5) sets the minimum weight worth
storing. This is also the known hot spot — the candidate scan is O(n) over the
store and dominates capture cost at roughly 50–200 ms once the store passes
~1000 memories.

## Retrieval

Four retrieval paths, each answering a different question:

```python
import time

# Continuing from the capture example above.
current_perception = perception

# Filtered recall: goal, tool, success, mode, time range
memories = hippo.recall(goal="find_book")
recent = hippo.recall(time_after=time.time() - 3600, time_before=time.time())

# Direct lookup, O(1)
memory = hippo.get(memory_id)

# Similarity recall over perception overlap
similar = hippo.recall_similar(
    perception=current_perception,
    limit=5,
    include_compressed=True,
)

# Associative recall — spreading activation through the graph
associated = hippo.recall_associated(
    seed_ids=[memory_id],
    limit=10,
    decay=0.5,
    max_depth=3,
    threshold=0.05,
    include_compressed=True,
)
# → list[(memory, activation_score)], sorted by score
```

Spreading activation is a BFS from the seed memories. Activation starts at 1.0
and is multiplied by `decay` (0.5) and the edge weight at each hop, stopping at
`max_depth` (3) or when activation falls below `threshold` (0.05). Because
activation flows through edges rather than index keys, a memory that shares no
index key with the query can still surface — that is the whole point of keeping
the graph.

Similarity itself is served by two MinHash/LSH `SimilarityIndex` instances
rather than linear scans: `context_index` (language/context similarity, used by
`AssociationIndex.find_similar()` and the consolidation orchestrator) and
`percept_index` (percept similarity, used by `recall_deep` and chronic
recurrence detection).

```python
from maxim.memory.context_index import SimilarityIndex

index = SimilarityIndex(num_hashes=64, num_bands=8)
index.register("mem_1", "the robot saw a person near the table")
results = index.query_similar("person at the table", min_similarity=0.3)
```

## Configuration

```python
@dataclass
class HippocampusConfig:
    max_nodes: int = 10_000
    state_store_max_entries: int = 1000
    persistence_path: str | None = None
    indexed_keys: frozenset[str] = frozenset({"goal", "tool", "object", "person", "success", "mode"})

    # Sleep consolidation
    enable_sleep_consolidation: bool = True
    max_age_without_access: float = 7 * 24 * 3600  # 1 week
    compression_age: float = 24 * 3600             # 1 day
    retention_threshold: float = 0.3
    compression_threshold: float = 0.6
    memory_strategy: str = "access_based"  # or importance_based, composite, strength

    # The opt-in storage-strength model (memory_strategy="strength"), in experience µs
    strength_s_base: float = 10_000_000.0
    strength_k: float = 1.0
    retro_tau_us: int = 10_000_000
    retro_cutoff_us: int = 30_000_000

    # Long-term memory consolidation
    consolidate_during_sleep: bool = True
    max_consolidation_candidates: int = 500
    immediate_promotion_salience: float = 0.95
    immediate_promotion_novelty: float = 0.95
    long_term_retention_boost: float = 2.0
    auto_save_after_sleep: bool = True

    # Associative graph
    enable_associative_graph: bool = True
    association_limit: int = 5
    association_threshold: float = 0.5
    dedup_window_s: float = 30.0
    spreading_activation_decay: float = 0.5
    spreading_activation_max_depth: int = 3
    spreading_activation_threshold: float = 0.05

    # Async capture
    capture_queue_size: int = 100
```

Retention scoring is chosen by name, through `memory_strategy`. `access_based`
(recency + access frequency + graph centrality) is the default; `importance_based`
(novelty, salience, success, user interaction) and `composite` (a fixed 0.6 / 0.4 blend
of the two) are the alternatives. When an SCN is connected, the chosen strategy is
wrapped in `TemporalAwareStrategy`, which boosts the sole representatives of a time bin.
An unknown name raises rather than quietly falling back to the default — at the first
`sleep()` in Python, and at once from `maxim config set`.

```python
from maxim.memory import Hippocampus, HippocampusConfig

hippo = Hippocampus(HippocampusConfig(memory_strategy="composite"))
```

The same choice is a config key for the whole agent:
`maxim config set memory.strategy composite`. The fourth name, `strength`, selects the
storage-strength model described next; it is an uncalibrated placeholder, not a
setting to run a campaign on.

## What 1.3.1 records, and does not yet use

1.3.1 lands the first phases of a memory-strength model as **recording**. Every new
memory now records when it happened on the agent's experience clock, how strongly it
encoded, the body's drive pressure and relief at the time, and the situation it happened
in; a strong moment tags the memories just before it in the same situation; and recall by
situation is wired, though nothing consumes it yet. Under the default strategy none of
this changes what is kept, compressed or forgotten. It persists and survives a reload —
the engine's cross-session memory re-run checked the new fields on all 100 carried
memories.

Only `memory_strategy="strength"` reads it, and its defaults are a worked example rather
than a calibration: an untagged memory that is not recalled is removed after roughly 12
seconds of run experience, at the next `sleep()`. Treat it as a way to look at the model, not as a
feature. The design is the engine's
[memory-strength plan](https://github.com/dennys246/Maxim/blob/main/docs/plans/memory_strength_and_forgetting.md).

The store persists to JSON (`~/.maxim/memory/hippocampus.json` by default),
carrying `_format_version`, memories, context index, stats, the associative
graph, episodes, and `next_episode_ordinal`. Access is guarded by a
writer-priority `RWLock`. Clear it with `maxim --clear-memory hippo`.

## Staged formation

:::note[Designed, not running]
Steps 2–4 below have **no production caller**: the engine marks them Dormant
([#817](https://github.com/dennys246/Maxim/issues/817)), so a forming entry never
completes on its own, and 1.3.1 caps the pool at its newest 32 entries so it cannot grow
without bound. The live loop stores memories through `capture_from_loop()` instead. This
section describes the design.
:::

Memories are not born whole. The MemoryAgent builds an `EpisodicMemory`
incrementally across the pipeline, wrapped in a `WorkingMemoryEntry[T]` that
carries agent-level metadata — `tier`, `salience`, `decay_rate`,
`predicted_outcomes`, `source` — separately from the record itself.

```
FORMING ──────► SHORT_TERM ──────► LONG_TERM
   │                 │                  │
   │ during the      │ minutes;         │ persistent;
   │ agent pipeline  │ buffer-based     │ age-based eviction,
   │ eviction-       │ eviction, fast   │ 2x retention boost
   │ protected       │ salience decay   │
```

1. Percept arrives → `_begin_memory_formation()` creates the FORMING entry with
   Perception and Context.
2. Decision made → `_update_forming_decision()`.
3. Action executes → `_update_forming_action()`.
4. Outcome received → `_complete_forming_memory()` fills Outcome and transitions
   to SHORT_TERM.
5. Next cycle → `_flush_completed_from_pool()` clears completed entries.

Promotion from SHORT_TERM to LONG_TERM is **pressure-based** as well as
sleep-based: context-diverse recall accumulates `promotion_pressure`, wall-clock
decay prevents trickle-promotion, and crossing the threshold promotes. This
rewards memories that keep proving useful over ones that were merely touched
recently.

Note that the MemoryAgent and the Hippocampus maintain *separate*
`EpisodicMemory` instances. The MemoryAgent uses its own association index and
graph for context building; it does not query the Hippocampus for relevant
memories during the loop.

### Episode boundaries

Where one episode ends and the next begins is decided contextually, not by a
timer. Four rules are checked each tick: `tick_gap` (too much time between
events), `channel_change` (new input channel), `scn_tag_change` (SCN temporal
phase shift), and `salience_spike`. The last one is the sharpest — a pain signal
of intensity ≥ 0.5 immediately finalizes the current episode and opens a new
one, which is the modelled version of trauma cutting a hard boundary into
memory.

### Valence

Episodes are not emotionally neutral. Each `Episode` carries a `valence`
computed at finalization as the mean of all reaction valences received during
its lifetime — pain contributes negative, success positive, no reactions gives
0.0. An episode receiving pain reactions of -0.7 and -0.3 finalizes at -0.5.
Hebbian edges inherit this through `Edge.metadata["valence"]`, so spreading
activation can carry emotional colouring alongside activation strength.

## Sleep consolidation

`hippocampus.sleep()` does three things, in order, over at most
`max_consolidation_candidates` (500) records.

**Promote to LONG_TERM.** Qualifying paths: salience > 0.9, novelty > 0.9, a
successful user interaction, `access_count >= 5`, or use-based
`promotion_pressure >= 3.0`. Promoted records are marked `long_term=True` with a
`consolidated_at` timestamp and get the 2× retention boost.

**Compress.** Full `EpisodicMemory` → `CompressedMemory` (run id, goal, tool
name, success, `had_user_input`, `object_count`, novelty, salience) once age
exceeds `compression_age` and score falls below `compression_threshold`. Roughly
2.5 KB becomes roughly 200 bytes.

**Remove.** Records scoring below `retention_threshold`, or unaccessed past
`max_age_without_access`, are deleted — with graph edges and deletion callbacks
cleaned up automatically. High-value memories (user interactions, successes) are
protected from pruning.

Selection is wave-based, with path-dependent thresholds so that one-shot and
evidence-based learning are held to different bars:

| Wave | Threshold | Trigger |
| --- | --- | --- |
| ACUTE | 0.45 | One-shot learning — RPE spikes, user input, highly novel percepts |
| CHRONIC | 0.60 | Evidence-based — percept recurrence at similar times |
| IMMEDIATE | 0.85 | Bypasses wave processing, promotes on the first sleep cycle |

```
wave_score = 0.30 * significance
           + 0.20 * nac_corroboration
           + 0.20 * temporal_recurrence
           + 0.12 * percept_recurrence
           + 0.10 * context_recurrence
           + 0.08 * novelty_decay
```

Upstream of this, completed cycles are scored by the
`SignificanceWeightLearner` across six heuristics — `rpe_magnitude` 0.35,
`user_interaction` 0.20, `novelty` 0.15, `plan_phase_boundary` 0.10,
`outcome_valence_extremity` 0.10, `energy_state_change` 0.05. Above the staging
threshold (default 0.5) a JSON sidecar is written to `data/short_term_memory/`,
which is the acute staging queue sleep later reads.

`hippo.consolidate()` runs promotion only, without the compress/remove passes.

> **Version note.** `HippocampusConfig` sets `immediate_promotion_salience` and
> `immediate_promotion_novelty` to 0.95, while the consolidation documentation
> states the promotion criteria as salience > 0.9 and novelty > 0.9. Treat the
> config defaults as authoritative for a given build and check the source if the
> exact cutoff matters.

## How it connects

The Hippocampus does not reach out to its siblings directly; the
[MemoryHub](/systems/overview/) routes perception, decision, action, and outcome
events to each subsystem and owns session lifecycle, including shutting down the
Hippocampus capture thread. The hub holds no memories of its own.

- **[Entorhinal Cortex](/systems/entorhinal-cortex/) → Hippocampus.** The EC
  supplies similarity. Capture fires a callback chain; the hub's
  `_on_memory_captured()` schedules an EC embedding on the embedder's own thread
  pool, so encoding never blocks the loop. Vectors persist to
  `~/.maxim/util/semantic_embeddings.npz` and back deep similarity queries that
  match across synonyms.
- **[SCN](/systems/suprachiasmatic-nucleus/) ↔ Hippocampus.** The SCN supplies
  temporal bins at capture, giving time-of-day queries over episodic content,
  and `TEMPORALLY_CORRELATES` cross-layer edges point from an SCN rhythm to a
  memory. SCN tag changes are also one of the four episode-boundary rules, and
  `TemporalAwareStrategy` uses SCN rhythm awareness when scoring retention.
- **[Nucleus Accumbens](/systems/nucleus-accumbens/) → Hippocampus.** The NAc
  observes each (event, outcome) pair after execution and updates its causal
  links. Its reward prediction error feeds the largest significance heuristic
  (`rpe_magnitude`, 0.35) and the `nac_corroboration` term in the wave score,
  which is how reward gates what gets kept. It also acts as a `PromotionSource`
  for semantic promotion.
- **Hippocampus → [ATL](/systems/anterior-temporal-lobe/).** The
  `ConceptExtractor` is registered as a capture callback and pulls objects,
  people, location, goal tokens, and tool names out of new episodes into
  concepts, tracking provenance in `Concept.memory_refs["hippocampus"]`. Flow
  runs back the other way too: the ATL wires a `_pattern_completion_fn` into
  formation, so the `PatternCompleter` can inject `PredictedOutcome` objects
  into FORMING entries. At session end the `SemanticPromoter` collects
  candidates, applies the IPS randomness gate, calls `ATL.find_or_create()`, and
  writes `INSTANCE_OF` / `DERIVED_FROM` cross-layer edges — which is why
  promotion must run *before* consolidation, while the source episodes still
  exist.
- **[Angular Gyrus](/systems/angular-gyrus/) → concepts, not episodes.** The AG
  enriches concepts numerically (`QUANTIFIES`, `STATISTICALLY_CONFIRMS`) rather
  than writing to the episodic store; the Hippocampus sees it indirectly through
  `MathContextEntry` data attached to predictions.
- **[Fear circuit](/systems/fear-circuit/) and
  [Cerebellum](/systems/cerebellum/)** sit off the hub entirely — the fear
  circuit reviews actions before execution using NAc pain history, and the
  cerebellum calibrates motor commands after they leave the loop. Neither reads
  or writes hippocampal records.

> **Drift note.** The embedding stack has moved. Older documentation describes
> `--enable-embeddings` with `all-MiniLM-L6-v2` inside `AssociationIndex`; since
> 0.9 the current path is `MAXIM_SUBSTRATE_PATH=1`, routing text percepts through
> the LinguisticEncoder (`paraphrase-mpnet-base-v2`) → EC → ATL, and requires
> `pip install 'pymaxim[semantic]'` — which the `[all]` extra does *not* include.

## Going deeper

- [Memory systems](/memory/overview/) — the shorter tour of the same layers.
- [Systems overview](/systems/overview/) — MemoryHub wiring, locking, and the
  end-to-end trace.
- [Architecture](/concepts/architecture/) — how memory feeds the agent loop.
- [Full memory-systems write-up](https://www.dennyschaedig.com/maxim/memory-systems)
  — the original article, including the narrative framing of the Hippocampus.
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md)
  — code-adjacent reference for config, strategies, LSH, and persistence.
- [`docs/memory-layer-lifecycle.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory-layer-lifecycle.md)
  — tier progression, cross-layer edges, and the promotion pipeline.
- [`docs/user/memory-user-guide.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/memory-user-guide.md)
  — on-disk locations, the substrate path, and `--clear-memory`.
