---
title: Fixtures, curricula and the Roy harness
description: Running scenarios without a narrator, chaining runs so the substrate accumulates, substrate-primary action selection, the cradle apparatus, and the three-arm Roy iteration.
---

This is the research end of simulation: the paths that take the LLM out of the loop, chain many runs
into one, and measure what the substrate learned. Everything here is verified against the 1.1.3 code and
the experiment write-ups.

## Fixtures: the same file, no narrator

A fixture is not a separate format. It is a [scenario file](/guides/simulation/scenarios/) run by the
fixture orchestrator instead of the agent loop's scenario source. The difference is a role:

| | Scenario | Fixture |
|---|---|---|
| Schema | the scenario schema | identical |
| Narrator LLM | present in generative and campaign modes | absent by construction |
| How you reach it | `maxim --sim path.yaml` | a curriculum stage's `fixture:`, or a Roy spec |

There is no `--fixture` flag. The fixture orchestrator injects each percept through the bridge, waits for
the agent's response (2 s settle, 30 s per-turn timeout), records the turns, snapshots the bio-systems at
the end into `substrate_metrics`, and checks the expectations. The agent's own LLM calls still happen
unless you also switch to substrate-primary.

Some files under `scenarios/substrate/` are fixtures in a stricter sense: dataset descriptors pinned by a
SHA-256 in the test that loads them, where editing a class name or sample index fails CI unless the hash
is bumped in a commit that says so.

## Curricula: chaining runs

A curriculum YAML has a top-level `stages:` list, and `maxim --sim <file>` detects it before anything
else. Each stage runs as one simulation, with the previous stage's session resumed, so the hippocampus,
NAc, ATL and EC carry across the whole sequence. That is what turns a Roy iteration into one command.

```yaml
name: roy-0-smoke
embodiment: bodies/infant_humanoid
aut_mode: substrate-primary
mode: generative

stages:
  - name: act1_warmup
    fixture: warmup.yaml
    turns: 4
  - name: act2_warmup_resumed
    fixture: warmup.yaml
    turns: 4
```

That is `scenarios/cradle/roy_0_smoke.yaml`, whole. The same fixture runs twice on purpose: the point is
the chain, not the content.

| Key | Where | Notes |
|---|---|---|
| `name` | top | required |
| `stages` | top | required, non-empty |
| `embodiment`, `aut_mode`, `mode` | top or stage | stage values override; `aut_mode` must be `llm-primary` or `substrate-primary`; `persona` is accepted as a legacy alias for `mode` |
| `name` | stage | required and unique |
| exactly one of `fixture`, `arc`, `goal` | stage | a fixture path resolves against the curriculum's own directory and must exist at parse time; an arc name selects a built-in arc; a goal string goes through the same arc matching as the CLI |
| `turns` | stage | required, positive |

