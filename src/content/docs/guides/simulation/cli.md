---
title: CLI and environment reference
description: Every maxim flag that shapes a simulation, the environment variables behind them, what a sim needs to run at all, and the exit-code contract — as the 1.1.3 code reads them.
---

The flags and variables below are quoted from the 1.1.3 parser and config loader. Where the engine's own
help text disagrees with what the code does, both are stated.

## How `--sim` dispatches

`--sim` takes an optional value. The value decides the path:

| Value | Path |
|---|---|
| a goal string | a [generative campaign](/guides/simulation/generative/); the string picks an arc by keyword |
| a `.yaml` path | probed in order as a curriculum (`stages:`), a DM campaign (`campaign:` + `encounters:`), then a scenario |
| `interactive` or nothing | the [interactive redirect](/guides/simulation/interactive/) into a generative sim |
| `agent`, `research`, `benchmark` | legacy aliases; `agent` and `research` are the only forms that accept `--goal` and `--sim-mode` |

A directory path globs its YAML files but runs only the first.

## Simulation flags

| Flag | Default | What it does |
|---|---|---|
| `--sim [GOAL_OR_PATH]` | | See above |
| `--goal`, `--sim-goal` | | The goal, for `--sim agent` and `--sim research` only; errors otherwise |
| `--dm` | off | With a YAML: redundant, campaigns are auto-detected. With a goal string: runs the generative runner labelled `dm`. It does not author campaign YAML; the help text says so since 1.1.2 |
| `--sim-max-turns N` | 50 | Ceiling. When reached the stall detector ends the run with `finish_reason=max_turns`, exit 0. The generative loop usually ends earlier on the arc's own per-phase turn counts, so the flag rarely binds; ignored on the interactive redirect, which hard-codes 200 |
| `--aut-mode llm-primary\|substrate-primary` | `llm-primary` | Whether an LLM or the NAc proposes the agent's actions. See [substrate-primary](/guides/simulation/curricula/#substrate-primary-the-llm-out-of-the-action-path) |
| `--aut-model MODEL` | | A separate model for the agent under test; the orchestrator and research agents use `--language-model` |
| `--sim-mode MODE` | `generative` | A label recorded in reports. The help calls it free-form; the code rejects any value other than `generative` unless `--sim agent` or `--sim research` is used |
| `--research` | off | Writer and reviewer agents produce a paper after the run. With substrate-primary it instead turns on per-tick substrate telemetry |
| `--campaign PATH` | | Campaign YAML or glob for research and benchmark runs |
| `--continuous` | off | Never auto-complete; keep testing until `/cancel` |
| `--resume-sim SESSION_ID` | | Restore a previous session's substrate and hand its findings to the orchestrator. There is no `--resume-session` flag |
| `--interactive [true\|false]` | auto | On for any TTY when unset. The help text says generative sims default off; they do not. Use the space-separated `--interactive false` form |
| `--seed N` | | Seeds Python, NumPy, Torch and `PYTHONHASHSEED`. Byte-identical runs need the fixture path with no live LLM |
| `--report-json PATH\|-` | | Emit the full report as JSON to a file or stdout; requires `--sim` |
| `--sim-report PATH` | | Write scenario expectation results as JSON; requires `--sim` |
| `--reap-orphans` | off | Kill stale `maxim` sim processes found at startup. Orphans are always warned about; killing is opt-in |

## Embodiment and curation

| Flag | Default | What it does |
|---|---|---|
| `--embodiment REF` | `bodies/base_humanoid` in sim mode | Load a component as the agent's body and generate its affordance tools |
| `--no-embodiment` | off | Run without a body, the pre-0.7 behaviour |
| `--deep-embodiment` | off | Level-3 per-sub-sensor damage routing; wants a capable model |
| `--auto-curate` | off | Before the sim, fill component coverage gaps with the foundry. Requires `--embodiment`; otherwise skipped with a note |
| `--curate-threshold N` | 5 | Minimum components per genre and category before curation triggers |
| `--no-curate` | off | Explicit opt-out |

## Sandbox

`--sandbox auto|docker|tmpdir` (default `auto`), `--sandbox-image IMAGE` (default `python:3.12-slim`),
`--sandbox-network none|bridge|host` (default `none`), `--no-sim-env`. See
[Safety and sandboxing](/guides/simulation/sandboxing/).

## Output

| Flag | Default | What it does |
|---|---|---|
| `--display clean\|bio\|debug` | `bio` | Which subsystems the terminal shows. Every event is persisted regardless |
| `--log-level 0\|1\|2` | 1 | Python logging level: warnings, info, debug. Not the display tier |
| `--show CHANNELS` | all | Filter terminal output by channel: `bio`, `bio-only`, `exec`, `sim`, `memory`, `safety` |
| `--trace [SUBSYSTEMS]`, `--debug` | | Detailed traces to stderr for `hippo`, `nac`, `atl`, `scn` or `all` |

## Models

| Flag | What it does |
|---|---|
| `--language-model NAME` | The LLM profile, persisted for later runs. Exits with a `pip install` hint if the backend package is missing |
| `--auto-download` | Skip the download prompt for a missing GGUF; same as `MAXIM_AUTO_DOWNLOAD_MODELS=1` |
| `--llm-n-ctx N` | Override the computed llama.cpp context window |
| `--cloud-fallback MODEL` | Add a cloud model as fallback on the inference lane; validates the profile, its API key variable and the SDK, then enables cloud dispatch with the standard redaction policy |
| `--cloud-lane LANE MODEL` | Assign a cloud model to one lane |
| `--cloud-budget DOLLARS` | Session cost cap for cloud providers, default $5. Only applied together with one of the two flags above; alone it does nothing |

## Environment variables

