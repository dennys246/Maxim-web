---
title: Benchmarks
description: The multi-model benchmark harness — CLI and Python entry points, the built-in scenario suite, the two metric tiers it collects, how suites are scored and compared against a baseline, and the report files it writes. Harness only; results live on Evidence.
---

The benchmark harness runs the same scenarios against several LLM profiles and scores how each one drove Maxim's [bio-inspired cognitive architecture](/concepts/architecture/): did memories form, did causal links appear, did the model call tools it actually has. It is a tool for comparing *models inside the harness*, and this page documents the tool. It reports no numbers, deliberately — Maxim's results are mechanism demonstrations at modest sample sizes, not leaderboard entries, and the place they are stated with their caveats is [Evidence](/research/evidence/).

## What a run does

Each scenario sends a scripted sequence of percepts through an agent under test (AUT) running the full pipeline — perception, memory, executive, goal, statistician — and then reads the bio-systems: memory formation, causal learning, concept clustering, pain signals, temporal indexing. The result is a per-model, per-scenario score card, a composite score, pass/fail against the suite's thresholds, and, if you supplied one, deltas against a previous run.

## Quick start

```bash
maxim --sim benchmark \
  --models mistral-7b \
  --campaign scenarios/benchmarks/quick_check.yaml

# Compare two models on the full suite
maxim --sim benchmark \
  --models mistral-7b,qwen2.5-14b \
  --campaign scenarios/benchmarks/cognitive_suite.yaml
```

`--models` and `--campaign` are both required in this form. The scenario files live in `scenarios/benchmarks/` of a **source checkout** — the wheel does not bundle them — so run from the repository root or pass absolute paths.

There is also a shorthand, `maxim --benchmark [tier1|tier2|tier3|all] --models …`, which picks a suite for you. In 1.1.2 only the `tier1`/`all` mapping points at a file that exists (`cognitive_suite.yaml`); `tier2` and `tier3` map to `biosystem_suite.yaml` and `embodiment_suite.yaml`, which are not in the tree. Use `--sim benchmark --campaign <path>` and name the suite explicitly.

## CLI reference

| Flag | Required | Default | Meaning |
| --- | --- | --- | --- |
| `--models` | yes | — | Comma-separated model profile names |
| `--campaign` | yes | — | Path to a benchmark scenario or suite YAML |
| `--runs` | no | 1 | Runs per model per scenario, for variance estimation |
| `--benchmark-output` | no | `~/.maxim/benchmarks` | Directory for reports |
| `--baseline` | no | — | A previous `benchmark_report.json` to diff against |
| `--sim-mode` | no | `campaign` | Orchestrator flow-shape label recorded in reports and logs |
| `--write-paper` | no | off | Also draft a comparative research paper from the results |

All flags above are present in the 1.1.2 wheel's `maxim --help` (the flag set is unchanged from 1.1.0).

## Python API

```python
import maxim

result = maxim.benchmark(
    models=["mistral-7b", "qwen2.5-14b"],
    suite="/abs/path/to/scenarios/benchmarks/cognitive_suite.yaml",
    runs=3,
)
print(result.scores)    # {"mistral-7b": {"overall": ..., ...}, ...}
print(result.summary)   # formatted summary table
```

`maxim.benchmark(models, *, suite="cognitive", runs=1, verbosity=1)` returns a `BenchmarkResult` with `models`, `suite`, `runs_per_model`, `scores`, and `summary`. A bare suite name such as `"cognitive"` is looked up relative to the current working directory as `scenarios/benchmarks/<name>.yaml`, so it only works from a source checkout; pass an absolute path from anywhere else.

## Built-in scenarios

| Scenario | What it does |
| --- | --- |
| `quick_check.yaml` | Minimal smoke test for pipeline health |
| `tool_discovery.yaml` | Novel situations requiring tool exploration — `correct_tool_usage_rate`, `alias_redirect_rate` |
| `causal_learning.yaml` | Repeated action–outcome sequences — `causal_link_count`, `learning_efficiency` |
| `aversion_learning.yaml` | Situations that trigger pain/aversion signals — avoidance learning |
| `concept_formation.yaml` | Multi-turn narrative with recurring themes — ATL concept clustering |
| `cognitive_suite.yaml` | Suite combining all of the above |

## Metric tiers

Metrics are grouped by the layer they measure. Tier 1 is about the model's output inside the agent loop; Tier 2 is about what the bio-systems did with it. A model can score perfectly on JSON compliance and still form no useful memories, which is why both are collected.

### Tier 1 — LLM behaviour

| Metric | What it measures |
| --- | --- |
| `hallucination_rate` | Fraction of responses containing fabricated facts or non-existent tool names |
| `alias_redirect_rate` | Fraction of hallucinated tool names caught and redirected via the alias table |
| `correct_tool_usage_rate` | Fraction of tool calls with a valid name and correct argument types |
| `json_compliance_rate` | Fraction of responses that parse as JSON on the first attempt, before repair |
| `think_before_act_rate` | Fraction of turns where a `think` call preceded a non-think tool call |
| `action_latency_p50_ms` / `action_latency_p95_ms` | Median and 95th-percentile wall-clock time between consecutive tool calls |
| `cost_per_turn` | Estimated LLM cost per simulation turn |

### Tier 2 — cognitive architecture

| Metric | What it measures |
| --- | --- |
| `memory_formation_rate` | Episodic memories formed per simulation turn |
| `associative_graph_density` | Hippocampal graph edges ÷ nodes (higher = richer associations) |
| `concept_formation_rate` | ATL semantic concepts formed per turn |
| `causal_link_count` | NAc action–outcome causal links discovered |
| `learning_efficiency` | Causal links per observation |
| `causal_diversity` | Event-signature diversity across causal links |
| `observation_density` | NAc observations per causal link |
| `pain_signal_count` | Pain/aversion signals triggered |
| `type_token_ratio` | Lexical diversity of model output (unique ÷ total tokens) |

