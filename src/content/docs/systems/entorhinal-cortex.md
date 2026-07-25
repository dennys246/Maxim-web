---
title: Entorhinal cortex
description: The EC is Maxim's similarity and indexing gateway — it turns percepts into hashes and embeddings so memory can be matched by resemblance instead of exact keys.
---

Maxim is a bio-inspired cognitive architecture, and the Entorhinal Cortex (EC)
occupies the position its namesake does: everything on its way into or out of
episodic memory passes through it. In the repo's own summary table the EC is
"multi-modal similarity routing with Phase 4 neural embeddings." It stores
nothing durable about *what happened* — that is the
[Hippocampus](/systems/hippocampus/) — and nothing about *what things mean* —
that is the [ATL](/systems/anterior-temporal-lobe/). What it owns is the
representation that makes both searchable.

## What it does

An exact-match index answers "have I seen this string before." That is nearly
useless for an agent, because the same situation almost never arrives twice in
the same words. The EC's job is to make *resemblance* a cheap lookup: to encode
a percept, an utterance, or a stored memory into a form where "find the coffee
mug" and a memory about a cup land close enough together to be retrieved by one
query.

It does this on two separate tracks, and keeping them distinct is the single
most useful thing to understand about the system:

- **A structural track.** MinHash + locality-sensitive hashing over tokens.
  Always available, no model download, no optional dependencies. It approximates
  Jaccard overlap.
- **A neural track.** Sentence-transformer embeddings hashed into LSH buckets.
  Optional, model-backed, and it is what lets "mug" match "cup" at all.

The structural track degrades to nothing gracefully because it *is* the floor.
The neural track is additive, and when its dependencies are absent the system
keeps running with less recall rather than failing.

## How it works

### Structural similarity: MinHash + LSH

Two `SimilarityIndex` instances (`maxim/memory/context_index.py`) provide O(1)
approximate similarity lookup:

| Index | Purpose | Used by |
| --- | --- | --- |
| `context_index` | Language/context similarity | `AssociationIndex.find_similar()`, `ConsolidationOrchestrator` |
| `percept_index` | Percept similarity | `recall_deep`, chronic recurrence detection |

```python
from maxim.memory.context_index import SimilarityIndex

index = SimilarityIndex(num_hashes=64, num_bands=8)
index.register("mem_1", "the robot saw a person near the table")
results = index.query_similar("person at the table", min_similarity=0.3)
# Returns [(memory_id, estimated_jaccard_similarity), ...]
```

The defaults are 64 hash functions banded into 8 bands. This index replaced the
older keyword-Jaccard implementation inside `AssociationIndex.find_similar()`
and the O(n) linear scans in `hippocampus.recall_similar()` — the win is that
recall stops scaling with the number of stored memories.

### Neural similarity: NeuralSemanticLSH and EmbeddingStore

The neural path lives in `maxim/similarity/semantic.py` and is documented as
"Phase 4":

| Component | Purpose |
| --- | --- |
| `NeuralSemanticLSH` | Neural embedding plus LSH hashing via random hyperplanes |
| `EmbeddingStore` | Embedding storage with on-disk persistence |
| `SemanticEmbedderConfig` | Configuration for the embedder |

```python
from maxim.similarity import ECConfig, EntorhinalCortex

ec = EntorhinalCortex(ECConfig(
    enable_semantic=True,
    semantic_model="all-MiniLM-L6-v2",   # default, 80MB
    async_embedding=True,                # non-blocking capture
    require_gpu=False,
    semantic_hash_bits=16,
))

results = ec.find_semantic("find the coffee mug", k=10)
```

Embedding is written on the capture path, not the query path:

```
Memory capture
      |
Hippocampus.capture()
      |
_on_memory_captured callback
      |
NeuralSemanticLSH.schedule_embedding()
      |
[background thread]
      |
EmbeddingStore.set(memory_id, embedding, hash)
      |
Semantic queries work
```

That indirection is why `async_embedding=True` is the recommended default:
capture returns in under a millisecond on both CPU and GPU because the forward
pass happens off-thread.

### Model choices and measured cost

The repo documents three model options:

