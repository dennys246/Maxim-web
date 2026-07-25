---
title: Anterior temporal lobe
description: Maxim's semantic memory layer — concepts, entities, and typed relationships distilled from episodes, plus the pipeline that promotes recurring patterns into stable knowledge.
---

The anterior temporal lobe is the brain's semantic hub: the place where "what a
mug is" lives independently of any particular memory of seeing one. Maxim's ATL
plays the same role in the [bio-inspired cognitive architecture](/systems/overview/).
Where the [Hippocampus](/systems/hippocampus/) stores *what happened* — full
perception → decision → action → outcome cycles — the ATL stores *what things
mean*: named concepts, their categories and properties, and typed relationships
between them.

It lives in `src/maxim/memory/atl.py`, with the surrounding pipeline in
`concept_extractor.py`, `concept_grounder.py`, `pattern_completer.py`, and
`semantic_promoter.py`.

## What it does

The ATL is the layer that makes Maxim's headline claim mechanically true, so it
is worth being precise about what the claim is.

Maxim carries experience across sessions **without fine-tuning**. There are no
gradient updates and no retraining. What persists is the substrate: Hippocampus
episodes, NAc causal links and reward biases, EC nodes, and ATL concepts, all
written to disk and reloaded on the next run. When a fresh process starts, the
ATL's concepts are still there, still carrying their confidence scores, their
relationships, and their references back to the episodes that formed them. The
agent recalls the prior experience and surfaces it to the LLM as
experience-grounded context.

