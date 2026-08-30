---
title: Concept decomposition
description: The opt-in pre-processor that splits text percepts into noun-phrase concepts before they are encoded into the substrate — why sentence-sized nodes break cross-session and cross-modal recall, what gets extracted, the pluggable strategies, and how to enable it.
---

When you hear "I see a blue mug on the table", your brain does not file the sentence. It activates *mug* and *table*, each of which is already tied to other memories, feelings, and motor programs. Maxim's substrate path has the same need: an episode encoded as one sentence-sized node cannot be reached from a bare `"mug"` seen in another session or from a camera frame of a mug. **Concept decomposition** is the text pre-processor in the [bio-inspired cognitive architecture](/systems/overview/) that breaks a text percept into concept-level chunks *before* the [entorhinal cortex](/systems/entorhinal-cortex/) decides whether each one is something the substrate already knows.

It lives in `src/maxim/similarity/decomposer.py`, beside the encoder it feeds.

## The problem it solves

Without decomposition the Hippocampus sees sentences as atomic blobs. `"I see a blue mug"` will not reliably pattern-complete against a `"mug"` node from a previous session, so the Hebbian edge from *mug* to the vision embedding of a mug is unreachable from the sentence node — cross-modal retrieval silently fails for naturalistic input. With decomposition, `"blue mug"` is its own substrate node that can bind to vision-mug across episodes.

That matters most for three things this site makes claims about:

- **Cross-modal retrieval** — matching text descriptions to visual memories.
- **[Cross-session learning](/research/experiments/cross-session-learning/)** — recognising the same concept described differently in different sessions.
- **Pain and reward association** — finer-grained targets for valence, so a negative signal attaches to a *rusty sword* node rather than to a whole sentence about picking one up.

## How it works

```
Input: "I see a blue mug on the table next to the red plate"
                    |
          ConceptDecomposer
                    |
         ["blue mug", "table", "red plate"]
                    |
    LinguisticEncoder (embeds each chunk)
                    |
    EC (pattern-complete or separate, per chunk)
                    |
    Hippocampus (all chunks land in the same episode
                 and are Hebbian-bound together)
```

The key property is that **nothing below the decomposer changes**. EC pattern completion, Hippocampal binding, cross-modal retrieval, NAc reward modulation, persistence — all unchanged. Decomposition is purely additive pre-processing, which is also why it can be switched off without touching anything else.

### What gets extracted

Noun phrases are the payload, from spaCy's noun chunker:

| Input | Extracted concepts |
| --- | --- |
| `"I see a blue mug on the table"` | `["blue mug", "table"]` |
| `"The red plate is next to the green cup"` | `["red plate", "green cup"]` |
| `"The rusty sword feels heavy"` | `["rusty sword"]` |
| `"lotus"` (a bare class name) | `["lotus"]` — identity, nothing to decompose |

Pronouns (*he*, *it*), determiners (*the*, *a*), and bare verbs (*see*, *go*) are dropped: they carry no concept-level meaning and would be noise in the substrate. A chunk that is entirely determiners or pronouns is skipped, and chunks shorter than `min_chunk_len` (default 2 characters) are filtered. If no noun chunk is found — a single word, an imperative — the whole text is returned as one chunk, so the encoder always gets at least one node.

### Relation labels

Each chunk also carries a coarse `relation` label read off the dependency parse — `spatial`, `temporal`, `possessive`, `action`, or `descriptive` — refined for prepositional objects by the preposition itself (*on* → spatial, *before* → temporal, *of* → possessive; an unknown preposition leaves the edge untagged). The encoder collects these into a node-pair → relation map that it hands to the Hippocampus with the capture event. The labels are syntactic and coarse; nothing on this site claims a behavioural result from them.

### The modality gate

Decomposition applies to **text-modality percepts only**. CLIP embeddings from vision, proprioceptive readings, and SEM affordance labels bypass it at the encoder level — `LinguisticEncoder` only decomposes when a decomposer is wired *and* the modality is `"text"` — so callers never need to check.

## Enabling it

