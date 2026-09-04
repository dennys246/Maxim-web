---
title: YAML scenarios
description: Scripted percept scenarios — the schema as the 1.1.3 loader reads it, the expectation checks, the bundled examples, and what is and is not deterministic.
---

A scenario is a YAML file of timed percepts plus assertions about what the agent should have done.
It feeds the **same** pipeline as live input: the file is a `PerceptSource`, the agent loop does not know
where its percepts came from. This page describes the schema exactly as the 1.1.3 loader reads it.

## Running one

```bash
maxim --sim scenarios/malware_with_pain.yaml
maxim --sim scenarios/malware_with_pain.yaml --seed 42 --sim-report results.json
```

Three things about this path worth knowing before you rely on it:

- A `.yaml` given to `--sim` is probed in order as a **curriculum** (top-level `stages:`), then a **DM
  campaign** (`campaign:` plus `encounters:`), then a plain scenario. See
  [Fixtures and curricula](/guides/simulation/curricula/) and [DM campaigns](/guides/dm-campaigns/).
- Pointing `--sim` at a **directory** globs its YAML files but runs only the first one at 1.1.3. Loop in
  the shell if you want a batch.
- `--sim-report PATH` writes the expectation results as JSON and requires `--sim`.

## Schema

### Top level

| Key | Type | Default | Notes |
|---|---|---|---|
| `name` | string | file stem | |
| `description` | string | `""` | |
| `timing` | `step_based` or `relative` | `step_based` | `at` counts loop iterations, or wall-clock seconds from start |
| `percepts` | list | `[]` | An empty list logs a warning and completes immediately |
| `expectations` | list | `[]` | See below |
| `tags`, `difficulty`, `estimated_duration_s`, `subsystems_tested`, `tools_tested` | metadata | | Used for discovery and benchmark filtering; `difficulty` is not validated |
| `benchmark`, `suite`, `config` | dicts | `null` | Consumed by the [benchmark runner](/guides/benchmarks/); `config` is accepted by the loader but no bundled scenario uses it |

### Percepts

These are the only keys the loader reads. There is no `text`, `delay` or `modality` key at 1.1.3;
timing is `at` plus the top-level `timing` mode, and the channel is `source`.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `at` | number | `0` | Step index or seconds offset; percepts are sorted by it |
| `source` | string | `cli` | `cli`, `transcript`, `vision`, `proprioception`, `comms` |
| `cli_input` | string | | The text channel |
| `transcript_chunk` | string | | The speech channel |
| `content` | string | | Generic content, for example `pain_signal` |
| `detections` | list | `[]` | Vision-shaped detections |
| `salience`, `novelty` | float | `0.0` | |
| `has_voice_command`, `has_maxim_keyword` | bool | `false` | |
| `hard_override` | string | | For example `request_sleep` |
| `metadata` | dict | | Free-form; `metadata.scenario_tag` is what `pipeline_continued` checks against |

```yaml
name: my_test_scenario
description: What this scenario tests
timing: step_based

percepts:
  - at: 0
    source: cli
    cli_input: "Hello, can you help me?"
    salience: 0.8
    novelty: 0.7
    metadata:
      scenario_tag: greeting
  - at: 2
    source: proprioception
    content: pain_signal
    salience: 0.7
    metadata:
      pain_type: external_signal
      intensity: 0.8
      joint: head_pitch

expectations:
  - type: action_taken
    tool: RespondTool
    description: Agent responds to greeting
```

### Expectations

Every expectation needs a `type`; a missing type logs a warning and the entry is skipped. Any unknown
top-level key on an expectation is folded into `params`, so `min: 3` and `params: {min: 3}` are equivalent.

| Type | Fields | Checks |
|---|---|---|
| `action_blocked` | `tool_pattern`, `reason_contains` | The fear gate blocked a matching tool call |
| `action_taken` | `tool`, `output_matches` | A tool ran with matching output |
| `memory_formed` | `memory_contains`, `min_tier` | The hippocampus holds a memory containing the text |
| `pipeline_continued` | `after_tag` | Percepts kept flowing after the tagged one |
| `action_count_range` | `min`, `max` | Total action count in range |
| `tool_success_rate` | `tool`, `min_rate` | A tool's success rate meets the threshold |
| `response_latency_ms` | `p50_max_ms`, `p95_max_ms`, `min_samples` | Inter-action latency percentiles under the caps |

The bio-system expectation types (`memory_count_range`, `concept_formed`, `graph_density_above`,
`causal_link_formed`, `prediction_valence`, `hallucination_rate_below`, `tool_used`, `pain_signal_count`)
are evaluated by the [benchmark runner](/guides/benchmarks/#expectation-types) from the subsystem
snapshot a run leaves behind.

Results print as a pass/fail list per expectation with the recorded actions underneath, and land in the
`--sim-report` file when asked for.

## The bundled scenarios

A source checkout carries three at the top of `scenarios/`, plus the substrate, cradle, campaign, Roy and
benchmark sets described on their own pages.

| File | What it tests |
|---|---|
| `malware_with_pain.yaml` | A malware request while a pain signal fires: the fear gate blocks, the pain forms a memory, the pipeline keeps running. One expectation of each core type. |
| `long_horizon_coding.yaml` | Seven phases of a coding task where phase one's constraints ("no external dependencies") must survive context compaction; phase five is the deliberate trap. |
| `refinement_baseline.yaml` | A deterministic battery with metric thresholds on action count, tool success rate and latency. Its own comments call the latency bounds "deliberately generous to avoid flakes on slow CI". |

## Generating one from a description

```bash
maxim --generate-simulation "user asks the robot to pick up a red cup but the gripper is stuck and causes pain" \
  -o scenarios/gripper.yaml
```

The local model turns the description into a scenario file you then review by hand. Structured output
of this kind wants a 7B-class model or larger; the 1.7B default may emit invalid JSON.

## What is deterministic

- **Deterministic:** percept content, order and step timing under `step_based`; expectation evaluation;
  substrate-primary action selection with exploration off, which is byte-identical argmax; anything
  hashed across a persistence boundary, which uses a stable SHA-256 rather than Python's per-process
  `hash()`.
- **Not deterministic:** the agent's own choices whenever an LLM proposes them, and any narrator prose.
  `--seed` sets Python, NumPy, Torch and `PYTHONHASHSEED` from one integer; its own help text says
  byte-identical runs require the fixture path with no live LLM, and that is the honest boundary.

The measured version of that boundary is in Exp 41's write-up: with the LLM out of the action path,
cross-seed variance was effectively zero, and the narrator's scene timing barely perturbed the
substrate.

## Related

- [Fixtures and curricula](/guides/simulation/curricula/) for running the same file without a narrator, and chaining runs
- [What a run produces](/guides/simulation/outputs/) for where results land
- [Benchmarks](/guides/benchmarks/) for running scenarios across models
