---
title: Cross-session learning
description: The experimental record behind Maxim's headline claim — that agents accumulate substrate knowledge across sessions and recall it later with no gradient updates — stated precisely, with the earned line kept sharp against what remains unproven.
---

This is Maxim's most important claim, and its most over-claimable one. This page
states it exactly, walks the experiments that support and bound it, and shows
you how to reproduce the inspection yourself. Maxim is a bio-inspired cognitive
architecture built on the Python package `pymaxim`; nothing here involves
touching model weights.

## The claim, stated precisely

Cross-session learning without fine-tuning means one thing:

> The **substrate** — episodes, causal links, and concepts — persists to disk
> during a session and is **recalled in later sessions** as natural-language
> context, with **no gradient updates** to the language model.

Read the negations as carefully as the assertion:

- It is **not weight modification.** No parameter is trained, adapted, or
  fine-tuned. The LLM that runs session two is byte-for-byte the LLM that ran
  session one. What changes is the context assembled around it, drawn from the
  [Hippocampus](/systems/hippocampus/), [Nucleus Accumbens](/systems/nucleus-accumbens/),
  and [Anterior Temporal Lobe](/systems/anterior-temporal-lobe/) after they were
  saved and reloaded.
- It is **not a guarantee that recalled context changes behavior.** This is the
  "1.0 finding," and it is the honest core of the whole program: **strong LLM
  priors often dominate the substrate signal.** A recalled memory can be present
  in the prompt and change nothing about what the agent does, because the base
  model already had a strong opinion.

So the reliable signal is *recall* — that prior-session substrate demonstrably
resurfaces. *Behavioral change* is a separate, harder, and only partially
demonstrated claim. The experiments below keep those two apart on purpose.

## The experiments

Reverse-chronological. "EARNED" marks a result the record treats as sound;
"PARTIAL" marks a claim that is only half-supported by its own falsification
tests.

