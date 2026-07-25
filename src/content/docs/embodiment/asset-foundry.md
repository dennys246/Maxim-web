---
title: Asset Foundry
description: Maxim's autonomous LLM pipeline that generates, validates, exercises, and scores new SEM components — expanding the component library without hand-authoring YAML.
---

Maxim is a bio-inspired cognitive architecture. Everything the agent can touch, swing, or open comes from a **Sensor-Entity-Modulator (SEM) component** — a YAML specification of the sensors an object exposes, the affordances it offers, and the failure modes it can hit (see the [SEM protocol](/embodiment/sem-protocol/)). Authoring one by hand is fine once. It is tedious the tenth time you need a weapon, a creature, or a dungeon corridor.

The **Asset Foundry** is Maxim's answer: an autonomous pipeline that takes a theme prompt and produces validated, tested, scored SEM components — no hand-authored YAML required. Along the way it stress-tests the bio-stack against novel entity designs, so a generated component is not just syntactically valid but demonstrably exercises the memory, learning, and pain machinery it is supposed to.

## What it does

Give the foundry a theme (`"cyberpunk weapons"`), an optional genre and category, and a count. It generates that many candidate SEM specs, throws out the malformed ones, runs the survivors through structural tests and a three-encounter gauntlet against a fresh bio-stack, scores each one on how much cognitive engagement it produced, and sorts the results into promote / review / reject buckets.

The output is a set of durable, library-ready components. A manual foundry run **never** auto-commits to your component library — top scorers land in a run directory for human review, and you copy the ones you want into `~/.maxim/components/`, where the ComponentRegistry discovers them by name. (The one exception, `--auto-curate`, is covered below.)

## The pipeline

The foundry runs four phases in sequence. The primary source labels them **F-0 through F-3**:

```text
theme prompt
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│ F-0  Generation      EntityDesigner → candidate YAML       │
│                      (LLM creative, or template fallback)  │
└──────────────────────────────────────────────────────────┘
     │  candidates/
     ▼
┌──────────────────────────────────────────────────────────┐
│ F-1  Validation      schema + sensor/affordance/failure    │
│                      sanity  ──✗──►  rejected/             │
└──────────────────────────────────────────────────────────┘
     │  valid specs
     ▼
┌──────────────────────────────────────────────────────────┐
│ F-2  SEM tests +     8 structural tests, then a            │
│      Gauntlet        3-encounter gauntlet on a fresh       │
│                      bio-stack (Hippocampus, NAc, PainBus) │
└──────────────────────────────────────────────────────────┘
     │  results/
     ▼
┌──────────────────────────────────────────────────────────┐
│ F-3  Scoring +       rank on 4 dimensions → buckets        │
│      Curation        promote / review / reject             │
└──────────────────────────────────────────────────────────┘
     │
     ▼
promoted/   (top scorers, awaiting human review)
```

**F-0 — Generation.** The `EntityDesigner` turns the theme, genre, and category into candidate SEM specs. With a configured LLM it generates creatively, guided by the SEM schema; without one it falls back to templates with sensible per-entity-type defaults, so the foundry runs even with no model at all. Each candidate gets a unique name and genre tags and is written to `~/.maxim/foundry/{run_id}/candidates/`. Sub-themes rotate automatically to avoid repetition (e.g. `"close-range melee"`, `"long-range with overheating"`, `"stealth with limited charges"`).

**F-1 — Validation.** Malformed or nonsensical specs are rejected before any simulation cost is spent. The checks:

| Check | What it catches |
|-------|-----------------|
| Schema | Missing required fields (name, sensors, modulators) |
| Sensor sanity | Reversed ranges, initial value outside range, zero-width ranges |
| Affordance sanity | Empty modulators, missing descriptions |
| Failure-mode sanity | Triggers referencing nonexistent sensors, pain outside `[0,1]` |
| Semantic sanity | Very large range spans, unreachable failure thresholds |

A candidate that fails any check **drops out here** — it is moved to `rejected/` with its error details attached, and never reaches simulation.

**F-2 — SEM protocol tests + gauntlet.** Survivors first pass **8 structural tests** (fast, no LLM): instantiation via `_parse_entity()`, sensor initialization within range, affordance enumeration with descriptions, tool generation without collisions, failure-mode trigger validation, entity-tree composition via `walk()`, vital-metrics population, and embodiment wrapping. Then each runs a **3-encounter gauntlet** that actually exercises the bio-stack:

1. **Discovery** — observe the entity's sensors through its sense tools.
2. **Interaction** — invoke affordance tools and check that the [Nucleus Accumbens](/systems/nucleus-accumbens/) forms causal links.
3. **Stress** — push sensors toward failure thresholds and verify the pain cascade fires.

Every gauntlet gets a **fresh bio-stack** (Hippocampus, NAc, PainBus) for isolation — zero state leakage between candidates. A candidate that crashes here on infrastructure (setup errors) is logged separately: **infra failures are not candidate failures**.

**F-3 — Scoring + curation.** Each candidate is ranked on four weighted dimensions:

| Dimension | Weight | Measures |
|-----------|--------|----------|
| Hippocampal engagement | 30% | Did the agent remember this entity? |
| Causal learning | 30% | Did the NAc learn cause→effect from it? |
| Pain / failure activation | 20% | Did failure modes fire and pain cascade? |
| Affordance usage | 20% | How many affordances were actually used? |

