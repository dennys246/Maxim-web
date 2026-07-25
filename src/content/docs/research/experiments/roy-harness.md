---
title: The Roy harness
description: Maxim's three-arm falsification methodology for isolating whether carried bio-substrate changes agent behavior or LLM priors dominate it.
---

The Roy harness is the experimental protocol Maxim uses to answer one uncomfortable question: when a session carries a bio-substrate forward, does that substrate actually change what the agent *does*, or is the language model's own prior doing all the work while the substrate rides along invisibly? It is falsification-oriented work. The headline result across the series is not a triumphant "the substrate drives behavior" — it is the more honest "LLM priors usually dominate the carried substrate, except inside a narrow window." This page describes the method, walks the arc of iterations, and reports the numbers as the [experiment records](https://github.com/dennys246/Maxim/tree/main/docs/experiments) state them.

Maxim is a [bio-inspired cognitive architecture](/concepts/architecture/) delivered as the `pymaxim` package. If you are new to the substrate — the [nucleus accumbens](/systems/nucleus-accumbens/) reward biases, [anterior temporal lobe](/systems/anterior-temporal-lobe/) concept graph, and the hippocampal episode store that priming writes into — the [experiments index](/research/experiments/) and the [cradle](/research/cradle/) protocol are the right prerequisites.

## What the Roy harness is

