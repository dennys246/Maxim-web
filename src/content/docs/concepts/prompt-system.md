---
title: Prompt system
description: How Maxim composes the LLM's context each turn — the prioritised sections, the token budget that truncates and drops them, where recalled memory, body state, drives, and learned valence enter, how tools are injected and described, and the Acting Coach.
---

Every turn of the agent loop ends in one prompt. Everything the [bio-inspired cognitive architecture](/concepts/architecture/) has to say to the language model — what it remembers, what its body feels, which tools it may call, what it learned the last time it tried something — is rendered into named text sections, and a budgeter decides which of them fit. This page is about that assembly: the sections, their priorities, where each bio-system's output lands, and what gets cut when the context window is tight.

The framing matters for reading the rest of the site honestly. In the default LLM-primary path the substrate *augments* the model's context; it does not override the model's priors. What follows is exactly the surface through which that influence is exerted, which is why [Evidence](/research/evidence/) is careful to say *influenced* rather than *controlled*.

## The assembly and the budget

`PromptBuilder` (`src/maxim/agents/prompt_builder.py`) is the single composition point. It adds sections to a `PromptBudgeter` (`prompt_budgeter.py`), each with a name, a priority, and optionally a truncation function; the budgeter then fits them into the space that is left after the model's response reserve:

```
prompt_budget = n_ctx − response_reserve (mode.max_response_tokens) − template_overhead (100)
```

Sections are processed by tier — `MANDATORY`, then `CRITICAL`, `IMPORTANT`, `NICE_TO_HAVE` — and within a tier in insertion order. A section that does not fit is *truncated* first if it is truncatable (conversation drops its oldest turns, the tool manifest loses examples, memory lists lose entries) and dropped only if it still cannot meet its minimum. The final text keeps the original insertion order, and when anything was dropped the prompt starts with a note the model can see:

```
[Context note: omitted due to token budget: mode_context, speech, statistical_patterns]
```

That note is the practical answer to "why did the agent forget the mode rules on a long conversation with a 4K model": the rules were `NICE_TO_HAVE`, and they went first.

### The cacheable prefix

Since the prompt-caching work, every section is also tagged stable or dynamic. Sections that cannot change within a session — instructions, identity, the unfiltered tool manifest, the entity's SEM context, the constitution, mode context — are budgeted first, as a byte-identical prefix capped at 70% of the prompt budget, and the router sends that prefix as the system message so a provider can cache it. Per-turn content (memories, body state, observations, the conversation) is budgeted into the remainder. The engine treats "the system prompt is byte-stable across turns" as an invariant with a regression test; a new section defaults to dynamic.

## What goes in, and at what priority

The table lists every section the 1.1.1 builder can add, grouped the way the code adds them. "When" says what has to be true for the section to exist at all — an empty section is skipped silently.