That is the earned part of the claim, and it is measurable — `maxim roy diff`
will show you concept counts, name overlap, and Jaccard between two sessions'
ATL snapshots. What the project's own [cross-session learning
guide](https://github.com/dennys246/Maxim/blob/main/docs/user/cross-session-learning.md)
is careful to separate out is the next step: whether recalled context actually
*changes what the agent does* is a different question, and the honest answer
measured across four frontier models at 1.0 is that a strong LLM's prior often
dominates the carried signal. The ATL guarantees that the knowledge is present
and retrievable. It does not guarantee the model acts on it.

So: persistent, structured, retrievable knowledge that accumulates across runs —
not weight updates, and not a promise about behaviour.

## How it works

### The Concept

`Concept` extends `SemanticMemory` (both in `src/maxim/memory/semantic_types.py`)
and carries:

| Field | What it holds |
| --- | --- |
| `name`, `definition`, `category` | Identity and type of the concept |
| `properties` | Grounded statistics attached by the grounder |
| `confidence` | How well-established the concept is |
| `reinforcement_count` | How many times it has been re-observed |
| `provenance` | How it came to exist |
| `source_episode_ids` | The episodes it was distilled from |
| `embedding_text` | Text used for similarity matching |
| `memory_refs` | Per-layer references to records that mention it |

Its methods are `add_ref(layer, record_id)`, `remove_ref(layer, record_id)`, and
`reinforce(source_id)` — the last increments confidence and access tracking.
Infrequently accessed concepts are compacted into `CompressedSemantic` forms to
reduce storage.

`memory_refs` is deliberately a `dict[str, dict[str, None]]` — layer name to an
*ordered* dict of record ids — rather than a set, so that pruning is FIFO. Each
layer's reference set is capped at `MAX_REFS_PER_LAYER = 200`, and the oldest
refs are evicted first.

### The four-stage pipeline

| Stage | Module | Purpose |
| --- | --- | --- |
| Extraction | `concept_extractor.py` | Extract candidate concepts from episodic memories |
| Grounding | `concept_grounder.py` | Validate concepts against perceptual evidence |
| Pattern completion | `pattern_completer.py` | Fill in missing attributes from partial cues |
| Promotion | `semantic_promoter.py` | Promote recurring patterns to stable semantic concepts |

**ConceptExtractor** runs as a capture-time callback on the Hippocampus, on an
async worker thread. It pulls objects (`detected_objects`), people
(`detected_people`), location (from observations), goal tokens, and actions
(`tool_name`) out of each episode; tokenizes compound strings
(`"navigate_to_kitchen"` → `["navigate", "kitchen"]`, `"graspObject"` →
`["grasp", "object"]`); filters stop words; calls `find_or_create(name, category)`
on the ATL so duplicates reinforce rather than multiply; then wires the result
back with `concept.add_ref("hippocampus", episode.id)` and
`concept.reinforce(episode.id)`. Concepts that co-occur get categorical
relationships at confidence 0.3.

**ConceptGrounder** runs at recall time, async via the WorkerPool, and falls back
to a synchronous path when no pool is available. It is what turns a bare name
into something statistically defensible. Its co-occurrence scoring is Jaccard
similarity over shared episode sets: if concepts A and B appear together in 6 of
their 10 combined episodes, J = 0.6, and a `RELATED_TO` edge is created or
reinforced with weight proportional to co-occurrence. It also grounds properties
against the [Angular Gyrus](/systems/angular-gyrus/) — salience mean and standard
deviation, novelty mean and standard deviation, and success rate as a proportion
of `outcome.success` (rendered like `0.875 (7/8)`) — and stores AG `MathMemory`
records with `QUANTIFIES` edges back to the concept.

### Typed relationships

Relationships between concepts are typed, not generic edges:

| Type | Symmetric | Example |
| --- | --- | --- |
| `IS_A` | No | `coffee_mug` IS_A `container` |
| `HAS_PART` | No | `robot_arm` HAS_PART `gripper` |
| `CAUSES` | No | `grasp_action` CAUSES `object_held` |
| `TRENDS_WITH` | Yes | `navigate_failures` TRENDS_WITH `goal_latency` |
| `CORRELATES_WITH` | Yes | Confirmed by AG cross-metric analysis |
| `PHASE_LOCKED_TO` | No | `success_rate` PHASE_LOCKED_TO `circadian` |
| `PREDICTS` | No | `morning_activity` PREDICTS `high_success` |

Edges that cross *between* memory systems are held by the CrossLayerGraph rather
than inside the ATL, and use a separate vocabulary: `DERIVED_FROM`,
`INSTANCE_OF`, `STATISTICALLY_CONFIRMS`, `QUANTIFIES`, `TEMPORALLY_CORRELATES`,
`COMPUTED_FROM`, `INFORMS`.

### Confidence, provenance, and decay

Confidence is a function of how often a concept has been re-observed:

```
confidence = min(0.99, 0.5 + 0.1 × √reinforcement_count)
```

A brand-new concept sits at 0.5. Twenty-five reinforcements would compute to 1.0
and is clamped to 0.99 — the ceiling is deliberate, so no concept is ever
certain.

Provenance records where a concept came from, which lets the system weight
freshly inferred knowledge differently from well-established knowledge:

| Provenance | Meaning |
| --- | --- |
| `EPISODIC_CONSOLIDATION` | Extracted from repeated episodes via NAc reward signals |
| `AGENT_INFERENCE` | Proposed by the StatisticianAgent from confirmed patterns |
| `DIRECT_INGESTION` | Ingested directly from RAG / documents |
| `HYBRID` | Multiple sources contributed |

For retention, the ATL mirrors the Hippocampus architecture — context indexing,
associative graph, consolidation — but with a slower decay window: a **30-day
max**, against 7 days for episodes. Capacity is enforced through the same
`MemoryStrategy` pipeline the Hippocampus uses (`AccessBasedStrategy` over that
30-day window, plus `TemporalAwareStrategy` when the SCN is connected), so
store-time eviction and sleep-time consolidation score concepts identically. The
docs specify the window and the strategies; they do not publish a closed-form
per-day decay rate, and none is asserted here.

## Promotion from episodic

Concepts do not only come from extraction. The `SemanticPromoter` runs a
multi-source pipeline that turns confirmed episodic patterns into stable ATL
concepts:

```
PromotionSource(s)                  IPS noise gate            ATL
──────────────────                  ──────────────            ───
NAc causal patterns      ──┐
StatisticianAgent        ──┼──►  randomness quality  ──►  find_or_create()
(extensible: any source) ──┘         assessment              │
                                                              ▼
                                                   CrossLayerGraph edges
                                                   to source records
```

1. **Collect candidates.** Any system implementing the `PromotionSource`
   protocol exposes
   `get_promotion_candidates(min_confidence=0.6, min_observations=3)`, returning
   `PromotionCandidate` records with `pattern_name`, `category`
   (`"causal_pattern"`, `"operational_pattern"`), `confidence`,
   `source_memory_ids`, and `metadata`.
2. **Gate on IPS.** The [Angular Gyrus](/systems/angular-gyrus/)'s intraparietal
   sulcus screens out noise. For NAc candidates it assesses the temporal
   randomness of when the observations occurred — a "pattern" whose timings look
   random is not a pattern. StatisticianAgent candidates have already passed an
   AG assessment, so the gate only checks confidence ≥ 0.4. Small samples (fewer
   than 8 observations) are allowed through conservatively.
3. **Deduplicate and create.** `ATL.find_or_create()` either creates the concept
   or reinforces an existing one.
4. **Wire provenance.** Cross-layer edges link the new concept back to the
   records it came from.

Ordering matters. Promotion runs *before* consolidation during
`MemoryHub.on_session_end()`, so the source episodes still exist when the
cross-layer edges are formed. The full mandatory cycle is: Hippocampus sleep →
promote → consolidate → persist.

## In the agent loop

Two components read the ATL during the loop rather than writing to it.

**ConceptContextBuilder** (`concept_context.py`) builds the enrichment block that
reaches the LLM. Given detected objects, detected people, and the active goal, it
normalizes goal tokens, looks up matching concepts, sorts by confidence and caps
at `limit=5`, collects their typed relationships, and enriches with AG
`MathMemory` (means, standard deviations, verbal summaries). Each entry carries
`name`, `category`, `confidence`, `episode_count`, `relationships`
(`{type, target, weight}`), `properties`, and `layer_context`.

Crucially it is budget-bounded — a default **50 ms** time budget — and degrades
gracefully rather than blocking the loop: full context → cached AG data only →
name, category, and count only.

**PatternCompleter** (`pattern_completer.py`) runs synchronously at the FORMING
stage of memory formation and answers "last time I saw this, what happened?" It
matches concepts against current percepts and goal, collects and deduplicates
their `memory_refs["hippocampus"]` entries, loads and sorts those episodes by
recency (capped at 20), extracts past outcomes, and enriches them with AG math
context. The result is a list of `PredictedOutcome` records — `tool`, `success`,
`goal`, `confidence`, `source_episode_id`, `math_context` — injected into the
forming memory before it is committed. Full `EpisodicMemory` records supply
`decision.confidence`; `CompressedMemory` records, having lost that field,
default to 0.3.

## How it connects

- **[Hippocampus](/systems/hippocampus/)** — the ATL's raw material. Concepts are
  extracted from episodes at capture time, and the ATL wires a
  `_pattern_completion_fn` back into the Hippocampus so predictions flow in the
  other direction during memory formation.
- **[Entorhinal cortex](/systems/entorhinal-cortex/)** — supplies the similarity
  routing that concept matching depends on. With the `[semantic]` extra installed
  this is neural embeddings; without it, the system quietly falls back to a
  bag-of-words hash embedding, which materially degrades concept matching and
  therefore cross-session recall.
- **[Angular gyrus](/systems/angular-gyrus/)** — supplies the statistical
  structure: `MathContextEntry` enrichment per concept, `QUANTIFIES` and
  `STATISTICALLY_CONFIRMS` edges, and the IPS gate on promotion.
- **[Nucleus accumbens](/systems/nucleus-accumbens/)** — supplies the reward
  signal. NAc reward prediction errors gate which patterns are worth promoting to
  semantic status at all.
- **[Suprachiasmatic nucleus](/systems/suprachiasmatic-nucleus/)** — contributes
  temporal context through `TemporalAwareStrategy` and
  `TEMPORALLY_CORRELATES` edges.
- **MemoryHub** — coordinates all of it. `MemoryHub.recall_concepts()` is the
  ATL's read path into the loop; `on_session_end()` owns promotion ordering. See
  [Systems overview](/systems/overview/) for the wiring.

Clear the layer with `maxim --clear-memory atl`.

## Going deeper

- [Memory systems](/memory/overview/) — tiers, decay, and consolidation policy
  across all layers.
- [Architecture](/concepts/architecture/) — where the ATL sits relative to the
  agent pipeline.
- [Semantic memory](https://www.dennyschaedig.com/maxim/semantic-memory) — the
  deepest narrative treatment of the concept pipeline.
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md) —
  the ATL section, CrossLayerGraph, and store protocols.
- [`docs/memory-layer-lifecycle.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory-layer-lifecycle.md) —
  episodic → semantic consolidation and the promotion pipeline.
- [`docs/user/cross-session-learning.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/cross-session-learning.md) —
  the end-to-end walkthrough, including `maxim roy diff` and how to read the
  signals honestly.
- [`docs/concept-decomposition.md`](https://github.com/dennys246/Maxim/blob/main/docs/concept-decomposition.md) —
  finer-grained concepts for better cross-session matching.
