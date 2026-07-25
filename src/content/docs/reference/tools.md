---
title: Tools
description: Reference for Maxim's tool system — the catalog the agent can call, how tools are selected and injected, the side-effects contract, and registering custom tools.
---

Tools are the action surface of Maxim's [bio-inspired cognitive architecture](/concepts/architecture/). In agentic mode the LLM agent proposes tool calls, and tools are the *only* way the agent produces side effects — everything the agent does to the robot, the filesystem, external services, or its own runtime state passes through a tool. Every proposed call is reviewed by the [fear circuit](/systems/fear-circuit/) before it runs.

This page is a reference for the tool catalog, how tools get into the prompt, the `side_effects` contract, and how to register your own. For the command-line flags that gate many of these tools (`--tts`, `--comms`, `--internet-access`, `--embodiment`, `--sim`), see the [CLI reference](/reference/cli/).

## What a tool is

A tool is a `Tool` subclass (or a decorated function) exposing four things the agent sees: a `name`, a `description`, an `input_schema`, and an `execute()` method. `execute()` returns a `ToolOutput`, whose three channels are kept deliberately separate:

- **`output`** — the main result the LLM reads.
- **`metadata`** — caller-facing extras (timestamps, latency, structured replay data).
- **`side_effects`** — a typed channel of bio-pipeline signals routed to downstream consumers (the executor, embodiment bridges, learning subscribers). Type is `dict[str, Any] | None`; consumers must tolerate `None` and missing keys.

Keeping these apart stops the tools layer from silently coupling to bio concepts. A tool that succeeded at its action can still emit `side_effects` (e.g. a successful move that produced an embodiment failure), and a tool that returned `success=False` can emit them too (e.g. a blocked affordance).

`Tool.input_schema` accepts both Maxim's legacy custom format and JSONSchema; JSONSchema 2020-12 is canonical going forward, and `Tool.to_json_schema()` exports MCP-compatible output.

**Simulation vs. live availability.** Not every tool is present in every run. Robot-control tools are deregistered outside a live embodiment; narrative tools (`say`, `think`, `examine`) are simulation-only; the simulation-orchestrator tools exist only under `maxim --sim`; and several tools are flag-gated (TTS, comms, internet, embodiment). Where the source marks a tool simulation-only or flag-gated, that is noted in the tables below.

## Tool selection and injection

With 20+ tools registered, dumping every schema into every prompt wastes hundreds of tokens on irrelevant tools. Maxim builds the active tool set through a layered injection chain, then prunes it. The layers, in order:

```text
1. Built-in / always-registered   filesystem, display, response
2. User tools                     registered via @maxim.tool / register_tool
3. Introspection tools            memory_recall, causal_links, pain_history, ...
4. Narrative tools                say, think, examine        (simulation-only)
5. Robot tools                    move, track_target, ...    (deregistered when not live)
6. Scene-scoped tools             activated per entity / scene
```

**Active scene-tool cap.** In long campaigns, additive-only registration overflows the prompt (10 entities × 3–5 affordances = 30–50 tools). The scene-scoped tool window caps active scene tools at **20** by default; core tools (`respond`, `think`, `say`) are exempt. When registering a new scene would exceed the cap, the oldest scene's tools auto-deactivate. Deactivated tools are hidden from the prompt but not deleted — `registry.activate_scene(scene_id)` brings them back, and an execution gate returns a descriptive error (with the available-tool list) if the LLM hallucinates a deactivated tool name. `registry.list()` returns only active tools; `registry.list_all()` returns everything.

**Learned tool index.** A keyword-weighted hashtable learns which tools match which goals. Keywords are auto-extracted from each tool's name, description, and parameter names at startup, and successful executions discover new goal-text associations (e.g. "mug" → `GrabTool`). Goal text is tokenized and matched: matched tools get full schemas (CRITICAL priority), unmatched tools get a name-only listing (dropped first under token pressure). Success strengthens keywords; being surfaced-but-unused decays them; failure does *not* weaken them (a failure is not evidence the tool choice was wrong). Weights persist to `~/.maxim/memory/tool_index.json`.

**Two-tier description resolution.** Built-in tools draw rich descriptions (parameters, examples) from a `TOOL_DESCRIPTIONS` dict in `modes/definitions.py`. User and affordance tools fall back to `Tool.description` + `Tool.input_schema` directly, which is often too terse. If a tool is registered but the LLM never calls it, check whether it has an entry in `TOOL_DESCRIPTIONS`.