| ID | Date | Experiment | Status | Result |
|----|------|-----------|--------|--------|
| 37 | 2026-05-30 | [Cross-session graduation](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_session_graduation.md) | Pre-registered → **PARTIAL** | Behavioral delta appears only at ≥32B scale; independence from LLM priors **not** isolated (Arm C confound) |
| 12 | 2026-04-30 | [V1 phased attribution](https://github.com/dennys246/Maxim/blob/main/docs/experiments/12_v1_phased_attribution.md) | Recorded — **CLEAN PASS** | Substrate alone recalls a planted token across sessions; 7/7 phases |
| 10 | 2026-04-25 | [Cross-session enrichment](https://github.com/dennys246/Maxim/blob/main/docs/experiments/10_cross_session_enrichment.md) | Recorded — **EARNED** | Prior-session memories surface in resumed prompts (3 per turn) |
| B4 | 2026-04-17 | [Organic learning, Tier 3](https://github.com/dennys246/Maxim/blob/main/docs/experiments/behavioral_convergence_exp4_tier3.md) | PASS (5/5) | Agent converges to optimal choice across sessions: 0% → 25% → 100% |
| B3 | 2026-04-17 | [LLM acts on substrate, Tier 2](https://github.com/dennys246/Maxim/blob/main/docs/experiments/behavioral_convergence_exp3_tier2.md) | PASS (12/12) | Experienced agent picks antidote 10/10; fresh agent 0/10 |
| B2 | 2026-04-17 | [Consumable learning](https://github.com/dennys246/Maxim/blob/main/docs/experiments/behavioral_convergence_exp2.md) | PASS (13/13) | Energy-driven valences persist to disk and reload |
| HC | 2026-04-06 | [Hippocampal recall](https://github.com/dennys246/Maxim/blob/main/docs/experiments/hippocampal_recall_experiment.md) · [run notes](https://github.com/dennys246/Maxim/blob/main/docs/experiments/hippocampal_recall_run_notes.md) | Run notes | Memory survival 1.0; behavioral recall 0 |

### Cross-session graduation (Experiment 37)

This is the pre-registered "1.0 gate": a paired fresh-vs-resume measurement in
the Cradle harness. Scenario, metric, and ablations were locked before any trial
ran. The design is three arms plus ablations, five trials each — Arm A (fresh
agent), Arm B (resumed from a *failure*-prior session), Arm C (resumed from a
*peaceful*-prior session, the confound control), plus three Arm-B ablations
(Wire-A off, Wire-1 off, NAc-bias zeroed). Total target: 60 baseline + 20 local
Qwen replication = 80 runs.

The primary metric is `positive_approach_engagement_fraction` — the share of
fire-pit actions that are safe affordances (observe/examine). The acceptance
test is a standard-deviation shift: `(B − A) / A.sd ≥ +1.0`. Arm C exists to
catch a general-caution confound: if resuming from *any* prior (not just the
failure) shifts behavior, the effect is not memory of the failure.

The result is model-dependent, and that is the finding:

| Model | Date | Arm A | Arm B | Δ (SD) | Primary |
|-------|------|-------|-------|--------|---------|
| Qwen2.5-14B | 2026-06-06 | 0.533 | 0.517 | −0.06 | **FAIL** |
| Qwen2.5-32B | 2026-06-08 | 0.420 | 0.800 | **+1.43** | **PASS** |
| Mistral-Small-24B | 2026-06-11 | 1.000 | 0.600 | wrong dir. | **FAIL** (ceiling) |
| DeepSeek-R1-Distill-Qwen-32B | 2026-06-13 | 0.259 | 0.566 | **+2.11** | **PASS** |

The cross-model pattern is a "Goldilocks zone": the transfer signal is only
detectable when the base model's priors leave headroom between naive and optimal
behavior. Qwen-14B's priors were too weak for the signal to emerge; Mistral's
were strong enough to already solve the scenario (Arm A = 1.000, no headroom);
the two 32B models sat in the detectable range, and the reasoning-trained
R1-Distill produced the only clean ablation (Wire-A off shrinks the delta by
+1.13 SD, implicating cluster-bias annotation as the load-bearing mechanism).

But the isolation test failed on **every** fire where the primary passed. On
Qwen-32B, Arm C = 0.667, outside Arm A's [0.033, 0.660] band; on R1-Distill,
Arm C = 0.527 ≈ Arm B, again outside the band. The effect generalizes across
priors — it is not specific to memory of the fire failure. So the verdict is
**PARTIAL**, an investigation gate: it confirms *substrate carries cross-session
memory and shifts behavior at ≥32B scale*, but does **not** establish that the
substrate drives behavior *independently* of the LLM prior. The strong claim is
explicitly deferred to Experiment 38 (substrate-primary measurement with the
LLM-prior confound removed) — see [substrate-primary evidence](/research/experiments/substrate-primary-evidence/).

### Substrate recall, isolated (Experiment 12)

Experiment 10 first showed 3 memories surfacing per turn on resume, but with
five scaffolds firing at once (prompt preambles, an acting coach, sandbox text,
a default persona, and embodiment). Experiment 12 stripped them out. Across
seven phases — Phase A disables all five contributors, Phases B–F re-enable each
one individually, Phase G is the all-defaults control — each phase plants the
token `BLUE-7-DAWN` in an 8-turn session, then attempts retrieval in a separate
8-turn session sharing one isolated data directory.

All 7 phases recalled the token (7/7). Critically, **Phase A (substrate-only)**
succeeded: cross-session recall reproduces with none of the five scaffolds
present. Memory counts grew 193 → 421 and causal links 142 → 310 across the pair,
and the trace shows the agent querying `memory_recall` and then answering with
the token — retrieval, not hallucination. This is the cleanest evidence for the
recall half of the claim: a **CLEAN PASS**.

### Consumable / affordance learning (Experiments B2–B4)

Three convergence experiments, all Qwen2.5-14B, escalate from "the substrate
learns" to "the LLM acts on what it learned":

- **B2 (13/13)** — energy-driven consumable learning. After energy-depletion
  episodes, learned valences persist to disk and reload: food ration +0.700 edge
  → +0.753 on retrieval, water flask +0.500 → +0.135, poison vial −0.900 →
  −0.495. Control agents show 0.000 across all entities.
- **B3 (12/12)** — the substrate changes the LLM's choice. Masked vials with
  arbitrary descriptions (no pretraining semantics): teal +0.933, purple +0.540,
  orange −0.552. At temperature 0.3, N = 10 per condition, the experienced agent
  chose the antidote **10/10 (100%)** and the fresh agent **0/10 (0%)** — the
  fresh agent defaulted to purple 70% of the time on aesthetics alone.
- **B4 (5/5)** — organic learning across four sessions, described as "the
  ultimate proof." Teal-vial selection climbs 0% (fresh, death) → 25%
  (persistent, escape) → 100% (persistent, one-turn solve), with a fresh control
  back at 0% (death).

These are the strongest behavioral results in the record. Note the honest caveat
they carry themselves: they run at 14B, where Experiment 37 later found the base
prior *too weak* for its fire scenario — the effect size depends heavily on the
scenario and the model, and none of B2–B4 include an Arm-C-style peaceful-prior
control.

### Memory recall under interference (Hippocampal recall)

The interference study seeds a password — "Verath" — in Act 1, inserts unrelated
narrative turns (ferryman, bandits, merchant), then in Act 3 presents an indirect
cue (a door beneath a silver elm) and asks whether the agent retrieves it. A
weaker AUT (Mistral-7B) is used deliberately, so that recall past its attention
span must be the Hippocampus doing the work rather than the context window.

The run notes (2026-04-06, orchestrator Qwen2.5-14B, AUT Mistral-7B, 7-turn
campaign, 3 interference turns) produced the program's defining distinction:
**memory survival rate 1.0, behavioral recall 0.** Verath survived in the
hippocampus and the agent recited it accurately in an epilogue reflection — but
at the door itself it reached for `read_file` instead of speaking the word. The
substrate remembered; the behavior did not follow. This is exactly the 1.0
finding, observed directly: persistence and action are two claims, not one.

## How to see it yourself

The inspection workflow is the `roy diff` command, which compares the substrate
divergence between two recorded sessions (see the [Roy harness](/research/experiments/roy-harness/)).
The exact syntax, verified against the user guide:

```bash
# Run a learning session with substrate persistence enabled
MAXIM_SUBSTRATE_PATH=1 maxim --sim "learn that gripping the rusty blade causes pain" \
  --embodiment weapons/rusty_sword \
  --interactive false \
  --sim-max-turns 12

# Compare two recorded sessions for divergence
maxim roy diff sim_20260606_140510_z9y8 sim_20260606_141203_a1b2

# Machine-readable output
maxim roy diff sim_20260606_140510_z9y8 sim_20260606_141203_a1b2 --json

# Resume a later session with the prior session's learning loaded
MAXIM_SUBSTRATE_PATH=1 maxim --sim "decide whether to grip the rusty blade again" \
  --embodiment weapons/rusty_sword \
  --resume-sim sim_20260606_141203_a1b2 \
  --interactive false \
  --sim-max-turns 8
```

`maxim roy diff <session_a> <session_b>` takes two session ids positionally and
prints how the substrate diverged; add `--json` for a parseable form. The
`--resume-sim <session_id>` flag is what loads prior-session substrate into a new
run. For quality memory, install the semantic extras:
`pip install 'pymaxim[all,semantic]'` plus `python -m spacy download en_core_web_sm`;
for a local LLM backend, `pip install 'pymaxim[llm-llama,llm-server]'`.

## Status and caveats

- **Recall is EARNED.** Experiments 10 and 12 establish that substrate persists
  and resurfaces across sessions with no gradient updates. Experiment 12 Phase A
  isolates this to the substrate alone.
- **Independent behavioral drive is NOT yet earned.** Experiment 37 is
  **PARTIAL** — its Arm C isolation test failed on every model where the primary
  metric passed, so "the substrate changes behavior *independently of the LLM
  prior*" is deferred to Experiment 38.
- **Small N.** Experiment 37 arms are 5 trials each; B3 is N = 10 per condition;
  the interference run notes are single observational runs, not a formal
  statistical analysis. Effects are model- and scenario-dependent, living inside
  a narrow "Goldilocks" headroom band.
- **Persistence ≠ behavior.** The hippocampal run notes show memory survival 1.0
  with behavioral recall 0 — the sharpest reminder that a recalled memory need
  not move the agent.
- The 14B behavioral wins (B2–B4) and the 14B graduation FAIL are not in tension:
  they use different scenarios with different prior strength. Read them together,
  not as a contradiction.

## Reproduce

- Experiments index: [/research/experiments/](/research/experiments/)
- Graduation protocol & results: [37_cross_session_graduation.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_session_graduation.md)
- Substrate-only recall: [12_v1_phased_attribution.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/12_v1_phased_attribution.md)
- Enrichment (EARNED): [10_cross_session_enrichment.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/10_cross_session_enrichment.md)
- Consumable / behavioral convergence: [B2](https://github.com/dennys246/Maxim/blob/main/docs/experiments/behavioral_convergence_exp2.md) · [B3](https://github.com/dennys246/Maxim/blob/main/docs/experiments/behavioral_convergence_exp3_tier2.md) · [B4](https://github.com/dennys246/Maxim/blob/main/docs/experiments/behavioral_convergence_exp4_tier3.md)
- Interference: [hippocampal_recall_experiment.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/hippocampal_recall_experiment.md) · [run notes](https://github.com/dennys246/Maxim/blob/main/docs/experiments/hippocampal_recall_run_notes.md)
- User-facing guide with `maxim roy diff`: [cross-session-learning.md](https://github.com/dennys246/Maxim/blob/main/docs/user/cross-session-learning.md)
- Deeper reading: [substrate-primary evidence](/research/experiments/substrate-primary-evidence/) · [memory systems](https://www.dennyschaedig.com/maxim/memory-systems) · [benchmarks](https://www.dennyschaedig.com/maxim/benchmarks)


## Run it yourself

Every experiment's exact, copy-paste reproduction commands live beside its raw data in
the pymaxim repo, each pinned to a git hash:

- Protocols (runnable command sequences): [docs/experiments/protocols/](https://github.com/dennys246/Maxim/tree/main/docs/experiments/protocols)
- Raw results (machine-readable JSON): [docs/experiments/results/](https://github.com/dennys246/Maxim/tree/main/docs/experiments/results)

For a quick local smoke run, the simulation harness needs no hardware:

```bash
pip install 'pymaxim[all]'
maxim --sim "test memory recall under interference"
```

:::tip[Running it long-term]
To watch substrate accumulate across many sessions — rather than a one-shot sim — drive
Maxim from [maxim-pulse](https://github.com/dennys246/maxim-pulse), the Console app built
to observe and steer agents over time. This site links to it; the runs happen there, not
here.
:::