Three simulation settings are real `config.json` keys with environment forms; precedence is flag, then
environment, then `config.json`, then the built-in default.

| Variable | Config key | Default | Meaning |
|---|---|---|---|
| `MAXIM_SIM_AUT_TURN_TIMEOUT_S` | `sim.aut_turn_timeout_s` | 30, clamped to 5–1800 | The generative runner's per-turn window for the agent's response. Reasoning models that emit thinking chains want around 300 |
| `MAXIM_SIM_SUBSTRATE_EXPLORE_BONUS_WEIGHT` | `sim.substrate_explore_bonus_weight` | 0.0 | Exploration bonus in substrate-primary mode; 0 is byte-identical argmax |
| `MAXIM_SIM_DRIVE_GATE_ENABLED` | `sim.drive_gate_enabled` | false | Drive gating in substrate-primary mode. Dormant since 2026-06-23: the ablation graduated identically, so it carries no behavioural weight |

The rest are environment only:

| Variable | Default | Meaning |
|---|---|---|
| `MAXIM_LOG_FILE` | | Structured JSONL of the whole run; see [the two streams](/guides/simulation/outputs/#the-two-jsonl-streams) |
| `MAXIM_LOG_FILE_MAX_BYTES`, `MAXIM_LOG_FILE_BACKUP_COUNT` | 100 MB, 3 | Rotation; `0` disables |
| `MAXIM_BACKEND_TRACE` | | `1` raises per-call peer-backend records to INFO: tokens and latency per LLM call |
| `MAXIM_REPORT_JSON` | | What `--report-json` sets; consumed once per run |
| `MAXIM_AUTO_DOWNLOAD_MODELS` | | `1` skips the download prompt; mirrors `llm.auto_download` |
| `MAXIM_SIM_HARD_ABORT` | on | Opt-out for the wedged-LLM hard abort: 20 seconds after a wedge is detected the process exits 4 |
| `MAXIM_SIM_PLANNING_LIVENESS` | on | Opt-out for the planning-liveness abort; off reproduces the bug it fixed |
| `MAXIM_SIM_STALL_CHECK_INTERVAL_S` | 3.0 | Stall-detector poll cadence |
| `MAXIM_SIM_PING_PONG_BUDGET` | 6, or 12 interactive | Orchestrator actions allowed without a turn advance before a nudge |
| `MAXIM_STALL_FLOOR_S`, `MAXIM_STALL_MARGIN_S`, `MAXIM_STALL_MAX_BYTE_SILENCE_S` | 30, 10, 90 | The stall threshold is the floor or the lane timeout plus margin, whichever is larger; byte silence catches a wedged connection independent of call age. `MAXIM_SIM_STALL_THRESHOLD_S` is a deprecated alias for the floor |
| `MAXIM_OPERANT_ONLY_CREDIT` | | Cradle experiment toggle; see [the cradle apparatus](/guides/simulation/curricula/#the-cradle-apparatus) |
| `MAXIM_REAP_ORPHANS` | | Same as `--reap-orphans` |
| `MAXIM_SUBSTRATE_TOOL_WHITELIST` | | Substrate-primary candidate filter; an acknowledged band-aid |
| `MAXIM_SUBSTRATE_PATH` | | Enables the ATL substrate path, which is what makes `aut_ec.json` and `aut_atl.json` appear |
| `MAXIM_HIPPO_TRACE`, `MAXIM_NAC_TRACE`, `MAXIM_ATL_TRACE` | | What `--trace` sets |

## What a sim needs to run

Simulations need a language model. The engine counts a backend as present when any of these holds: a
cloud key variable is set (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`,
`TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`), `MAXIM_LLM_ENABLED=1`,
`MAXIM_LANE_LARGE_REMOTE_URL` points at a mesh leader, or the `llama_cpp` or `transformers` package
imports. That is a presence check, not a reachability check.

With none of them, the bare `maxim` menu prints:

```text
⚠ No LLM backend detected — chat and simulations need a model.
  Cloud:  pip install 'pymaxim[llm-anthropic]'  then export ANTHROPIC_API_KEY=...
  Local:  pip install 'pymaxim[llm-llama,llm-server]'
  Then run 'maxim doctor' to verify your setup.
```

`maxim --sim ...` does not print that warning; it proceeds and fails later. Note that the extras matter:
`[llm-llama]` is llama-cpp-python alone, `[llm-server]` adds the OpenAI-compatible local server, and
`[all]` includes both plus the cloud SDKs but deliberately excludes `yolo`, `llm-torch` and `semantic`.
Without `[semantic]` the encoder falls back to hashed bag-of-words embeddings, which is the documented
cause of a run reporting zero memories formed.

Even the cradle arcs that keep the LLM out of the agent's action path still use a narrator model for the
scene; with no model configured at all, a 6-turn cradle run on this site's test machine produced zero
actions.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | The run completed with usable evidence. The orchestrator's verdicts `failed`, `blocked` and `inconclusive` still exit 0: process success means run integrity, not a favourable result. `max_turns` is 0 too |
| 1 | `finish_reason` is `error`; a research review was rejected; or the command line was invalid |
| 4 | An abort: `aborted`, `aut_died`, `cancel`, `llm_wedged`, `planning_failed`, `stuck`, `worker_unavailable`. `cancel` is in this set, so typing `/cancel` exits like an infrastructure failure. The wedged-LLM backstop also exits 4 from a watchdog thread twenty seconds after detection |

Two paths use a different contract: `--benchmark` exits 0 or 1 on pass or fail, and a curriculum exits 0
or 1 on whether every stage ran.

## Related

- [What a run produces](/guides/simulation/outputs/)
- [Configuration](/configuration/) for `config.json` and the precedence rules