All schema problems raise before any sim runs. The chain stops, and reports where, if a stage raises, ends
with a failure reason, or returns an empty session id; the runner refuses to resume from an empty id
because the orchestrator would silently treat that as a fresh start and break the chain. Exit code is
0 when every stage ran, 1 otherwise, which is a different contract from a single sim's
[exit codes](/guides/simulation/cli/#exit-codes).

## Substrate-primary: the LLM out of the action path

```bash
maxim --sim cradle_prelinguistic --aut-mode substrate-primary --embodiment bodies/infant_humanoid
```

With `--aut-mode substrate-primary` the agent under test never asks an LLM what to do. Each tick, the
NAc's `recommend_action` scores the available tools and the top score acts. If the substrate has no
opinion, the tick is idle; there is no random fallback. The score is a sum of:

- the per-tool reward bias, and the cluster-keyed reward bias summed across the active perceptual clusters;
- an unweighted causal term from the best positive causal link, with negative links at half weight;
- a drive-relevance heuristic for drives above 0.5, by name match or a keyword affinity table the code
  itself calls a stand-in until entorhinal integration;
- an exploration bonus of `weight / (1 + visits)`, added last, with never-tried tools getting the full
  weight so every tool is tried once before learned scores can lock selection.

Introspection tools are excluded from the candidate set because they always succeed and their confidence
would snowball. The exploration weight is `sim.substrate_explore_bonus_weight` in `config.json`, or
`MAXIM_SIM_SUBSTRATE_EXPLORE_BONUS_WEIGHT`; the default `0.0` is byte-identical legacy argmax, and the
engine warns if you set it below the confidence gate, where it would silently do nothing. There is no
`--explore-weight` flag on `maxim` itself; the harness scripts under `scripts/` have one.

The narrator, when a stage or goal has one, still narrates the scene with an LLM. The mode removes the
LLM from the **agent's** decisions, not from the world. Two things the contributor brief calls out:
substrate-primary runs must pass an infant body, and `MAXIM_SUBSTRATE_TOOL_WHITELIST` exists as an
acknowledged band-aid that masks a credit-assignment root cause tracked in a deferred plan.

## The cradle apparatus

The cradle arcs put an infant body in a room with a reactive, scripted mother: no LLM, a deterministic
stimulus each turn. Per turn she rewards the infant for its **previous** turn's movement toward her,
places the next stimulus, optionally guides, and speaks a line of motherese. The order is load-bearing;
the reward must read the azimuth the infant's own action left before the new stimulus overwrites it.

The `MotherScaffold` config per act sets `guide_strength` (the operant arcs keep it at `0.0`, since
turning the infant's head and then crediting the infant for it would be dishonest), `feed_amount`,
`oriented_threshold`, the `stimulus_azimuths` she calls from, and `stimulus_order`. That last one matters:
`cycle` replays the azimuths in declaration order every block, which against a deterministic agent
phase-locks the whole apparatus; `shuffled` keeps every stimulus once per block with a seeded order. The
phase-locking finding has its own entry on the [measurement limits](/research/limits/) page.

Credit is `relief` by default: the reward's value is the drive comfort the feed actually produced, so a
feed that relieves nothing mints nothing. `constant` is kept for the A/B against the earlier experiments.

`MAXIM_OPERANT_ONLY_CREDIT=1` suppresses the tool-success reward floor so the mother's contingent feed is
the sole teacher. It is a half-fix: it gates the cluster surface only, and the causal-link surface is
credited before it can act, which is why the ledger records Exp 52's "sole teacher" claim as holding for
the cluster surface. The 2026-08-31 fix to outcome tiers records a re-run owed on Exp 42 and 52.

Status, stated as the repo states it: the module docstring says the embodied cradle-mother result was
validated in Exp 48 and superseded by Exp 52's graduated result; the contributor brief still lists the
demo as dormant. The two disagree in-tree at 1.1.3, and this site does not pick a winner. The
[evidence page](/research/evidence/) carries the results with their caveats.

## The Roy harness

"Roy" is the persona-convergence crucible: does a lifetime of priming change what the substrate does on a
held-out test, and can a prompt fake it? `maxim roy` has three subcommands.

| Command | Does |
|---|---|
| `maxim roy run <spec.yaml> [--dry-run]` | The three-arm iteration: run the priming curriculum, then the same held-out test three times |
| `maxim roy diff <session_a> <session_b> [--json]` | Substrate divergence between two session directories: NAc, EC, hippocampus, ATL |
| `maxim roy log <iteration_id>` | The reproduction runbook plus an iteration-log entry from a recorded result |

| Arm | Substrate at test | Prompt at test |
|---|---|---|
| A | primed by the full curriculum | neutral |
| B | blank | historically "persona-injected" |
| C | blank | neutral |

One honesty note the runner's own docstring makes: the per-arm `system_prompt` slug is a report label. The
persona system was removed in 1.1, and the slug never injected a prompt; `neutral` is the canonical
no-injection value. So arm B's column is a historical label at 1.1.3, not a live mechanism.

Results land in `~/.maxim/roy/<iteration>/` as `result.json` and `summary.md`. Seventeen iteration specs
ship under `scenarios/roy/`, and each has a numbered write-up under the engine's `docs/experiments/`.

## Benchmarks versus sims

`--benchmark` runs a scenario suite across several models and scores them; `maxim bench` is a tight LLM
call loop for measuring the peer path's recovery time with no substrate in the loop at all. Neither is a
simulation in this section's sense. The [benchmarks guide](/guides/benchmarks/) covers the first; the
`--benchmark` help text is honest that only the tier 1 suite ships and that tier 2 and 3 name suites
that do not exist.

## Related

- [YAML scenarios](/guides/simulation/scenarios/) for the file format
- [What a run produces](/guides/simulation/outputs/) for `substrate_metrics` and the snapshots
- [Experiments](/research/experiments/) for the Roy iterations and the cradle results