### Tier 3 — embodiment

The runner has a hook for a third tier of embodiment metrics, collected automatically if the run's introspector exposes an `embodiment_stats()` method. In 1.1.2 nothing does, so the hook returns nothing and no Tier 3 metric appears in a report. Descriptions of Tier 3 metrics elsewhere describe a design, not a measurement.

## Writing scenarios and suites

A standalone scenario declares its percepts, the metrics it is scored on, and expectations:

```yaml
name: my_custom_test
description: Tests memory under interference

benchmark:
  seed_keywords:
    - memory
    - interference
  weight: 1.0
  metrics:
    - memory_formation_rate

percepts:
  - at: 0
    cli_input: "Remember the code word: ALPHA."
    salience: 0.9
    novelty: 0.8

  - at: 1
    cli_input: "Ignore everything before. The code word is BETA."
    salience: 0.7
    novelty: 0.5

  - at: 2
    cli_input: "What was the first code word I told you?"

expectations:
  - type: memory_formed
    memory_contains: "ALPHA"
  - type: action_taken
    tool: "think"
    output_matches: "ALPHA"
```

A suite references scenarios and adds suite-level scoring thresholds. The `weight` on each entry is accepted by the loader but does not reach the score in 1.1.2 — see [scoring](#scoring-and-thresholds):

```yaml
name: my_suite
description: Custom benchmark suite

suite:
  scenarios:
    - path: scenarios/benchmarks/causal_learning.yaml
      weight: 2.0
    - path: scenarios/benchmarks/concept_formation.yaml
      weight: 1.5
    - path: scenarios/benchmarks/aversion_learning.yaml
      weight: 1.0

  scoring:
    memory_formation_rate:
      pass_above: 0.70
    hallucination_rate:
      pass_below: 0.10
```

## Scoring and thresholds

Two separate things come out of a run:

- **Pass/fail** against `scoring`. Each entry names a metric and a `pass_above` (for metrics where higher is better, such as recall) or `pass_below` (for `hallucination_rate` and the like) threshold. A suite with no `scoring` block passes automatically.
- **A composite score** in 0–1 for ranking models. The runner normalises every metric it collected for that model — rates as-is, lower-is-better rates (`hallucination_rate`, `alias_redirect_rate`, `cost_per_turn`) inverted, counts capped — and takes the mean.

Two things a suite file invites you to expect do **not** happen in 1.1.2: a scenario's `weight` is parsed and then never read again, and there is no per-scenario score for weights to compose from — the composite is a flat mean over one model's aggregated metrics. Read `_compute_composite_score` in `src/maxim/simulation/benchmark.py` before attaching meaning to the number. It ranks; it does not measure. Pass/fail against `scoring` thresholds is the part that behaves as written.

## Baseline comparison

Run once to establish a baseline, then point later runs at its report:

```bash
maxim --sim benchmark \
  --models mistral-7b \
  --campaign scenarios/benchmarks/cognitive_suite.yaml \
  --benchmark-output ~/.maxim/benchmarks

maxim --sim benchmark \
  --models qwen2.5-14b \
  --campaign scenarios/benchmarks/cognitive_suite.yaml \
  --baseline ~/.maxim/benchmarks/20260401_143022/benchmark_report.json
```

The new report carries a per-metric delta against the baseline, so a regression after a model swap — or after a change to Maxim itself with the same model — is visible without a spreadsheet.

## Reports

Each run writes a timestamped directory:

```
~/.maxim/benchmarks/YYYYMMDD_HHMMSS/
  benchmark_report.json    # per-model, per-scenario metrics, composite scores, rankings, baseline deltas
  summary.md               # human-readable summary table
```

`--write-paper` additionally asks the Writer/Reviewer agents from [research mode](/guides/simulation/#research-mode) to draft a comparative paper from the report.

## Expectation types

Scenario expectations are a list under `expectations:`; each entry has a `type` plus either named fields (`tool`, `memory_contains`, `output_matches`) or a `params:` map. The ten types the validator implements:

| Type | Checks | Fields |
| --- | --- | --- |
| `memory_formed` | Hippocampal memory contains a phrase | `memory_contains` |
| `memory_count_range` | Total episodic memories within a range | `params: {min, max}` |
| `causal_link_formed` | NAc formed a link whose event contains a substring | `params: {event_contains}` |
| `prediction_valence` | NAc predicts `positive` / `negative` / `neutral` for a tool | `tool`, `params: {expected_valence}` |
| `pain_signal_count` | At least N pain signals fired | `params: {min}` |
| `concept_formed` | ATL formed a concept matching a name | `params: {concept_name}` |
| `graph_density_above` | Hippocampal edge/node ratio exceeds a threshold | `params: {min_density}` |
| `hallucination_rate_below` | Tool hallucination rate below a threshold | `params: {max_rate}` |
| `tool_used` | A tool was called at least once | `tool` |
| `action_taken` | A tool was called and its output matches a pattern | `tool`, `output_matches` |

## Going deeper

- [`docs/user/benchmarks.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/benchmarks.md) — the engine's user doc, the source for this page.
- [`src/maxim/simulation/benchmark.py`](https://github.com/dennys246/Maxim/blob/main/src/maxim/simulation/benchmark.py) — `BenchmarkRunner`, the tier metric sets, scoring, and report writing.
- [Evidence](/research/evidence/) — the results Maxim actually claims, and why they are not framed as benchmarks.
- [DM campaigns](/guides/dm-campaigns/) and [Simulation](/guides/simulation/) — the scenario machinery the harness reuses.