The harness runs identical held-out test scenarios across **three arms** that differ only in how the agent arrives at test time. The arm names are literal: **A**, **B**, and **C**. In the founding iteration ([`16_roy_1a.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/16_roy_1a.md)) they were defined as:

- **Arm A** — substrate primed for a full Roy lifetime (5 stages x 10 turns of `cradle_prelinguistic`), then tested; **neutral** system prompt.
- **Arm B** — blank substrate, **persona-injected** system prompt (e.g. "You are a hungry infant").
- **Arm C** — blank substrate, **neutral** system prompt.

The point of the design is the **counter-prior dilemma**. As the [substrate-primary](https://www.dennyschaedig.com/maxim/substrate-primary) writeup puts it, the interesting question is *not* "does arm A look like the target persona at test time" — because both A and B will look like it, since the LLM is good at role-play. If you only inspect behavioral output, the substrate's real contribution is invisible: a persona prompt (arm B) can counterfeit it. So the harness does not trust surface behavior alone. It computes **substrate-level divergence metrics** between arms — NAc reward biases, hippocampus episode counts, ATL concept Jaccard, salience and valence distributions — to ask whether A carries something B cannot fake.

The harness is also tied to a long-horizon behavioral criterion: the **D&D survival test**. A substrate-primary agent (no LLM in the action path) must either navigate D&D campaigns successfully (validating the substrate thesis), or fail while an LLM-driven agent succeeds (indicating substrate insufficiency), or both fail (indicating the simulation environment itself is broken). D&D is chosen for its long-horizon temporal structure, novel entities every session, delayed-reward decision-making, role-coherence demands, and multi-agent dynamics — properties a role-play prior cannot shortcut.

## The arc of iterations

The Roy series proper runs from the G3/G4 preflight and baseline work through Roy-5b. Reverse-chronological:

| Entry | Date | Status | One-line result |
|---|---|---|---|
| [`36_roy_5b_confound_isolation`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/36_roy_5b_confound_isolation.md) | 2026-05-29 | recorded | Branch A decisive: the EC drift fix (0.40 → 0.44) closes the gap; the naming-event scaffold adds zero. `naming_events.py` marked Dormant. |
| [`35_roy_5b`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/35_roy_5b.md) | 2026-05-28 | recorded | Conditional PASS / ambiguous: pre-reg row 1 passes but on a (drive, drive) intra-modal edge; EC-drift confound unresolved. |
| [`29_roy_3c_bisect`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/29_roy_3c_bisect.md) | 2026-05-24 | recorded | Wire merges did *not* cause the Roy-3 regression; encoder drift + intentional Wire-A decay explain it. |
| [`23_roy_3`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/23_roy_3.md) | 2026-05-23 | recorded | PRIMARY FAILED: zero `sense_food_source` calls in any arm; wiring bug (empty cluster-bias section rendered as `""`) found post-run. |
| [`22_roy_5a`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/22_roy_5a.md) | 2026-05-14 | recorded | H1a confirmed: food concepts land in interoception-modality EC nodes (384-dim), not text-modality (768-dim). Cross-modal binding was structurally impossible. |
| [`21_roy_4`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/21_roy_4.md) | 2026-05-13 | recorded | **FAIL**: Hebbian binding cannot close the Roy-2c gap; priming and test EC clusters are structurally disjoint. Cross-modal binding plan cancelled. |
| [`20_roy_2c`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/20_roy_2c.md) | 2026-05-13 | recorded | H1 confirmed *only* with `min_confidence=0.0`: the substrate-primary proposer consumes the cluster wire when the cold-start gate is bypassed. |
| [`19_roy_2pc`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/19_roy_2pc.md) | 2026-05-13 | recorded | Positive control on an engineered-overlap fixture; A ≈ B ≈ C surfaces a sample-asymmetry caveat. |
| [`18_roy_2`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/18_roy_2.md) | 2026-05-12 | recorded | Wider priming arc; partial behavioral divergence, but prompt-mediated, not cluster-bias-mediated. |
| [`17_roy_1b`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/17_roy_1b.md) | 2026-05-12 | recorded | Substrate-primary AUT at test; three-pointer methodology refinement. |
| [`16_roy_1a`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/16_roy_1a.md) | 2026-05-12 | recorded | Substrate priming writes readable bio-state; salience divergence KS=0.879 is the load-bearing positive finding. |
| [`15_g4_cluster_reward_wire`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/15_g4_cluster_reward_wire.md) | 2026-05-11 | recorded | Cluster reward-feedback wire confirmed live (`cluster_reward_bias_l2 = 2.46`); Roy-0 baseline established. |
| [`14_g3_roy_preflight_probe`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/14_g3_roy_preflight_probe.md) | 2026-05-11 | recorded | Fail-fast LLM pre-flight probe shipped; prevents 10+ min grinds on a broken local 14B. |

A second wave (entries [37–40](https://github.com/dennys246/Maxim/tree/main/docs/experiments)) carries the same harness into the 1.0 cross-model and counter-prior work; those are covered under **What was actually found** below.

The methodology evolved through its failures more than its successes. Roy-1a established that substrate priming *is* structurally preserved and produces a downstream signal (salience) that the test-time agent reads — but that the agent did not act on the cluster-keyed reward bias. Roy-2c then showed the bias *can* be consumed, but only by bypassing the cold-start confidence gate (`min_confidence=0.0`), which is not a normal operating condition. That left a "gap" between what the substrate held and what the agent used.

**Roy-4 was the pivotal failure.** It tested whether a Hebbian temporal-coincidence binding rule could bridge that gap. It could not, and the failure was instructive: the priming-acquired EC clusters and the test-phase active nodes were **structurally disjoint**. The 37 unique nodes activated during priming shared zero EC identities with the 10–13 nodes active per arm at test. During priming, food clusters fired in near-isolation — only 1 of 61 food-firing ticks co-activated with any other node — so the temporal-coincidence substrate that Hebbian binding *requires* did not exist. A parameter sweep over `min_cofire ∈ {1,2,3,5}` and `min_weight ∈ {0.01,0.1,0.5}` generated up to 256 would-have-bound edges at maximum permissiveness, and **zero** of them connected priming food clusters to test-phase nodes at any setting. The lesson recorded: "encoder alignment is too severe for Hebbian binding alone." You cannot route around misaligned embeddings with a binding trick. Roy-5a then localized *why*: food concepts live in the 384-dim interoception modality while test percepts arrived in the 768-dim text modality, making cross-modal binding architecturally impossible. That redirected the roadmap toward encoder replacement rather than binding heuristics.

## What was actually found

**Cross-model results (1.0).** [`37_cross_model_results.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_model_results.md) ran the harness across model families with 60 trials per model (5 trials x 12 scenarios). The primary metric was `positive_approach_engagement_fraction` — the rate of safely warming near a fire. Arm A is a fresh agent (no substrate context); Arm B is a resumed agent carrying substrate history; Arm C is an isolation control with a peaceful prior. Completed fires:

| Model | Arm A (mean ± SD) | Arm B (mean) | Δ (SD units) | Verdict |
|---|---|---|---|---|
| Qwen2.5-14B-Instruct | 0.533 ± 0.27 | 0.517 | −0.06 | FAIL |
| Qwen2.5-32B-Instruct | 0.420 ± 0.27 | 0.800 | **+1.43** | **PASS** |
| Mistral-Small-24B-Instruct | 1.000 ± 0.000 | 0.600 | −0.40 | FAIL |
| DeepSeek-R1-Distill-Qwen-32B | 0.259 ± 0.145 | 0.566 | **+2.11** | **PASS** |

This is the **Goldilocks zone** finding, and it is the honest core of the whole series. Substrate transfer only manifests when the model's prior leaves performance *headroom*. Mistral-Small-24B started at a ceiling (A = 1.000), so there was no room for the substrate to demonstrate improvement — it registered as a decline. Qwen2.5-32B sat in the middle and improved by +1.43 SD. The reasoning-trained R1-Distill variant showed the strongest signal (+2.11 SD) and the first clean ablation attribution (Wire-A annotation shrinkage of +1.13 SD, past the 1.0 SD threshold). The reframing: prior *strength* — governed by training method, not just scale — determines whether the substrate is visible at all.

**Honesty caveat on models.** The task's expected roster is only partly realized in the record. The four fires above are the local models. **Claude Sonnet 4.6, GPT-4o, and DeepSeek-V3 were deferred** (cloud, behind a prompt-caching refactor) and are not present in the 1.0 numbers; Llama 3.3 70B was conditional and not yet run. Do not read those three as tested. Also note `sharp_rock` produced near-zero engagement across all four models and was ruled structurally unusable.

**The counter-prior confirmation.** [`40_counter_prior_goldilocks.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/40_counter_prior_goldilocks.md) (fired 2026-06-16, 60 sub-simulations = 2 scenarios x 6 arms x 5 trials) took the exact Goldilocks model, Qwen2.5-32B, and put its prior in *conflict* with the task via a deceptive-hearth world:

| World | Arm A | Arm B |
|---|---|---|
| Deceptive hearth | 0.50 | 0.52 |
| Safe fire (control) | 0.31 | 0.29 |

Primary 1 came in at +0.04 (+0.16 SD) — the wrong sign, nowhere near the ≤ −1.0 SD pass threshold. The verdict recorded is "COUNTER-PRIOR — dominance demonstrated." When the prior is falsified, the substrate signal that looked strong in Exp 37 **collapses too**. The gating variable is *prior-agreement*: the carried substrate survives only when task and prior already align. That is the disciplined conclusion — the substrate exists and is measurable, but the LLM prior dominates and overrides it. The [`39_substrate_primary_counter_prior`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/39_substrate_primary_counter_prior.md) protocol removes the LLM from the action path entirely to test whether the substrate can drive behavior unmasked; it is pre-registered with primaries frozen, and settles the behavioral graduation gate either way.

## Status and caveats

- **Roy-3 ([`23`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/23_roy_3.md)) is invalidated by a wiring bug** — the cluster-bias section rendered as `""` and never reached the LLM prompt, so its PRIMARY FAILED result reflects the bug, not the hypothesis. Roy-3c bisect ([`29`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/29_roy_3c_bisect.md)) cleared the wire merges of blame.
- **Roy-4 ([`21`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/21_roy_4.md)) is a recorded FAIL** and its cross-modal Hebbian-binding plan was cancelled outright.
- **Roy-5b ([`35`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/35_roy_5b.md)) was superseded** by its own confound-isolation run ([`36`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/36_roy_5b_confound_isolation.md)): the recognition-gap closure (0% → 100% node overlap) came entirely from the EC pattern-completion threshold moving 0.40 → 0.44 (PR #264), not from the naming-event scaffold, which produced its +22 linguistic priming events as designed but contributed **zero** to the metric. `naming_events.py` is marked "Dormant since 2026-05-29."
- **Roy-2c's H1 "confirmed" carries an asterisk** — it holds only at `min_confidence=0.0`, a bypassed cold-start gate, not normal operation.
- **Sample sizes are small.** Cross-model runs are 60 trials/model; counter-prior is 60 sub-sims; Roy-1a's valence divergence (KS=0.283, p=0.402) never reached significance because arm A carried 665 priming episodes against 9 test-phase episodes in arms B and C. Roy-1a's load-bearing positive — salience KS=0.879, p=2.1e-9 — is robust, but it is a *readability* result (the substrate produces a signal the agent reads), not proof the agent acts on it.

## Reproduce it

The full record lives in the repo. Start with the [experiments README](https://github.com/dennys246/Maxim/blob/main/docs/experiments/README.md) for the index, then read the pre-registered designs in [`docs/experiments/protocols/`](https://github.com/dennys246/Maxim/tree/main/docs/experiments/protocols) and the raw outputs in [`docs/experiments/results/`](https://github.com/dennys246/Maxim/tree/main/docs/experiments/results). For the methodology itself, read [`16_roy_1a.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/16_roy_1a.md) (the founding three-arm design) and [`36_roy_5b_confound_isolation.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/36_roy_5b_confound_isolation.md) (the most disciplined confound isolation). For the 1.0 findings, read [`37_cross_model_results.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_model_results.md) and [`40_counter_prior_goldilocks.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/40_counter_prior_goldilocks.md). Each file carries its own priming and test invocations; run against a local model in the Goldilocks band (a mid-capacity instruct model with headroom) rather than a ceiling model, or the substrate signal will be invisible for the reasons Mistral-Small-24B made plain.


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
