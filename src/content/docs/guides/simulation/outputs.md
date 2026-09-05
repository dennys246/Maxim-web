---
title: What a run produces
description: The session directory every simulation writes, what each file holds, how to read report.json, the two JSONL streams, and how to load a run back into Python.
---

Every simulation writes one directory. This page is the reader's guide to it, verified against the
1.1.3 code and against real session directories.

## Where it lives

`~/.maxim/sim_reports/<session_id>/` — or `$MAXIM_DATA_HOME/sim_reports/<session_id>/` when the data
home is redirected. The session id is a timestamp, `YYYYMMDD_HHMMSS`, minted when the sim starts, so the
directory name equals the `session_id` on every log event of that run.

:::note[`~/.maxim/sessions/` is not where sessions go]
That directory exists and is empty. Nothing at 1.1.3 writes to it; one docstring in `api.py` still says
otherwise. If a tool or doc points you there, it is stale.
:::

Two things a run writes **outside** the session directory. The full simulation trace lands at
`sim_sandbox/sim_agent_<timestamp>.jsonl` under the data home (`~/.maxim/sim_sandbox/`, or
`$MAXIM_DATA_HOME/sim_sandbox/`) — *since 1.1.4*; through 1.1.3 it was `data/sim_sandbox/` relative to the
working directory, a defect the engine fixed as D69. Research mode's `research_result.json`,
`bus_history.json` and `paper.md` still land under `data/sim_reports/research_<id>/` relative to the
working directory, not the data home. This surprises pip-installed users; it is how the code is today.

## The files

| File | Written by | What it holds |
|---|---|---|
| `report.json` | the report builder | The run's metrics, model routing, cost, and the LLM roundup. Written twice when the roundup runs: once before, once after. |
| `actions.jsonl` | the action log writer | One record per tool call, after a header line. |
| `bio_telemetry.jsonl` | the bio-telemetry collector | Every log record from the bio subsystems. Skipped entirely when a run produced none. |
| `aut_hippocampus.json` | the AUT snapshot | The agent under test's episodic memory. |
| `aut_nac.json` | the AUT snapshot | Its causal links and reward biases. |
| `aut_ec.json`, `aut_atl.json`, `aut_scn.json` | the AUT snapshot | Entorhinal, semantic and circadian state. Present only when those subsystems were wired; older session directories lack them. |
| `generated_campaign.yaml` | the generative runner | A replayable export of a generative campaign. |
| `experiments.jsonl` | research tools | The researcher agent's recorded experiments, when any were logged. |