| Model | Size | Latency (CPU) | Latency (GPU) | Quality |
| --- | --- | --- | --- | --- |
| `all-MiniLM-L6-v2` | 80 MB | ~15 ms | ~2 ms | Good (default) |
| `all-mpnet-base-v2` | 420 MB | ~50 ms | ~8 ms | Best |
| `paraphrase-MiniLM-L3-v2` | 45 MB | ~8 ms | ~1 ms | Acceptable |

Per-operation latency: capture (async) under 1 ms on either device; embedding
and query ~2 ms on GPU and ~15 ms on CPU; hash comparison O(1). The validated
benchmark table records a P99 query-latency target of under 50 ms met at
**~10 ms on GPU**, capture throughput at 30 Hz via async, memory stable at 10K
memories, model load ~2–3 s against a 5 s target, and ~200 MB of GPU memory
against a 4 GB budget.

Footprint, as documented: ~80 MB for the MiniLM model, ~384 bytes per embedding
(float32), ~4 MB of embeddings at 10K memories, and ~2 bytes of hash bits per
memory.

### Persistence

Embeddings survive restarts. `MemoryHub.on_session_start()` loads them and
`on_session_end()` saves them, to `~/.maxim/util/semantic_embeddings.npz` by
default — a numpy compressed archive with `memory_ids`, `embeddings`,
`hashes_json`, and `version` keys.

### Graceful degradation

The optional dependency chain is real and the code expects it to be missing:

```bash
pip install 'pymaxim[semantic]'
```

```python
from maxim.similarity import is_gpu_available, is_semantic_available

if is_semantic_available():   # sentence-transformers importable
    ...
if is_gpu_available():        # CUDA present
    ...
```

When semantic is unavailable or simply switched off, `ec.find_semantic()`
returns an empty list rather than raising, and the EC falls back to structural
similarity. The documented calling pattern checks first:

```python
if hub.semantic_enabled:
    results = hub.find_semantic(query, k=10, threshold=0.5)
else:
    results = hub.get_plan_templates(query)
```

The repo also notes that CPU-only mode may disable semantic entirely for
performance reasons, which is what `require_gpu` exists to enforce.

## Concept decomposition

There is a second encoder in the same package, and it is not doing search. The
substrate path's `LinguisticEncoder` (`maxim/similarity/encoder.py`) performs
*pattern completion*: deciding whether a new percept refers to a concept the
substrate already holds or a genuinely new one, via
`ec.pattern_complete_or_separate(embedding, modality)`.

| | Phase 4 (`NeuralSemanticLSH`) | Substrate (`LinguisticEncoder`) |
| --- | --- | --- |
| Purpose | Semantic search over memories | Pattern completion for concept recognition |
| Model | `all-MiniLM-L6-v2` | `paraphrase-mpnet-base-v2` |
| Output | Similarity scores for ranking | Complete to existing node, or create new |
| Storage | `EmbeddingStore` (flat index) | EC substrate nodes (centroid-updated) |

The model choice was measured rather than assumed. The P1 recognition sweep
compared three candidates on collapse rate and cross-cluster contamination:
`all-mpnet-base-v2` at 84.1% / 1.7%, `paraphrase-MiniLM-L6-v2` at 86.0% / 5.0%,
and `paraphrase-mpnet-base-v2` at 93.5% / 3.3%. The last was selected because it
was trained on paraphrase detection, which is literally the task. Substrate
nodes then keep a running centroid over their members:

```
new_centroid = (old_centroid × n + new_embedding) / (n + 1)
```

That mechanism added a further +4.7 percentage points.

**Decomposition** sits above the encoder. Rather than encoding a whole sentence
as one opaque node, `ConceptDecomposer` (`maxim/similarity/decomposer.py`)
splits it into concept-level chunks first:

```
Input: "I see a blue mug on the table next to the red plate"
                    |
          ConceptDecomposer
                    |
         ["blue mug", "table", "red plate"]
                    |
    LinguisticEncoder (embeds each chunk)
                    |
    EC (pattern complete or separate, per chunk)
                    |
    Hippocampus (all chunks land in the same episode
                 and get Hebbian-bound together)
```

