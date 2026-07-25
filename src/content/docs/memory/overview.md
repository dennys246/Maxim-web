---
title: Memory systems
description: How Maxim's bio-inspired memory layers store, index, consolidate, and recall experience across sessions.
---

Memory in biological systems isn't a filing cabinet, or even a database. It's a
dynamic, reconstructive process where anatomically distinct brain regions
collaborate to store, index, and retrieve experiences. The hippocampus, SCN,
nucleus accumbens, and entorhinal cortex are separate structures scattered
across the brain, connected by neural pathways that let them work as
complementary partners. Maxim mirrors this: independent subsystems coordinated
by the MemoryHub. The Hippocampus is the long-term store — it owns all episodic
memories and the associative connections between them. The MemoryAgent acts as
the gatekeeper, deciding what's important and what's relevant, staging new
observations before committing them to permanent storage.

## Three memory layers

The brain separates memory into episodic (hippocampus — personal experiences),
semantic (anterior temporal lobe — general knowledge), and procedural
(cerebellum — motor skills). Maxim implements three memory layers, each handling
a different kind of knowledge.

### Hippocampus — episodic memory

"What happened." The Hippocampus stores `EpisodicMemory` objects, each capturing
a complete cycle: perception → decision → action → outcome. These are rich,
contextual records with a 7-day decay without access, compressed from ~2.5KB to
~200 bytes.

Not every moment gets recorded. The system uses selective capture to avoid
memory bloat: user interactions are always recorded; high-novelty situations
(threshold 0.7), high-salience events, goal changes, failures, and periodic
checkpoints are captured. Memories are indexed by multiple keys (goal, tool,
object, person, success, mode), enabling O(1) retrieval — asking for all
memories involving "coffee mug" is an instant lookup.

The Hippocampus also builds an **associative graph** where memories are nodes
and recall-triggered connections are edges. When a new memory is captured, the
system automatically recalls similar existing memories and forms bidirectional
edges between them, mirroring how biological engram co-allocation creates
associative links during encoding. Edge weight is a weighted sum of three
mechanisms:

| Mechanism | Maxim analogue | Weight |
| --- | --- | --- |
| Pattern overlap | Shared detected objects and people between two memories | 60% |
| Goal-state modulation | Matching or overlapping active goals (word-level Jaccard) | 25% |
| Co-allocation | Closer in time = stronger link (decays over hours) | 15% |

Recall then uses **spreading activation**: activation flows from seed memories
through edges via BFS, decaying exponentially (0.5 per hop, max 3 hops). This
enables context-bridging recall — a memory reachable only through association can
surface even when it shares no direct index keys with the query.

### ATL — semantic memory

"What things mean." The anterior temporal lobe is the brain's semantic hub, where
concepts are stored independently of the episodes that formed them. Maxim's ATL
stores `SemanticMemory` objects — concepts with names, definitions, categories,
properties, and typed relationships to other concepts — stripped of episodic
context. It mirrors the Hippocampus architecture (context indexing, associative
graph, consolidation) but with slower decay (30-day max) and higher stability.
Concepts are built from promoted episodes plus agent inference.

Every concept carries a confidence score, computed as
`min(0.99, 0.5 + 0.1 × √reinforcement_count)`, and records its provenance — how
it was formed (episodic consolidation, agent inference, direct ingestion, or a
hybrid of these). This lets the system weight newer, less-verified concepts
differently from well-established ones.

### Angular Gyrus — mathematical memory

"What the numbers say." The Angular Gyrus stores `MathRecord` objects: facts,
formulas, methods, constants, and learned statistical patterns (categories FACT,
FORMULA, METHOD, CONSTANT, PATTERN). It is seeded with mathematical constants at
startup.

## Staged memory formation

In the brain, new experiences don't instantly become stable memories. They pass
through labile encoding stages, held in working memory before being consolidated
via hippocampal replay during rest. The MemoryAgent implements the same staged
formation pipeline — observations progress through tiers before reaching the
Hippocampus for permanent storage:

```
FORMING    →  Initial observation, still accumulating context
               Protected from eviction during the active session

SHORT_TERM →  Committed to the Hippocampus for storage
               Subject to consolidation during sleep

LONG_TERM  →  Survived consolidation waves
               Permanent storage in the Hippocampus
```

While an observation is in the FORMING tier it is wrapped in a
`WorkingMemoryEntry` that tracks how important, fresh, and relevant it is,
independently of the memory record itself. The ATL can inject predicted outcomes
into forming memories before they're committed ("last time I saw this, X
happened").

The MemoryAgent owns salience scoring, relevance ranking, context building,
staging, and prediction injection. The Hippocampus owns all long-term episodic
storage, associative connections, indexing and recall, persistence across
sessions, and sleep consolidation.

### Episode valence

Memories are not emotionally neutral. Each `Episode` carries a `valence` field,
computed at finalization as the mean of all reaction valences received during
that episode's lifetime. Pain reactions contribute negative values; success
reactions contribute positive values; an episode with no reactions has neutral
valence (0.0). For example, an episode receiving pain reactions of -0.7 and -0.3
finalizes with valence -0.5 — future recall carries a "this went badly" signal.
Hebbian edges inherit valence metadata, so associative connections carry
emotional coloring, and spreading activation can propagate valence alongside
activation strength.

### Episode boundaries