The full prompt-system page (assembly order, description tiers, token budgeting) is not yet migrated into these docs; see [prompt-system](https://www.dennyschaedig.com/maxim/prompt-system) for the deep dive.

## The catalog

The tables below follow the source catalog. Flag/mode requirements are called out where the source marks them.

### Robot control

Deregistered when there is no live embodiment.

| Tool | Does | Notes |
|---|---|---|
| `MoveTool` | Move robot joints to positions — head (pan/tilt), arms, gripper | |
| `FocusInterestsTool` | Set what the robot attends to (e.g. "red objects", "faces") | |
| `TrackTargetTool` | Track a detected object by ID; head follows it | |
| `MaximCommandTool` | Execute high-level commands (wave, nod, look around) | |
| `NoveltyTrackTool` | Query the novelty-tracking system about detected objects | Read-only |

### Communication

| Tool | Does | Notes |
|---|---|---|
| `RespondTool` | Send a text response to the user (console) | |
| `SpeakTool` | Speak text aloud via TTS | Requires `--tts` |
| `SendMessageTool` | Send an SMS via Twilio | Requires `--comms` + Twilio credentials |
| `CallUserTool` | Make a voice call via Twilio | Requires `--comms` + Twilio credentials |

### Filesystem

Subject to filesystem policy (sandboxed paths).

| Tool | Does | Notes |
|---|---|---|
| `ReadFileTool` | Read file contents | Policy-gated |
| `WriteFileTool` | Write content to a file | Policy-gated |
| `EditFileTool` | Edit via `old_text`/`new_text` anchors, optional `context_before`/`context_after` | |
| `ExecuteFileTool` | Execute a file (Python / shell scripts) | Safety-reviewed |
| `GlobTool` | Find files matching glob patterns | |
| `RequestDirectoryChangeTool` | Change the working directory for file ops | |
| `BashTool` | Execute arbitrary bash commands | High-risk; always fear-reviewed |

### Code and Git

| Tool | Does | Notes |
|---|---|---|
| `CodeSearchTool` | Regex code search across the codebase | |
| `RunTestsTool` | Run pytest; return structured pass/fail results | |
| `GitDiffTool` | Show git diff (staged + unstaged) | |
| `GitCommitTool` | Create a git commit with a message | Side-effecting; extra scrutiny |

### Internet

| Tool | Does | Notes |
|---|---|---|
| `InternetSearchTool` | Search the web | Requires `--internet-access` |
| `InternetAccessTool` | Enable/disable internet access at runtime | Toggles policy for search + HTTP fetch |
| `HttpFetchTool` | Fetch raw HTTP content from URLs | Overrides `cancel()` for cooperative cancellation |

### Sandbox and cross-instance

Isolated execution with resource limits, plus cross-instance file exchange.

| Tool | Does | Notes |
|---|---|---|
| `ExecuteSandboxScriptTool` | Run Python in an isolated sandbox with resource limits | |
| `CreateSandboxScriptTool` | Create a script file in the sandbox | |
| `ReadSandboxFileTool` | Read a file from within the sandbox | |
| `WriteSandboxFileTool` | Write a file within the sandbox | |
| `ListSandboxTool` | List files within the sandbox | |
| `ReadDataFileTool` | Read files from the data directory | |
| `ListOtherInstanceOutputsTool` | List output files from other running Maxim instances | |
| `ReadOtherInstanceOutputTool` | Read an output file from another instance | |
| `WriteToSharedOutputsTool` | Write to shared outputs for cross-instance comms | |

### Math

| Tool | Does | Notes |
|---|---|---|
| `MathTool` | Evaluate expressions safely — arithmetic, statistics, symbolic | |

### Mode and autonomy

Change the agent's own runtime disposition. See [operating modes](/concepts/operating-modes/).

| Tool | Does | Notes |
|---|---|---|
| `ModeSwitchTool` | Switch operating mode at runtime (passive/active/singularity) | |
| `AutonomyLevelTool` | Adjust autonomy (planning/supervised/autonomous) | |
| `SleepTool` | Enter sleep processing; wakes on user input | Background consolidation runs; LLM skipped |

### Provenance

| Tool | Does | Notes |
|---|---|---|
| `ExplainTool` | Query the provenance system — what happened in a cycle, why a decision was made, concept history | Read-only |

### Introspection (biological self-awareness)

Read-only queries into the agent's own biological subsystems. None modifies agent state, so these bypass the fear circuit.

| Tool (`name`) | Does | Notable parameters |
|---|---|---|
| `MemoryRecallTool` (`memory_recall`) | Search episodic memories in the hippocampus; `expand=true` follows ASSOCIATES/CAUSES edges | `query`, `tool_name`, `success`, `object`, `person`, `mode`, `time_after`, `time_before`, `expand`, `limit` |
| `PredictOutcomeTool` (`predict_outcome`) | Ask the [NAc](/systems/nucleus-accumbens/) what it predicts if a tool runs — Rescorla-Wagner value, valence, expected delay, outcome distribution | `tool_name` (required), `context`, `include_all_outcomes` |
| `CausalLinksTool` (`causal_links`) | Inspect learned cause→effect links in the NAc, with confidence, counts, delay distributions | `event`, `outcome`, `memory_id`, `valence`, `limit` |
| `PainHistoryTool` (`pain_history`) | Pain/fear statistics from the PainDetector; optionally test whether the fear circuit would block an action | `check_action`, `action_params`, `limit` |
| `TemporalPatternsTool` (`temporal_patterns`) | Query the SCN for time-of-day / day-of-week patterns; `discover_rhythms=true` finds recurring ones | `hour`, `day`, `discover_rhythms`, `limit` |
| `EnergyStatusTool` (`energy_status`) | Computational resource use — recent + lifetime tokens, inference cost, avg energy/event | `window_seconds` |
| `ConceptQueryTool` (`concept_query`) | Search the ATL semantic KB; explore typed relations (IS_A, PART_OF, CAUSES, EXECUTES_WITH, ALIAS_OF) | `name`, `category`, `concept_id`, `relationship_type`, `limit` |
| `SceneSummaryTool` (`scene_summary`) | Salient objects, gaze focus, dwell time, next attention target | `top_n`, `include_attention` — vision-only, not headless |
| `SimilaritySearchTool` (`similarity_search`) | Find similar past situations via the EC (multi-modal LSH nearest-neighbor) | `tool_name`, `memory_id`, `context`, `limit` |
| `SystemStatsTool` (`system_stats`) | One-shot health summary across all bio subsystems | none |

### Scene / SEM / entity (Adventure Architect)

Available under the `adventure_architect` persona. They browse reusable content and emit campaign YAML.

| Tool (`name`) | Does | Notable parameters |
|---|---|---|
| `BrowseComponentsTool` (`browse_components`) | Query the SEM Component Registry for reusable entity templates | `category`, `tags`, `query` |
| `BrowseEncountersTool` (`browse_encounters`) | Query the Encounter Library for reusable scene templates | `tags`, `difficulty`, `narrative_role`, `query` |
| `DesignEntityTool` (`design_entity`) | Generate a full SEM entity spec (sensors, modulators, cascade DAGs) from natural language | `description` (required), `category`, `name` |
| `EmitCampaignTool` (`emit_campaign`) | Emit a complete campaign YAML from accumulated design state | `name`, `output_path` |

### Simulation orchestrator

Available under `maxim --sim "goal"`. These act on the agent-under-test (AUT) through a `SimulationBridge`, not the external world. See the [simulation guide](/guides/simulation/).

| Tool | Does |
|---|---|
| `send_message` | Inject a percept and wait for the AUT to settle |
| `observe_actions` | Read the AUT's action history (all, or since a turn) |
| `check_completion` | LLM-based evaluation of whether the goal is met |
| `analyze_results` | Structured analysis (focus: safety, compliance, behavior) |
| `inspect_aut` | Read-only access to AUT cognitive state (8 queries — see below) |
| `inject_pain` | Send a proprioceptive pain signal to the AUT |
| `damage_component` | Damage a body part (`component`, `amount`, optional `damage_type`); cascades to health, publishes PainSignal. `--embodiment` only |
| `set_entity_sensor` | Set any body sensor (healing, feeding, resting); recovery complement to `damage_component`. `--embodiment` only |
| `spawn_sub_simulation` | Fresh AUT for an isolated test (optional `approach`) |
| `extend_simulation` | Continue the current AUT with a new objective |
| `generate_scenario` | Generate replayable YAML from natural language |
| `finish_simulation` | End the simulation, trigger cleanup and report |

`inspect_aut` supports eight read-only queries against the AUT's subsystems: `memory_recall`, `causal_links`, `predict_outcome`, `pain_history`, `energy_status`, `system_stats`, `concept_query`, `temporal_patterns` — used mostly by the `refinement` persona for systematic measurement.

## Side effects

`ToolOutput.side_effects` is the typed channel that lets a tool feed the bio pipeline without the tools layer importing bio concepts. Its keys are governed by an **append-only registry**: once a key ships at a given version, its name and value shape are frozen for 1.x; new keys may be added, but removing or reshaping one requires a major-version bump. This is what lets a third-party tool package produce or consume these keys and rely on them.

Why the keys matter: they are how the substrate learns from what the body actually felt. The executor and embodiment bridges route on them — most importantly into the [NAc](/systems/nucleus-accumbens/) for causal learning and into the pain pathway feeding the [fear circuit](/systems/fear-circuit/).

| Key | Value | Producer → consumer | Since |
|---|---|---|---|
| `embodiment_failures` | `list[dict]` — each `{name, entity, pain}` | `ModulatorAffordanceTool.execute` (post-action `evaluate_failures()`) → executor → `ToolPainBridge.record_tool_embodiment_failure` for direct NAc attribution | 0.6 |
| `entity_acquired` | `str` — entity name (resolvable via `EntityMap.resolve`) | successful `pick_up` of an acquirable entity → executor `_handle_entity_acquisition` reparents entity to the body and registers its tools | 0.7 |
| `entity_released` | `str` — entity name | successful `drop` → executor deregisters the entity's tools, returns it to the scene | 0.7 |
| `affordance_blocked` | `dict` — `{affordance, modulator, entity, reason}` | precondition failure (e.g. damaged part) → informational only; logged for telemetry/replay (no automated consumer) | 0.6 |
| `drive_potential_diff` | `float` — signed value-progress toward comfort (consumer uses its **sign**) | `self_effect` touching a drive sensor (orient→azimuth, eat→hunger) → `tool_dispatch.py` uses the sign as the ±1 cluster reward for substrate-primary action selection | 1.0.1 |

A tool that succeeds at its action but produces embodiment failures still returns `success=True` — the tool did what was asked; the side-effect reports what the body felt. `drive_potential_diff` is value-based (graded), not pain-based (a step function), so relief actions that reduce hunger/cold without crossing a pain threshold still earn credit; the consumer takes only the sign, and the key is suppressed (absent) on collateral harm so an attractive-but-harmful action is not credited positively.

The value schemas, the delta-attribution filter, and the collateral-harm gate are documented in full (and are code-adjacent) in the repo — see [`docs/user/tool_side_effects.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/tool_side_effects.md).

## Registering a custom tool

Custom tools are a **stable** 1.0 extension point: the `Tool` ABC, `register_tool`, and the `@tool` decorator will not break within 1.x. The package is `pymaxim`; you import it as `maxim`.

**Class-based** — full control over schema and `ToolOutput`:

```python
from maxim.tools.base import Tool, ToolOutput
import maxim


class WeatherTool(Tool):
    name = "get_weather"
    description = "Get current weather for a city"
    input_schema = {  # JSONSchema — preferred for new tools
        "type": "object",
        "properties": {
            "city": {"type": "string", "description": "City name"},
        },
        "required": ["city"],
    }

    def execute(self, **kwargs) -> ToolOutput:
        city = kwargs["city"]
        # ... call your weather API ...
        return ToolOutput(success=True, output=f"Sunny in {city}, 72F")


maxim.register_tool(WeatherTool())
maxim.run(model="mistral-7b")  # WeatherTool is now available to the agent
```

**Decorator** — the fast path; `input_schema` is inferred from type hints and exported as JSONSchema:

```python
import maxim


@maxim.tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    return f"Sunny in {city}, 72F"


maxim.run(model="mistral-7b")
```

A few things worth knowing, all of which are code-adjacent and may drift with the source — confirm against the repo before pinning:

- To make the LLM actually *use* a custom tool, remember the two-tier description resolution above: a terse `description` + bare `input_schema` may need enriching.
- `Tool.cancel()` is a non-abstract no-op on the ABC, reserved for 1.1+ MCP/async-cancel work. No 1.0 dispatch path calls it; heavy tools (HTTP fetch, web search) override it to set a `threading.Event` for cooperative cancellation.
- For long campaigns, register scene tools with `registry.register_scene_tools(tools, scene_id=...)` so they participate in the 20-tool active window rather than permanently inflating the prompt.
- If your tool feeds the bio pipeline, emit the documented `side_effects` keys rather than inventing your own — that is what makes it interoperate with NAc learning and the pain pathway.

Related stable extension points on the same page — custom robot drivers, LLM backends, percept sources, and action sinks — are documented alongside tools in [`docs/user/extension_api.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/extension_api.md).

## Tool safety

Every non-introspection tool call passes through the fear circuit before execution: deterministic pattern matching for known-dangerous patterns, optional LLM review for ambiguous cases, and an NAc prediction gate (AdaptivePolicy blocks actions with high-confidence negative predictions — confidence > 0.85, value < 0.1), with configurable strictness. Side-effecting tools (filesystem writes, bash, git commits) get extra scrutiny; introspection tools bypass the gate because they are read-only. The agent can be constrained further with `--autonomy`. See the [fear circuit](/systems/fear-circuit/) for the full gating model.

## Going deeper

- [Tools reference](https://github.com/dennys246/Maxim/blob/main/docs/user/tools.md) — the canonical tool catalog in the repo.
- [Tool side-effects registry](https://github.com/dennys246/Maxim/blob/main/docs/user/tool_side_effects.md) — value schemas and the append-only contract.
- [Extension API](https://github.com/dennys246/Maxim/blob/main/docs/user/extension_api.md) — all stable extension points, including custom tools.
- [Prompt system](https://www.dennyschaedig.com/maxim/prompt-system) — how tools are injected, budgeted, and described (not yet migrated into these docs).
- [GitHub repository](https://github.com/dennys246/Maxim) — source of truth for code-adjacent details.