The default strategy is `SpaCyNounChunkStrategy`, using spaCy's noun chunker
with `en_core_web_sm`; `IdentityStrategy` is the fallback when spaCy is not
installed. Noun phrases are the payload — pronouns, determiners, and bare verbs
are deliberately dropped as substrate noise. Decomposition applies to
text-modality percepts only; CLIP visual embeddings, proprioceptive readings,
and SEM affordance labels bypass it at the encoder level.

**Both flags are still opt-in and default off**, and both are required:

| Variable | Default | Description |
| --- | --- | --- |
| `MAXIM_CONCEPT_DECOMPOSITION` | off | Set to `1` to enable decomposition |
| `MAXIM_SUBSTRATE_PATH` | off | Must also be `1` (substrate encoding prerequisite) |

```bash
pip install 'pymaxim[semantic]'
python -m spacy download en_core_web_sm
MAXIM_SUBSTRATE_PATH=1 MAXIM_CONCEPT_DECOMPOSITION=1 maxim --llm mistral-7b
```

Documented limitations: English only (spaCy `en_core_web_sm`), possible
over-decomposition of short fragments (mitigated by `min_chunk_len`, default 2),
and no relation tagging yet — chunks are bound with untagged Hebbian edges.

## How it connects

The EC is a hub spoke, not an endpoint. Direction matters:

```
   Hippocampus.capture()  ──capture callback──▶  EC embedder (background)
   Hippocampus.recall_*   ◀──candidate ids────  EC / SimilarityIndex
   LinguisticEncoder      ──pattern complete──▶  EC substrate nodes ──▶ ATL
   MemoryHub              ──session lifecycle──▶ EmbeddingStore load/save
```

- **Hippocampus → EC (write).** Capture fires `_on_memory_captured`, which
  reaches `MemoryHub._on_memory_captured()` and schedules an embedding on the
  embedder's own thread pool. The Hippocampus never blocks on it.
- **EC → Hippocampus (read).** `recall_deep` and chronic-recurrence detection
  query `percept_index`; `AssociationIndex.find_similar()` queries
  `context_index`. Semantic queries return `(memory_id, similarity)` pairs the
  Hippocampus then resolves to records. See [Hippocampus](/systems/hippocampus/).
- **EC → ATL (grounding).** The substrate encoder's complete-or-separate
  decision is what keeps concept identity stable across sessions and phrasings,
  and ATL's `SemanticMemory` records carry an `embedding_text` field described
  as "text used for EC similarity matching." Without EC, ATL would have to match
  concepts by string.
- **EC ↔ NAc.** `LinguisticEncoder` is constructed with `ec`, `atl`, and `nac`.
  With decomposition on, valence annotation lands on individual concept nodes —
  the agent learns "rusty sword is associated with pain" rather than tagging a
  whole sentence. See [NAc](/systems/nucleus-accumbens/).
- **MemoryHub.** Owns the wiring and the lifecycle: it registers the capture
  callback, exposes `hub.find_semantic()` and `hub.semantic_enabled`, and loads
  and saves the `EmbeddingStore` at session boundaries. It stores nothing
  itself. See [Systems overview](/systems/overview/).

For the storage side — tiers, decay, consolidation policy — see
[Memory systems](/memory/overview/). For where the EC sits relative to the agent
pipeline, see [Architecture](/concepts/architecture/).

## Going deeper

- [`docs/semantic_similarity_analysis.md`](https://github.com/dennys246/Maxim/blob/main/docs/semantic_similarity_analysis.md)
  — the deepest EC source: `NeuralSemanticLSH`, `EmbeddingStore`, the model
  comparison tables, the validated benchmarks, and the substrate encoder
  contrast.
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md)
  — the Similarity Indices (LSH) section and the EC entries in the memory-system
  integration table.
- [`docs/user/concept-decomposition.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/concept-decomposition.md)
  — decomposition strategies, the modality gate, config, and limitations.
- [Semantic memory](https://www.dennyschaedig.com/maxim/semantic-memory) — the
  narrative framing of the memory layers around the EC.