Both switches are opt-in and default off, and both are required:

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAXIM_SUBSTRATE_PATH` | off | Enables substrate encoding at all — the prerequisite |
| `MAXIM_CONCEPT_DECOMPOSITION` | off | Set to `1` to decompose text percepts on that path |

The spaCy strategy needs the `semantic` extra (which brings spaCy in, and also torch — it is not a small install) plus the English model:

```bash
pip install 'pymaxim[semantic]'
python -m spacy download en_core_web_sm
MAXIM_SUBSTRATE_PATH=1 MAXIM_CONCEPT_DECOMPOSITION=1 maxim --llm mistral-7b
```

Without `MAXIM_CONCEPT_DECOMPOSITION=1` the substrate path encodes whole text exactly as before. With the flag set but spaCy missing, the decomposer logs an optional-dependency warning and falls back to the identity strategy.

## Strategies

The decomposer is a thin coordinator over a `DecompositionStrategy` protocol — anything with `extract(text) -> list[ConceptChunk]` — so the NLP backend can be swapped without touching the pipeline.

| Strategy | Role |
| --- | --- |
| `SpaCyNounChunkStrategy` | Default. Lazy-loads `en_core_web_sm` on first call, thread-safe; strips determiners; labels relations |
| `IdentityStrategy` | Fallback. Returns the input unchanged as a single chunk — used when spaCy is absent or `enabled=False` |
| `AffordanceDecompositionStrategy` | Not for prose. Splits underscore-joined SEM affordance identifiers — `fire_breath` → `["fire breath", "fire", "breath"]` — so affordance names get concept nodes too; used by bio-enrichment and the discovery tools |

`ConceptChunk` is a frozen dataclass with `text`, an optional character `span`, a `confidence` (default 1.0), and the optional `relation`; downstream code reads `chunk.text`.

```python
from maxim.similarity.decomposer import (
    ConceptDecomposer,
    ConceptChunk,
    DecomposerConfig,
)
from maxim.similarity.encoder import LinguisticEncoder


class MyDomainStrategy:
    """Domain-specific extraction — regex, an LLM, whatever fits."""

    def extract(self, text: str) -> list[ConceptChunk]:
        return [ConceptChunk(text="concept", span=(0, 7))]


# Swap the backend...
decomposer = ConceptDecomposer(strategy=MyDomainStrategy())

# ...or keep spaCy and tune it
decomposer = ConceptDecomposer(config=DecomposerConfig(enabled=True, min_chunk_len=3))

# Wire it into the encoder; encode_decomposed returns one node id per chunk
encoder = LinguisticEncoder(ec=ec, atl=atl, nac=nac, decomposer=decomposer)
node_ids = encoder.encode_decomposed(
    "I see a blue mug on the table",
    modality="text",
    agent_id="agent-1",
)
# node_ids → ["<uuid for blue mug>", "<uuid for table>"]
```

`DecomposerConfig` has three fields: `enabled` (master toggle; the environment variable is the production way to set it), `min_chunk_len` (default 2), and `spacy_model` (default `en_core_web_sm`).

## Limitations

- **English only.** `en_core_web_sm` is an English model. Other languages need a multilingual model (`xx_ent_wiki_sm`) or per-language selection, neither of which is wired.
- **Short fragments may over-decompose.** `min_chunk_len` helps; domain-specific input may need a custom strategy.
- **Relation labels are coarse** and untested for effect — treat them as metadata, not a mechanism with evidence behind it.

## Where it sits among the memory systems

Two different things in Maxim make "concepts", and they are easy to conflate:

- **This decomposer** runs on the *substrate path*, on text percepts, before EC pattern completion — its output is substrate nodes in the same episode.
- **The [ATL](/systems/anterior-temporal-lobe/)'s `ConceptExtractor`** runs on captured episodes — detected objects, people, goal tokens, tool names — and promotes recurring ones into semantic memory.

They are complementary rather than redundant: the decomposer makes finer-grained nodes for the substrate to bind and annotate; the ATL distils stable knowledge out of many episodes. The connection to valence is the one with a worked demonstration: with decomposition on, [valence annotation](https://github.com/dennys246/Maxim/blob/main/docs/experiments/valence_annotation_poc.md) lands on individual concept nodes such as *rusty sword* rather than on a sentence. Read that PoC for what it is — two scripted episodes, one agent, no LLM — showing pain in episode 1 annotating the edges co-activated *within that episode*, and a neutral episode 2 left unannotated. It does not show the signal following a concept into a new context, and agent-level consumption of valence is listed there as future work. In production the effect is smaller still: `apply_hebbian_on_close` is [dormant on the main percept path](https://github.com/dennys246/Maxim/blob/main/docs/bugs/README.md) — the hub stashes one substrate node per percept, so the `len(nodes) < 2` early return is taken every time and the binding graph never grows from percepts.

## Going deeper

- [Entorhinal cortex](/systems/entorhinal-cortex/) — the encoder contrast (semantic search vs. pattern completion) that decomposition feeds.
- [Anterior temporal lobe](/systems/anterior-temporal-lobe/) — the other concept pipeline, from episodes to semantic memory.
- [Memory & consolidation](/memory/overview/) — the substrate path in context.
- [`docs/user/concept-decomposition.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/concept-decomposition.md) — the engine's user doc, the source for this page (its limitations list predates the relation labels described above).
- [`src/maxim/similarity/decomposer.py`](https://github.com/dennys246/Maxim/blob/main/src/maxim/similarity/decomposer.py) — the strategies and the relation classifier.