For a **persistent agent** adopted into a sim (the Console's Adventure), the `aut_*` snapshots are
deliberately not written: that agent's state lives in its own home, and a second copy in the session
directory would be a stale source a later resume could clobber.

## `report.json`

The fields a reader needs, in the order they matter:

| Field | Meaning |
|---|---|
| `goal`, `mode` | The goal string and the flow-shape label. Files from before 1.1 carry `persona` instead of `mode`; loaders accept both. |
| `turns` | Bridge turn count. |
| `finish_reason` | How the run ended. Orchestrator verdicts are `completed`, `failed`, `inconclusive`, `blocked`, `stuck`, `aborted`; the runtime adds `error`, `cancel`, `max_turns`, `llm_wedged`, `planning_failed`, `worker_unavailable`, `aut_died`. See [exit codes](/guides/simulation/cli/#exit-codes) for which of these mean "the run is not evidence". |
| `total_actions`, `blocked_actions`, `tool_usage`, `tool_success_rates` | Counts from the action log. |
| `aut_memories_formed`, `aut_causal_links`, `aut_nac_summary` | Substrate size at the end. `top_links` lists the five highest-confidence causal links as event, outcome, confidence, observations. Outcome strings are raw and can be cut mid-value; that is the artifact, not a rendering bug. |
| `cost_usd`, `total_input_tokens`, `total_output_tokens` | From the router's own session accounting. `0.0` means the session spent nothing, never "unknown": the report deliberately does not fall back to the rolling cost window. Local llama.cpp calls produce no token counts at 1.1.3, so a local-only run shows zeros here. |
| `lane_breakdown`, `latency_p50_ms`, `latency_p99_ms` | Per-lane job counts, failures and latency. Populated by the leader proxy's metrics; empty for a solo local run. |
| `language_model`, `language_provider`, `language_backend_class`, `language_endpoint` | Which model narrated and through what. The endpoint is a base URL, empty for in-process backends. The `aut_*` twins are filled only when the agent under test used a separate router. |
| `duration_s` | Wall clock. |
| `pain_events_count`, `fear_blocks_count`, `learn_events_count` | Counted from the in-memory log trail. |
| `llm_summary`, `llm_issues_found`, `llm_recommendations` | The QA-analyst roundup, empty when there was no router or it was skipped. |
| `apparatus` | Currently `substrate_actions_per_turn`, `null` when unbounded, so a budgeted run and an unbounded one never look identical. |

`--report-json PATH` (or `-` for stdout) emits exactly this payload to where a CI pipeline wants it. It
adds no fields.

## `actions.jsonl`

Line one is a header; skip any line whose `_record_kind` is `header` before reading records.

```jsonl
{"_format_version": "1.1", "_record_kind": "header", "session_id": "20260902_210107"}
{"timestamp": 1788404617.408, "tool": "sense_food_source", "params": {}, "success": true,
 "output": "{'portions': {'value': 5.0, 'unit': 'count'}, ...}", "error": null,
 "blocked": false, "block_reason": null, "agent_id": "sim_aut",
 "session_id": "20260902_210107", "entity_class": null}
```

`output` is truncated to 1000 characters. `agent_id`, `session_id` and `entity_class` can be `null` on
older runs or when the entity could not be derived from the parameters; that is normal.

## The two JSONL streams

There are two ways to get the event stream, and they carry different sets of events.

**`bio_telemetry.jsonl`** holds the records whose subsystem is in a fixed set of nineteen: HIPPOCAMPUS,
NAc, ATL, SCN, CEREBELLUM, SENSORY, SENSOR, BODY, BODY_STATE, FEAR, PAIN, REACTION, THOUGHT,
DELIBERATION, ENRICHMENT, IMAGINATION, DISCOVERY, GATE, MOTOR. Anything else is absent. In particular
`LEARN`, `drive:*`, `SEM_TRACE`, `EXEC`, `NAc_RECOMMEND` and `PIPELINE` never appear here, even though
`report.json`'s `learn_events_count` is computed from those same in-memory records.

```json
{"t": 108.279, "subsystem": "HIPPOCAMPUS", "message": "💾 Captured: sense_food_source (salience=0.75)",
 "data": {"goal": "drive:hunger(0.50) →food", "success": true}, "agent_id": "sim_aut", "agent": "sim_aut"}
```

`t` is seconds since sim logging was enabled, not wall clock.

**`MAXIM_LOG_FILE=path`** attaches a structured JSONL handler to the whole process and carries every
sim event plus HTTP, lane and role events. Its records use compact keys: `t` (wall clock), `l` (level
initial), `s` (source), `e` (event name), with each event's data flattened to the top level. Sim events
arrive as `e: "sim_<subsystem>"` with `subsystem`, `message`, `elapsed_s`, `agent_id` alongside.

```json
{"t": 1788404608.35, "l": "I", "s": "sim", "e": "sim_learn", "subsystem": "LEARN",
 "message": "▲ phase-fallback credited 7341691f (strength=0.300) — trace decayed; SCN anchor matched",
 "elapsed_s": 99.213, "agent_id": "sim_aut", "reward": -0.25, "nodes_credited": 1}
```

Setting `MAXIM_LOG_FILE` forces the root logger to DEBUG for the file handler while stdout keeps your
`--log-level`. Rotation is 100 MB with three backups; `MAXIM_LOG_FILE_MAX_BYTES=0` disables it.
`MAXIM_BACKEND_TRACE=1` raises per-call peer-backend records to INFO so token counts and latency per
LLM call land in the same file.

If you want the full stream, use `MAXIM_LOG_FILE`. If you want just the bio subsystems, the telemetry
file is the smaller read.

## Display tiers are not log levels

Two knobs look similar and are not.

- `--display clean|bio|debug` selects which subsystems the **terminal** shows. Default `bio`. Every event is
  persisted regardless of tier; the tier only filters what you see. CLEAN shows narrative and results,
  BIO adds the memory and learning subsystems, DEBUG adds EXEC, PIPELINE and DISPLAY.
- `--log-level 0|1|2` sets the Python logging level for warnings, info and debug. It does not change the
  sim display.

`--show bio,exec,...` and `MAXIM_SHOW_CHANNELS` filter the terminal by channel; the legacy `--debug`
flag bypasses the tier gate entirely.

## The substrate snapshots

`aut_nac.json` carries the causal `links` (what `aut_causal_links` counts), an `outcome_index`, the
reward-bias surfaces keyed per agent, per goal and per cluster, Pavlovian `percept_valences`, running
variance per event, a `saved_at` stamp and a `_format_version`. The `version: "1.0"` inside it is a
tombstoned legacy string, not the format version.

One behaviour to know before loading one yourself: `NAc.load()` **ages every bias by the wall-clock time
since `saved_at`** by default and prunes what decayed, logging a warning. The read-only loaders and the
resume path pass `apply_decay=False` so disk truth survives; a hand-rolled load does not.

`aut_ec.json` carries the entorhinal substrate nodes with their embeddings, the LSH tables and inverted
index, a `hash_scheme` of `stable-sha256-v1` (files without it predate the stable-hash fix and their
hashes can never match again), and `encoder_provenance`, which records the encoder in use when the
vectors were made. That last field matters if you move a snapshot between machines: an encoder change
silently makes the stored vectors unreachable.

## Loading a run back

```python
import maxim

s = maxim.load.session("20260902_21")          # prefix match, newest first
s.observe("memory", keyword="food")             # hippocampus + NAc from that directory
nac = maxim.load.nac("~/.maxim/sim_reports/20260902_210107/aut_nac.json")
```

A disk-loaded `Session` is metadata plus `observe()`, not a replay: turn counts and durations read as
zero. There is no `maxim.load.ec` at 1.1.3. `maxim.observe(...)` at the top level reads the **agent
home** (`~/.maxim/memory/`), not a session directory.

**Resuming** is `maxim --sim ... --resume-sim <session_id>` on the command line, or
`maxim.imagine(goal, resume="<id>")` in Python. It restores the hippocampus, NAc, EC and ATL snapshots
into the new run and injects the previous report's summary, issues and recommendations as orchestrator
context. `aut_scn.json` is written but not restored. A session id that does not match logs a warning
and starts fresh.

## Verifying a run from the log

The recipe the engine's own contributor guide uses:

```bash
MAXIM_LOG_FILE=/tmp/maxim.jsonl maxim --sim "test basic recall" --interactive --sim-max-turns 3
```

Then read the JSONL for `ACTION_FOLLOWUP` entries, which are the evidence that a user's answer actually
re-entered the agent's prompt, and pair it with `MAXIM_BACKEND_TRACE=1` for per-call token and latency
data.

## Related

- [YAML scenarios](/guides/simulation/scenarios/) for the expectation checks whose results land in the report
- [CLI and environment reference](/guides/simulation/cli/) for `--report-json`, `--resume-sim` and the log variables
- [Memory & consolidation](/memory/overview/) for what the snapshots represent
