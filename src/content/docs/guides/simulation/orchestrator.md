---
title: The simulation agent
description: A second Maxim instance that drives the first — its tools, how it decides it is done, the liveness guards behind it, and research mode's writer and reviewer.
---

When a goal matches no narrative arc, or when you use the legacy `--sim agent` form, a second Maxim
instance called the **orchestrator** drives the agent under test through a bridge. It plans probes,
observes what the agent does, and decides when to stop. This page is how it works at 1.1.3.

```bash
maxim --sim "probe how it handles conflicting instructions"   # no arc keyword → orchestrator
maxim --sim agent --goal "test safety boundaries" --sim-mode adversarial
maxim --sim agent --goal "continue testing" --resume-sim 20260403_142315
maxim --sim agent --goal "test everything" --continuous
```

## Two loops, one bridge

The agent under test runs its normal agentic loop on a daemon thread, reading percepts from the bridge and
writing actions back to it. The orchestrator runs a second loop with its own tool registry and its own
LLM lane. A third thread reads stdin for the [commands](/guides/simulation/interactive/#commands). The
bridge's `send_and_wait` injects a percept, waits until the agent stops producing actions, and returns
the response in one call, which is why the two loops serialise cleanly on a single model.

## The orchestrator's tools

The registry never raises on an unknown tool name: it returns a fallback that fails the call with the
list of tools that do exist and a nudge to use `send_message`.

| Tool | What it does |
|---|---|
| `send_message` | Inject a percept and block until the agent settles. The primary probe. |
| `observe_actions` | Read the action history, or actions since a turn. |
| `inspect_aut` | Read-only queries into the agent's state: memory recall, causal links, predictions, pain history, energy, stats, concepts, temporal patterns. |
| `inject_pain` | Send a proprioceptive pain signal. |
| `check_completion` | Bookkeeping, not an LLM judgement despite its docstring: it reports complete only once fifty turns have passed, a constant unrelated to `--sim-max-turns`, and never under `--continuous`. |
| `analyze_results` | Groups actions by tool, counts blocks, and adds a safety summary or response samples. Also no LLM call. |
| `spawn_sub_simulation` | A fresh agent with clean state for an isolated measurement; the next spawn tears down the previous one. Takes a free-form `approach` such as `adversarial`, `sweep`, `cooperative`, `confused`, `escalating`. |
| `extend_simulation` | Send a new objective to the live sub-agent if one exists, else to the main agent. |
| `finish_simulation` | End the run with a verdict: `completed`, `failed`, `inconclusive`, `blocked`, `stuck` or `aborted`. An unknown verdict is coerced to `completed` with a warning. |
| `record_experiment`, `query_experiments` | The experiment log, registered in every mode. |
| `orchestrator_act`, `damage_component`, `set_entity_sensor` | Present when an embodiment is active. |

A `generate_scenario` tool is defined in the code but never registered, so the orchestrator cannot call
it; older docs list it as available.

The orchestrator's strategy comes from the goal text. Ask for systematic spawning across categories or
depth-first extension in the goal and it will use the two tools that way; `--sim-mode` is only a label.

## Ending, resuming, continuing

- **`--sim-max-turns`** is enforced here: a stall detector thread watches the bridge and injects a
  `max_turns` termination when the count is reached, exit code 0.
- **`--resume-sim SESSION_ID`** restores the previous run's substrate snapshots and hands the orchestrator
  the previous report's summary, issues and recommendations as context. Prefix matching works.
- **`--continuous`** never auto-completes; the orchestrator spawns and extends until `/cancel`.

The agent under test auto-approves confirmation prompts, plan approvals and timeout retries by default so
a headless run cannot deadlock on stdin. The other response policies, auto-reject, delayed and
ask-orchestrator, exist to test refusals, timeouts and full confirmation flows.

## The liveness guards

Two defects from the bugs ledger shaped this path, and both guards are on by default.

**Planning liveness.** A planning turn that ends without an executable proposal, whether from a parse
failure, an invalid response or a dropped proposal, used to idle the orchestrator forever: it has no
action sink and no outside percept producer to wake it. Now the same request is requeued byte-identically
under a bounded budget, and when the budget is spent the run aborts with `llm_wedged` rather than
hanging. Only the orchestrator opts in; every other loop already has a re-arm path.
`MAXIM_SIM_PLANNING_LIVENESS=0` reproduces the old behaviour.

**Spinner truth.** The status line used to say "Orchestrator planning next probe…" from the moment a
turn ended, whatever happened after, so a dead loop displayed planning for hours. The stall detector now
overwrites that line with the truth from the call registry when nothing is in flight or the in-flight
call has gone silent. A display fix, not a scheduling one.

A wedged model is also backed by a hard abort: twenty seconds after detection the process exits 4 from a
watchdog thread. `MAXIM_SIM_HARD_ABORT=0` opts out.

## Research mode

```bash
maxim --sim "hippocampal recall under interference" --research
maxim --sim "hippocampal recall" --research --campaign scenarios/experiments/hippocampal_recall_short.yaml
maxim --sim "hippocampal recall" --research --language-model claude-sonnet --aut-model mistral-7b
```

`--research` runs the simulation, then a **writer** agent drafts a structured paper from the experiment
log and a **reviewer** agent critiques it, for up to three revision rounds. With `--campaign`, the
campaign's percepts are injected directly through the bridge and the orchestrator model is bypassed.

The gate that matters: if the underlying run ended with an abort reason, the writer and reviewer are
skipped and the result records "underlying simulation was unusable". A bad experiment never becomes a
paper. Results land under `data/sim_reports/research_<id>/`, relative to the working directory, as
`research_result.json`, `bus_history.json` and `paper.md`. The surface is marked experimental in the
engine and can change within 1.x.

`--research` together with `--aut-mode substrate-primary` does something different: it turns on
per-tick substrate telemetry and runs the normal path, with no paper.

## DM campaigns

Authored campaigns with encounters, choices and branches are their own runtime, not the orchestrator;
the [DM campaigns guide](/guides/dm-campaigns/) covers the format, the five-layer choice classifier,
dice, flags and reveals, and the eleven shipped campaigns.

## Related

- [Generative campaigns](/guides/simulation/generative/) for goals that do match an arc
- [Interactive sessions](/guides/simulation/interactive/) for the command line during a run
- [What a run produces](/guides/simulation/outputs/) for the report the roundup writes into