Rather than a fixed timer, the Hippocampus decides where one episode ends and the
next begins using contextual boundary rules checked at each tick: `tick_gap`
(too much time between events), `channel_change` (new input channel),
`scn_tag_change` (SCN temporal phase shift), and `salience_spike`. The
salience-spike rule adds pain-driven boundaries: when a pain signal with
intensity ≥ 0.5 fires, the current episode is immediately finalized (with its
accumulated negative valence) and a new episode begins — mirroring how trauma
creates sharp memory boundaries.

### The promotion pipeline

The `SemanticPromoter` orchestrates the progression from episodic observations to
stable semantic knowledge. It scans promotion sources (NAc reward patterns,
StatisticianAgent confirmed patterns, ConceptExtractor) for qualifying patterns,
filters noise through an IPS randomness quality gate, deduplicates against
existing ATL concepts, and creates concepts with full cross-layer traceability.
Any system that detects patterns can be a promotion source — it just needs to
provide promotion candidates above a minimum confidence and observation count.

Promotion runs as part of the mandatory consolidation cycle, and ordering is
critical — promotion runs *before* consolidation so that source episodes still
exist when cross-layer edges form:

```
1. Hippocampus sleep (SCN-aware temporal consolidation + auto-save)
2. Promote           (NAc + StatAgent patterns → ATL concepts, IPS filters noise)
3. Consolidate       (ATL + Angular Gyrus consolidation — compress, decay, prune)
4. Persist           (save ATL + Angular Gyrus + cross-layer graph)
```

### Sleep-based consolidation

Consolidation during sleep transforms labile hippocampal traces into stable
representations, with the reward system gating which experiences are preferentially
kept. Maxim implements a wave-based pipeline with path-dependent thresholds for
one-shot (acute) and evidence-based (chronic) learning:

- **ACUTE — threshold 0.45.** One-shot learning, triggered by RPE spikes, user
  input, or highly novel percepts. A lower bar means a single significant
  experience can become a lasting memory.
- **CHRONIC — threshold 0.60.** Evidence-based learning, detected by percept
  recurrence (the same pattern appearing at similar times). A higher bar requires
  accumulated evidence before promotion.
- **IMMEDIATE — threshold 0.85.** Skip-the-queue learning. Extremely significant
  moments (high RPE + user input + novel) bypass wave processing and promote on
  the first sleep cycle.

Retention favors frequently accessed and well-connected memories; old memories
compress from ~2.5KB to ~200 bytes; memories not accessed in a week are pruned
along with their graph edges; and high-value memories (user interactions,
successes) are never pruned.

## Supporting systems

**SCN — temporal rhythm indexing.** The Suprachiasmatic Nucleus is the brain's
master clock. Maxim's SCN provides temporal indexing across multiple timescales
(hourly/24 bins, daily/7, weekly/4, monthly/12), enabling queries like "what
typically happens around this time on weekday mornings?" at minimal cost —
10,000 memories require only ~500KB of index storage. An optional
Kuramoto-inspired coupled-oscillator network can learn emergent rhythms like
"Monday mornings" beyond simple bin lookups.

**Nucleus Accumbens — reward prediction.** The NAc learns causal links between
events and outcomes, essentially asking "what happened last time I did this?" It
uses the Rescorla-Wagner model, the same one used in behavioral psychology:

```
ΔV = α(λ - V)
```

where α is the learning rate, λ is the actual outcome, and V is the current
prediction. This produces smooth, asymptotic learning without oscillation, and
lets Maxim predict an action's likely outcome before executing it — enabling
proactive rather than purely reactive decision-making.

**Entorhinal Cortex — similarity matching.** The EC enables similarity queries
("find memories similar to this situation"), which matters because exact matches
are rare. It uses Locality-Sensitive Hashing to group similar items into the same
bucket, giving approximate nearest-neighbor search in roughly constant time
(~10ms regardless of memory size). Optional neural embeddings provide richer
semantic similarity.

## Worked example: spreading activation

A query for "make coffee" directly recalls a memory made at full activation
(1.0), then spreads through associative edges, decaying at each hop:

```
Query: "make coffee"
  │
  ▼ direct recall (activation: 1.0)
  "made coffee at 9am yesterday"
  │ edge (weight: 0.81)
  ▼ activation: 1.0 × 0.5 × 0.81 = 0.41
  "found cup on kitchen table"   ← no "coffee" in its index keys,
  │ edge (weight: 0.75)             but reachable through association
  ▼ activation: 0.41 × 0.5 × 0.75 = 0.15
  "cleaned kitchen table last week"  ← two hops from "coffee",
                                        still contextually relevant
```

The memory about finding a cup — recalled when the coffee memory was formed —
becomes reachable from a "make coffee" query even though "cup" and "coffee" share
no direct index keys. The graph bridges contexts that flat recall cannot.

## Going deeper

- [Agent architecture](/concepts/architecture/) — how memory feeds the agent loop.
- [Full memory-systems write-up](https://www.dennyschaedig.com/maxim/memory-systems)
  — the complete original article, including the MemoryLayer protocol, cross-layer
  graph, typed relationships, and knowledge in the agent loop (until migrated here).
- [Semantic memory](https://www.dennyschaedig.com/maxim/semantic-memory) — the
  concept-memory pipeline and ATL internals in depth.
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md)
  — code-adjacent reference.