Scores sort candidates into buckets: **promote** (score > 0.7, ready for human review), **review** (0.4–0.7, interesting but flawed), and **reject** (< 0.4, low engagement or broken). Before promotion the foundry also runs a dedup check against the existing library (see [Quality & honesty](#quality--honesty)).

Every run produces a self-contained directory:

```text
~/.maxim/foundry/{run_id}/
  config.yaml     # theme, genre, count, model
  candidates/     # raw generated YAML specs
  rejected/       # failed validation, with error details
  results/        # per-candidate gauntlet results + scores
  promoted/       # top scorers (awaiting human review)
  scores.json     # machine-readable scoring summary
  report.md       # human-readable report
```

## Running it

The foundry is driven through the `maxim` CLI (from the `pymaxim` package). These commands are verified against the primary source:

```bash
# Template-based, no LLM needed — 10 fantasy weapons
maxim --foundry "medieval weapons" --foundry-genre fantasy --foundry-category weapons

# Mixed components for a theme
maxim --foundry "underwater civilization" --foundry-count 20 --foundry-genre fantasy

# Dry run — generate + validate only, skip the gauntlet
maxim --foundry "horror creatures" --foundry-count 5 --foundry-genre horror --foundry-dry-run

# With an LLM for creative generation
maxim --foundry "cyberpunk weapons" --foundry-genre cyberpunk --foundry-category weapons --llm mistral-7b
```

The flags:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--foundry` | str | — | Theme prompt |
| `--foundry-count` / `--count` | int | 10 | Components to generate |
| `--foundry-genre` | str | fantasy | Genre tag |
| `--foundry-category` | str | auto | weapons, creatures, npcs, items, environments, vehicles, bodies |
| `--foundry-dry-run` | flag | off | Generate + validate only |

**Model requirements.** No LLM is required — F-0 falls back to templates, and F-1 validation, the SEM tests, and the gauntlet use no model at all. An LLM is only used to generate creatively in F-0; pass one with `--llm` (e.g. `mistral-7b`).

**Auto-curation.** `--auto-curate` runs the foundry *before a sim starts* to fill genre/category coverage gaps, and — as the one exception to the no-auto-commit rule — promotes high scorers (≥ 0.7) directly into `~/.maxim/components/` for the current session. It requires `--embodiment` to supply genre context:

```bash
maxim --sim "test sword combat" --embodiment weapons/rusty_sword --auto-curate
maxim --sim "explore dungeon" --embodiment environments/dungeon_corridor \
  --auto-curate --curate-threshold 8
```

The scoring rubric is also extensible from Python via `ScoringConfig` (imports are always `maxim`, the package is `pymaxim`):

```python
from maxim.simulation.foundry import FoundryRunner, ScoringConfig

config = ScoringConfig(
    dimensions={
        "hippocampal_engagement": 0.25,
        "causal_learning": 0.25,
        "pain_failure": 0.25,
        "affordance_usage": 0.25,
    },
    promote_threshold=0.6,
    reject_threshold=0.3,
)

runner = FoundryRunner(theme="test weapons", genre="fantasy", scoring_config=config)
result = runner.run(count=5)
```

## Quality & honesty

It is worth being precise about what a foundry run does and does not guarantee.

**Validation (F-1) guarantees structure, not good design.** Passing F-1 means the spec is schema-complete and internally coherent — no reversed sensor ranges, no failure triggers pointing at sensors that do not exist, pain values in `[0,1]`. It does *not* mean the entity is interesting or well-balanced. That is what the gauntlet and scoring are for.

**The gauntlet and scores are engagement signals, not correctness proofs.** A high score means the entity produced memory formation, causal learning, failure activation, and affordance use *in three scripted encounters against a fresh bio-stack*. It is a strong signal that the component exercises the cognitive machinery — but the buckets exist precisely because the pipeline does not trust itself to ship autonomously. Promotion (> 0.7) means "ready for a human to look at," not "verified good." Manual runs deliberately stop at `promoted/` and require you to copy the file into your library.

**Generated components pass the same validation as hand-written ones** — there is no relaxed path for machine-authored YAML.

**Dedup, not novelty guarantee.** Before promoting, the foundry calls `ComponentIndex.dedup_check(spec, threshold=0.80)`; a candidate with cosine similarity ≥ 0.80 to an existing component is skipped with a log line. This avoids near-duplicates but does not certify genuine originality.

**On cost figures.** The source publishes a cost table, and its numbers only make sense with their conditions attached: generation is *roughly* 500 tokens (~$0.00 local, ~$0.005 cloud) *per entity*; the gauntlet, validation, and SEM tests use no LLM and cost nothing; a *typical 10-entity run* is quoted at 3–5 min / $0.00 local or ~$0.05 cloud. These are order-of-magnitude estimates for a specific run size and model tier, not guarantees — treat them as such.

## How it connects

- **[Component library](/embodiment/component-library/)** — the destination. Promoted specs become library components discovered by the ComponentRegistry, and their `synonyms` feed the ComponentIndex alias table for natural-language lookup.
- **[SEM protocol](/embodiment/sem-protocol/)** — the output format. Every candidate is a SEM spec, validated against the same schema as hand-authored entities.
- **[Imagination](/embodiment/imagination/)** — the realtime cousin. The foundry authors *durable* components offline, ahead of time; imagination designs *ephemeral*, throwaway entities online when a percept mentions something no component covers. Same `EntityDesigner` underneath, opposite ends of the time axis.
- **[Embodiment overview](/embodiment/overview/)** — how the SEM component model and the agent loop fit together.

## Going deeper

- [Embodiment write-up](https://www.dennyschaedig.com/maxim/embodiment) — the Asset Foundry section, framed against the 0.6/0.7 release milestones and imagination.
- [`docs/user/asset-foundry.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/asset-foundry.md) — the primary source: full phase-by-phase reference, output structure, and invariants.
- [`docs/embodiment_yaml_reference.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment_yaml_reference.md) — the component YAML format the foundry emits.
- [Maxim on GitHub](https://github.com/dennys246/Maxim) — the source repository.
