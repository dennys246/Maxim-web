---
title: Simulation
description: Test Maxim's full cognitive pipeline without hardware — the percept boundary, the six ways to drive a run, which one to reach for, and what every run leaves behind.
---

An animal that closes its eyes can still think, plan and respond to touch. Maxim's simulation works the
same way: the whole cognitive pipeline runs as it would on a robot, but the senses are fed from a
script, a narrator model, or a second Maxim, instead of from a camera and microphone.

| Mode | Percept path |
|---|---|
| Live | Camera → vision engine → **Percept** → memory → agent → tools |
| Simulation | Script, narrator or orchestrator → **Percept** → memory → agent → tools |

Everything after the percept boundary is identical. The hippocampus, the NAc, the fear gate and the
pain detector all run their real code. That is why simulation is the project's instrument: mocking would
test whether the mocks work.

Every page in this section states what the 1.1.3 code does. Where the engine's own help text or older
documentation disagrees with the code, the page says so.

## The ways to drive a run

| You want to | Run | Page |
|---|---|---|
| Talk to the agent at a terminal and watch it think | `maxim --sim` | [Interactive sessions](/guides/simulation/interactive/) |
| A narrated story that exercises memory, safety, skills or a developmental arc | `maxim --sim "test memory recall"` | [Generative campaigns](/guides/simulation/generative/) |
| A second Maxim probing the first, adaptively, with a report at the end | `maxim --sim "probe conflicting instructions"` or `--sim agent` | [The simulation agent](/guides/simulation/orchestrator/) |
| Authored encounters with choices, branches, NPCs and dice | `maxim --sim scenarios/campaigns/heist_v1.yaml` | [DM campaigns](/guides/dm-campaigns/) |
| Scripted percepts with assertions, for CI and regression | `maxim --sim scenarios/malware_with_pain.yaml` | [YAML scenarios](/guides/simulation/scenarios/) |
| Chained runs where the substrate accumulates, with no LLM choosing actions | `maxim --sim scenarios/cradle/roy_0_smoke.yaml` | [Fixtures and curricula](/guides/simulation/curricula/) |
| Compare several models on a scenario suite | `maxim --benchmark tier1 --models a,b` | [Benchmarks](/guides/benchmarks/) |

The reference pages cover [what every run produces](/guides/simulation/outputs/),
[every flag and environment variable](/guides/simulation/cli/), and
[safety and sandboxing](/guides/simulation/sandboxing/).

## Three things to know before the first run

**A sim needs a model.** Even the arcs that keep the LLM out of the agent's decisions use a narrator
model for the scene. With none configured a run proceeds and fails later; the bare `maxim` menu is the
only place that warns. The [reference page](/guides/simulation/cli/#what-a-sim-needs-to-run) lists what
counts as configured.

**Every sim has a body.** Unless you pass `--no-embodiment`, the agent is `bodies/base_humanoid` and
novel entities in the scene get designed on the fly. That design step is the expensive part of a
generative run; `MAXIM_DISABLE_IMAGINATION=1` turns it off.

**Determinism has a boundary.** Scripted percepts, expectation checks and substrate-primary action
selection are reproducible; anything an LLM writes is not. `--seed` seeds every random source, and its own
help text says byte-identical runs need the fixture path with no live model.

## A first run

```bash
pip install 'pymaxim[llm-llama,llm-server]'      # or [llm-anthropic] + ANTHROPIC_API_KEY
maxim --sim "test memory recall under interference" --sim-max-turns 8
```

You will see the split-panel display, a narrated scene, the agent's percepts and actions with their
subsystem tags, and a session report at the end under `~/.maxim/sim_reports/<session_id>/`. Read it with
[What a run produces](/guides/simulation/outputs/).

## Where the evidence lives

Simulation is how the project's claims were earned and bounded. The [evidence page](/research/evidence/)
gives each result with its caveat, the [experiments index](/research/experiments/) is the lab notebook,
and the [measurement limits](/research/limits/) page catalogs what the instrument cannot see.
