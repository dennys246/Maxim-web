---
title: Imagination
description: How Maxim designs an ephemeral scene entity on the fly when perception mentions an object with no pre-authored component.
---

Maxim is a bio-inspired cognitive architecture. Most of what the agent can touch, swing, or open comes from pre-authored SEM components — sensor/modulator/failure-mode specifications curated ahead of time (see the [Component Library](/embodiment/component-library/)). But narratives and percepts do not stay inside the catalog. A story says *"you see a rusty gate,"* and there is no `rusty_gate` component anywhere on disk.

Imagination is the subsystem that handles that gap. When perception mentions something with no matching component, imagination designs an **ephemeral** SEM entity for it in real time, registers it for the current scene only, and marks everything it produces as imagined so the agent does not confuse a daydreamed object with a verified one.

This page describes what is actually wired today versus what is planned, using the integration report in [experiment 07](https://github.com/dennys246/Maxim/blob/main/docs/experiments/07_imagination_wiring.md).

## What it does

The agent perceives the world largely through text percepts. When a percept names a physical thing the agent might interact with, imagination asks a simple question: *do we already have a component for this?* If yes, it resolves to the existing component and stops. If no — and only under specific gating conditions — it calls an LLM to design a plausible SEM specification for the thing, registers it as a session-scoped scene entity, and lets the agent sense and act on it like any other object.

The honest framing matters here. An imagined entity is a **guess**, not a discovery. The subsystem is built so that guesses can be useful without being trusted: they live in a separate overlay, they are cleared at session end, and anything the agent learns from interacting with them is discounted (see [Provenance and decay](#provenance-and-decay)).

Today imagination fires only for the acting agent (the AUT) in simulation mode, and only when `--embodiment` supplies a `ComponentRegistry`. The orchestrator/planner agent does not get imagination — it plans, it does not act — and the embodied Reachy runtime does not yet construct the trigger either.

## The pipeline

The trigger fires once per agent tick, right after `state.update()`. Its stages:

```text
percept text
   │
   ▼
[1] entity extraction        extract_entity_phrases()
   │   SEM-relevant nouns: creatures, weapons, items, NPCs, features
   ▼
[2] ComponentIndex lookup    two-layer semantic discovery
   │   Layer 1: alias hash table            O(1) exact match
   │   Layer 2: embedding cosine similarity threshold 0.65
   │   → match found?  resolve to existing component, STOP
   ▼
[3] gating                   three constraints, all must pass
   │   mention threshold  (default 2)
   │   low-arousal Default Network gate
   │   energy budget      (skip when LLM energy < 10%)
   ▼
[4] EntityDesigner (LLM)     ImaginationDesigner → EntityDesigner
   │   one call → complete SEM spec, validated against SEM protocol
   ▼
[5] ephemeral registration   register_ephemeral()
       scene-scoped entity, sensable this session only
```

**1. Entity extraction.** `extract_entity_phrases()` uses lightweight heuristics — no external NLP model — with two parallel strategies: sentence-level introductory patterns (*"there is a glowing orb"*) and head-noun scanning against a curated indicator vocabulary (weapon, creature, door, chest). It pulls physical objects, creatures, weapons, environmental features, items, vehicles, and NPCs. It deliberately filters out abstractions, body parts, clothing, emotions, and time references — *"courage," "left arm," "leather boots," "dread," "morning"* never spawn entities.

**2. ComponentIndex two-layer lookup.** Before anything is designed, the candidate phrase is checked against existing components to avoid duplicating them. Layer 1 is an O(1) alias hash table over component names and the `synonyms` YAML field (*"sword" → weapons/rusty_sword*). Layer 2 is cosine similarity over component signature embeddings via the shared `similarity.encoder` singleton, with a match **threshold of 0.65** (*"old iron door" → environments/rusty_gate at 0.72*). Access is guarded by an `RLock`; persistence uses `.npy` + `.json` sidecars, not pickle. If either layer matches, the phrase resolves to the existing component and design never runs.

**3. Gating.** A novel phrase still has to clear three constraints before it costs an LLM call:

- **Mention threshold** — default **2** mentions before triggering, so a one-off phrase does not spawn an entity.
- **Low-arousal Default Network gate** — `imagination_allowed()` only opens during low-arousal idle states and blocks during high-arousal events. You do not daydream while fighting. This is the same Default Network machinery described under [Behaviors](/research/behaviors/overview/). Note: when no Default Network is present the gate is open by design.
- **Energy budget** — design is skipped when the LLM energy budget drops below **10% remaining**.

A per-phrase lock prevents concurrent LLM calls for the same entity phrase in multi-threaded runs.

**4. EntityDesigner.** `ImaginationDesigner` wraps `EntityDesigner` for a single LLM call that generates a complete SEM specification from the entity phrase, narrative context, genre, and in-scope components. The output is validated against the SEM protocol; an invalid spec falls back to verbal-only interaction rather than registering a broken entity. A designed spec carries the same shape as an authored one — typed sensors, modulators, and failure modes (e.g. a crystal formation with `stability`/`illumination`/`crystal_count` sensors, `swing`/`shatter_crystal` modulators, and `collapse`/`darkness` failure modes).

**5. Ephemeral registration.** `register_ephemeral()` places the designed entity in a separate `_ephemeral_index` overlay on the `ComponentRegistry`. During the session it is visible to `get()`, `has()`, and `query()` and is sensable via `sense`/`sense_presence`, exactly like a catalog component — but it lives only for this session.

## Provenance and decay

This is the honesty layer, and it is deliberate.

Everything imagination touches is tagged. Learning episodes carry `episode.metadata["imagined"] = True` and `episode.metadata["imagined_entity"]`, and causal links formed around imagined entities are marked `imagined=True`. Both `Episode.imagined` and `CausalLink.imagined` default to `False` and accept `True`.

At session end, the orchestrator runs a three-step cleanup:

```text
tag_imagined_links(entity_refs)   NAc retro-tags links by matching
                                  event signatures to imagined refs
      │
      ▼
decay_imagined_links(factor=0.5)  every imagined=True link:
                                  confidence *= 0.5
      │
      ▼
clear_ephemeral()                 ephemeral entities removed,
                                  scene tools deregistered
```

The 50% confidence decay is the point. If the agent "learned" that shattering an imagined crystal caused a collapse, that association is real learning — but it came from a thing the agent invented, not a thing it verified. Halving the confidence lets the partial learning survive into future sessions without letting imagined causality **harden into fact**. The ephemeral entities themselves are cleared entirely; only the discounted episodic/causal traces persist. This decay happens in the [Nucleus Accumbens](/systems/nucleus-accumbens/), where causal links and their confidences live.

## What is wired vs planned

Experiment 07 (the 0.7 integration PoC, dated 2026-04-20) reports the wiring passing its full test suite: integration tests, imagination unit tests, ComponentIndex discovery tests, and factory/simulation tests all green, plus a two-lens pre-merge audit.

**Wired today:**

- Entity extraction from percept text (`extract_entity_phrases()`).
- Two-layer ComponentIndex lookup (alias hash table + cosine at 0.65).
- Default Network arousal gate (`imagination_allowed()`), with the DN-None-means-open behavior confirmed as intentional.
- Session-scoped cache deduplication and thread safety (verified under 8 concurrent threads).
- Orchestrator wiring: the trigger is constructed only when a `ComponentRegistry` is present, and only on the AUT in sim mode.
- Session cleanup: `tag_imagined_links()` → `decay_imagined_links(0.5)` → `clear_ephemeral()`.
- **CausalLink** provenance (`imagined=True`) — including the fix for a critical gap where the field existed but no runtime path set it, which had made the decay dead code until `NAc.tag_imagined_links()` was added.

**Planned / not yet wired (per experiment 07):**

- **Episode provenance is not implemented.** Only `CausalLink` provenance is wired; tagging `imagined=True` on Episodes needs a hippocampus hook and is deferred. So the [Hippocampus](/systems/hippocampus/) receives imagined episodes but does not yet mark them at the Episode level.
- **Synchronous LLM design.** `process_percept()` blocks the agent loop thread on the EntityDesigner call (a 2–15s stall per novel entity). It is mitigated by the mention threshold and arousal gate; async dispatch is deferred to a later increment (0.8).
- **Reachy embodied runtime has no trigger yet.** The hardware runtime already has a `ComponentRegistry`, but constructing imagination there needs careful DN interaction testing on real hardware. Deferred to 0.8.
- **Scope limits:** sub-AUTs, CLI non-sim, and the headless `api.py` path do not get imagination.
- **Known rough edges:** the `ImaginationCache` is unbounded within a session, `ComponentIndex.add()` is O(N²) via `np.vstack` (acceptable under ~50 imagined entities/session), and CLI auto-curation builds a separate `ComponentRegistry` from the orchestrator's — curated components are re-discovered from disk but the two `ComponentIndex` instances do not share state.

## Module map

| Module | Purpose |
|--------|---------|
| `imagination/trigger.py` | Entity extraction, ComponentIndex lookup, gating, design dispatch |
| `imagination/designer.py` | `ImaginationDesigner` wrapping `EntityDesigner` |
| `imagination/cache.py` | Session-scoped, thread-safe `ImaginationCache` |
| `embodiment/component_registry.py` | `register_ephemeral()`, `clear_ephemeral()`, ephemeral overlay |
| `embodiment/component_index.py` | Two-layer semantic discovery (alias + embedding cosine) |
| `tools/registry.py` | Scene-scoped tool activation, active-tool cap |

## How it connects

- **[Component Library](/embodiment/component-library/)** — the catalog imagination checks first; a hit here means no design happens.
- **[Asset Foundry](/embodiment/asset-foundry/)** — the offline cousin. The foundry authors durable components ahead of time; imagination is the online, throwaway counterpart for things the foundry never anticipated.
- **[Hippocampus](/systems/hippocampus/)** — where imagined episodes are captured (Episode-level `imagined` tagging still pending).
- **[Nucleus Accumbens](/systems/nucleus-accumbens/)** — where imagined causal links form and where the 50% confidence decay is applied at session end.
- **[Behaviors](/research/behaviors/overview/)** — the Default Network arousal gate that decides when the agent is idle enough to daydream.
- **[Embodiment overview](/embodiment/overview/)** — how the SEM component model and the agent loop fit together.

## Going deeper

- [Imagination write-up](https://www.dennyschaedig.com/maxim/imagination) — the original article, with the full NLP heuristics and design-prompt detail.
- [`docs/experiments/07_imagination_wiring.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/07_imagination_wiring.md) — the 0.7 integration PoC report used to separate wired behavior from planned behavior on this page.