| Section | Priority | When | Content |
| --- | --- | --- | --- |
| `instructions` | MANDATORY | always | Response-format rules — the JSON action schema for the current autonomy level |
| `user_request` | MANDATORY | there is a percept/goal | `=== User Request ===` and the triggering text |
| `planning_banner` | CRITICAL | always | Planning-vs-execution banner for the autonomy level |
| `modification` | CRITICAL | a pending self-modification | The proposed change awaiting approval |
| `identity` | CRITICAL | always | "You are Maxim…", `=== OPERATIONAL STATE ===` (mode, autonomy level, AWAKE/SLEEP), plus the **SIMULATION ENVIRONMENT** block when a sim is active and the **INTERACTIVE MODE** block when a human is present — kept here so neither can be budget-dropped |
| `tools` (+ `tools_background`) | CRITICAL (+ IMPORTANT) | always | `=== Available Tools ===`; see [tool injection](#tool-injection) |
| `failed_tools` | CRITICAL | experimental hint enabled and failures recorded | Recently hallucinated tool names |
| `workspace_manifest` | CRITICAL | a mode with a workspace | Files in the effective working directory |
| `realtime_hint` | CRITICAL | the request needs live data | Nudge toward `internet_search` |
| `pfc_preamble` | IMPORTANT | deliberation active | Inner-monologue framing from [deliberation](#deliberation) |
| `acting_coach` | CRITICAL | an Acting Coach config is set (CLI and sim orchestrator set one) | See [the Acting Coach](#the-acting-coach) |
| `entity_context` | IMPORTANT | the agent is embodied | Auto-composed summary of the body's SEM spec: sensors, affordance descriptions, failure triggers |
| `cluster_bias_annotations` | IMPORTANT | NAc has per-tool reward bias | Agent-wide aggregated reward bias per tool, with credit provenance |
| `grayscale_tools` | IMPORTANT | substrate favours a tool that is not in the active scene | "Knowable but absent" tools, so the model can reach for an equivalent |
| `tool_guidance_core` / `_extended` | IMPORTANT / NICE_TO_HAVE | always | Parameter examples and selection guidance, split so the essential half survives pressure |
| `datetime` | IMPORTANT | always | Current date and time |
| `budget_context` | NICE_TO_HAVE | cost tracking on | Spend rates, active budget tier, hours until limits |
| `conversation` | IMPORTANT | history exists | `=== Conversation History ===`, pre-compacted to a turn cap that scales with `n_ctx` (smaller when embodied, because bio sections compete for the same budget) |
| `context_pool` | IMPORTANT | pooled context exists | `=== Context ===` — the multi-agent [context pool](#where-memory-enters) |
| `active_protocols` | IMPORTANT | a skill/protocol is active | Its injected context |
| `reasoning_carryover` | IMPORTANT | prior reasoning carried | Compressed reasoning from earlier turns |
| `prefetch_context` | — | prefetched material | Pre-fetched documents, truncatable |
| `coding_guidelines` | IMPORTANT | coding tools in play | Repository coding conventions |
| `foundational` | IMPORTANT | see note | Constitutional principles and agent behaviour rules. The text is a hardcoded paraphrase in `llm_context.py`, gated on finding a `CONSTITUTION.md`/`AGENTS.md` above the package — so **a pip-installed agent gets an empty preamble**, and the file and the prompt can drift. Filed as [defect D32](https://github.com/dennys246/Maxim/blob/main/docs/bugs/README.md) |
| `mode_context` | NICE_TO_HAVE | the mode has one | The mode's own instructions — filesystem rules, cognitive tools. Frequently the first thing dropped |
| `observation` | IMPORTANT | a current percept | Detected objects, attention target, novelty and salience |
| `speech` | NICE_TO_HAVE | speech detected | Last three utterances |
| `agent_states` | NICE_TO_HAVE | multi-agent | Other agents' states and goals |
| `recent_outcomes` | IMPORTANT | tools ran recently | Last three tool results, succeeded/failed |
| `body_state` | CRITICAL | the agent is embodied | See [where the substrate enters](#where-the-substrate-and-drives-enter) |
| `bio_enrichment` | IMPORTANT | enrichment ran and no deliberation transcript | `=== What your experience tells you about this situation ===` |
| `auto_sense` | IMPORTANT | the auto-sense sweep ran | `=== What you perceive right now ===` — passive perception of surroundings and body |
| `deliberation_transcript` | IMPORTANT | multi-cycle deliberation | `=== Your inner deliberation ===` — prior cycles' reasoning and the bio-system responses each triggered |
| `working_memory_thoughts` | IMPORTANT | prior thoughts and no transcript | `=== Your prior reasoning ===`, last six entries |
| `relevant_memories` | IMPORTANT | recall returned episodes | `=== Relevant Memories ===`, up to eight, each with goal, action, outcome, and any NAc prediction attached |
| `concept_context` | IMPORTANT | ATL concepts active | `=== Active Concepts ===`, up to five with relationships |
| `knowledge_context` | IMPORTANT | semantic knowledge matched | `=== Semantic Knowledge ===` |
| `causal_context` | CRITICAL | NAc has predictions | `=== Causal Predictions (learned from experience) ===`, up to five |
| `valence_context` | CRITICAL | learned valence exists | `=== Learned Associations (from experience) ===`, up to five, each marked as attractive, aversive, or neutral |
| `motor_programs` | IMPORTANT | Cerebellum has programs | `=== Available Motor Programs ===`, steps and known risks |
| `statistical_patterns` | NICE_TO_HAVE | the Statistician has confirmed patterns | Active patterns and ranked analysis suggestions |

Two things stand out. The learned signal from experience — `causal_context`, `valence_context`, `body_state` — sits at `CRITICAL`, the same tier as identity and tools; it is the last bio content to go. And the sections that describe *rules* rather than *experience* — mode context, extended guidance, statistical patterns — are the first to go.

## Where memory enters

The MemoryAgent's [StructuredContext](/concepts/architecture/#the-structuredcontext) is the object the builder reads. Its fields map onto the sections above nearly one-to-one: `relevant_memories` from Hippocampal recall, `concept_context` from the [ATL](/systems/anterior-temporal-lobe/), `predicted_outcomes` from the [NAc](/systems/nucleus-accumbens/) into `causal_context`, `statistical_context` and suggestions from the Statistician, `motor_programs` from the [Cerebellum](/systems/cerebellum/). [Memory & consolidation](/memory/overview/) covers how those fields are populated; this page is only about how they are rendered and ranked.

Separately, a **context pool** (`agents/context_pool.py`) manages a rolling window of pooled context across agents — recent entries kept verbatim, older ones summarised — and lands in the `context_pool` section. Its limits are environment-configured (`MAXIM_CONTEXT_POOL_MAX_TOKENS`, default 2000; `MAXIM_CONTEXT_POOL_KEEP_RECENT`, default 5, among others).

When [deliberation](https://github.com/dennys246/Maxim/blob/main/docs/user/deliberation.md) runs more than one cycle, the transcript subsumes two other sections: `bio_enrichment` is suppressed because the current cycle's enrichment is already the transcript's last entry, and `working_memory_thoughts` defers to the transcript as the richer, ordered form of the same information. The transcript's own budget is proportional — `min(2000, 30% of the post-reserve budget)`, so roughly 890 tokens on a 4K local model — and drops its oldest cycles first.

## Where the substrate and drives enter

An embodied agent's interoception arrives as the `body_state` section, produced by the embodiment runtime's `format_body_state_for_prompt()`:

```
=== Body State (pain-relevant) ===
- infant_humanoid.hunger: 0.82ratio (DRIVE: homeostatic) (WARN: approaching starvation)
- infant_humanoid.core_temperature: 0.41ratio (DRIVE: homeostatic)
```

Every entity's sensors are listed; a sensor that is a drive is tagged `DRIVE:` with its kind, and one near a failure threshold is tagged `WARN:`, which also flips the heading to *pain-relevant*. This is `CRITICAL`, always present when embodied, and it is the channel through which hunger, cold, and pain reach the language model in the [Cradle](/research/cradle/) experiments.

The NAc reaches the prompt through four sections: `causal_context` (its predictions for candidate actions), `valence_context` (learned attraction and aversion), `cluster_bias_annotations` (aggregated per-tool reward bias, surfaced so the model can read substrate signal across situations the substrate did not directly drill), and `grayscale_tools` (tools it favours that are not currently available). `bio_enrichment` adds the focused, per-percept associations that the enrichment pipeline pulls from Hippocampus, NAc, EC, Cerebellum, and SCN.

None of these sections issue commands. They are evidence placed in front of the model, and the model still chooses. The substrate-primary mode where the NAc *selects* actions is a separate, opt-in path described under [operating modes](/concepts/operating-modes/) and [substrate-primary evidence](/research/experiments/substrate-primary-evidence/).

## The Acting Coach

The Acting Coach (`src/maxim/prompts/acting_coach.py`) is present in 1.1.1 and is set by both the CLI and the simulation orchestrator. It renders a `CRITICAL` section that encourages the agent to explore its physical capabilities — when the agent has entity tools such as `sense_tools` — and then annotates that base directive with what the bio-systems know:

1. **NAc valence** — causal links inject learned caution or preference about specific affordances.
2. **Pain anticipation** — read from `body_state`.
3. **Cerebellum forward-model predictions** — from `motor_programs`.
4. **Drive modulation** — interoceptive needs, also read from `body_state`.

Each layer *adds* information; none removes the base directive. The agent always can explore; the bio-systems inform how cautiously. The config (`ActingCoachConfig`) carries role values, a speech register, a failure-mode style, a continuity contract, and an `exploration_intensity` (default 0.7). Layers 2 and 4 need a non-empty `body_state`, which only an embodied agent supplies, and can be switched off for ablation runs with `MAXIM_DISABLE_COACH_BODY_LAYERS=1` — the switch that exists for the Exp 44 arm-B comparison.

## Tool injection

The `tools` section is `=== Available Tools ===`: one line per tool with its description, parameters, and an example. Where the list comes from and how it is described is covered in depth on the [Tools reference](/reference/tools/#tool-selection-and-injection); the parts that matter for the prompt are:

- **Two description tiers.** Built-in tools take rich entries from the `TOOL_DESCRIPTIONS` dict in `modes/definitions.py` (31 entries in 1.1.1). User-registered tools and SEM affordance tools fall back to `Tool.description` plus `Tool.input_schema`, which is often too terse. A registered tool the model never calls usually has no `TOOL_DESCRIPTIONS` entry.
- **Relevance filtering is per mode.** Modes that opt in (`uses_tool_relevance_filter`, the passive interactive modes) get a `CRITICAL` section of tools the learned tool index matched to the request and an `IMPORTANT` `tools_background` section for the rest. Autonomous modes get the full manifest in one section — the filter has a cold-start pathology under no learned signal that produced near-random subsets and tool hallucination.
- **Scene-scoped tools.** In campaigns, entity affordances register per scene with a cap of 20 active scene tools; core tools are exempt and the oldest scene auto-deactivates on overflow. Deactivated tools are not in the prompt and return a descriptive error if called anyway.
- **Truncation before dropping.** The manifest is truncatable down to a 50-token floor — examples go first, then indented detail lines — so it is essentially never dropped outright.

After the model answers, the JSON action passes the autonomy policy (an execution-level allow-list), then the [fear circuit](/systems/fear-circuit/) *if the gate is active* — it is on in the CLI and off by default in the stable Python API, see [tool safety](/reference/tools/#tool-safety) — and only then does `Tool.execute()` run. The outcome feeds back into the NAc and into next turn's `recent_outcomes`, `causal_context`, and `valence_context`. That loop, not the manifest, is where tool *learning* happens: the model always sees the tools it has; experience changes *when* it reaches for them.

## Deliberation

When the ThoughtGate fires, the builder adds `pfc_preamble` — the instruction to think in first person, as private inner thought rather than speech or narration — and the model returns a proposal with `ready_to_act`, `action`, `confidence`, and `reasoning`. If it is not ready to act, its reasoning is fed back through bio-enrichment and the next cycle's prompt carries the transcript. Convergence (Jaccard ≥ 0.8 between consecutive cycles) or a hard cap (3 cycles in simulation, 2 in interactive use) ends it. The full mechanism — the gate's five checks, computed thought salience, and NAc goal-level credit that lowers or raises the threshold for thinking under a given goal — is in the engine's [deliberation guide](https://github.com/dennys246/Maxim/blob/main/docs/user/deliberation.md).

## Debugging what the model saw

With `MAXIM_LOG_FILE` set (root logger at DEBUG), every prompt build emits a `prompt_sections` event listing each included section and its size in characters — names and sizes only, never content — so you can confirm that `body_state` or `acting_coach` was present on a given turn, or watch sections disappear as a conversation grows, without dumping prompt text. The `Prompt budget … dropped sections:` info line names what was cut.

## Going deeper

- [`src/maxim/agents/prompt_builder.py`](https://github.com/dennys246/Maxim/blob/main/src/maxim/agents/prompt_builder.py) and [`prompt_budgeter.py`](https://github.com/dennys246/Maxim/blob/main/src/maxim/agents/prompt_budgeter.py) — the assembly and the budgeter; the section table above was read from the 1.1.1 source (unchanged from 1.1.0 apart from a docstring path).
- [`src/maxim/prompts/acting_coach.py`](https://github.com/dennys246/Maxim/blob/main/src/maxim/prompts/acting_coach.py) — the coach and its four layers.
- [`docs/agents/runtime-tools.md`](https://github.com/dennys246/Maxim/blob/main/docs/agents/runtime-tools.md) — the engineering brief for the agent loop, including the byte-stable prompt rule and the context-pool variables.
- [`docs/user/deliberation.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/deliberation.md) — the inner monologue, ThoughtGate, and the thinking panel.
- [Tools](/reference/tools/) — the catalog, the side-effects contract, and the safety gate.
- [Architecture](/concepts/architecture/) — the agent pipeline that produces the StructuredContext this page renders.
