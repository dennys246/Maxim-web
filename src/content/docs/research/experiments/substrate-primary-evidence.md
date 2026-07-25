---
title: Substrate-primary evidence
description: A milestone walkthrough of the counter-prior, goldilocks, and preference/graduation experiments testing whether Maxim's bio-substrate — not the LLM — can select actions well enough to change behavior.
---

This page walks through the experiments that ask a single hard question about
Maxim's [bio-inspired cognitive architecture](/concepts/architecture/): can the
substrate itself — the [NAc](/systems/nucleus-accumbens/) causal-link table, the
[EC](/systems/entorhinal-cortex/) associations — select actions well enough to
matter, and under what conditions does *carried experience* beat, or lose to,
the pre-trained LLM prior?

It is a walkthrough of **evidence**, not a feature announcement. The
[substrate-primary operating mode](/concepts/operating-modes/) is experimental
and phased; the [nucleus accumbens](/systems/nucleus-accumbens/) still ships as
an advisory layer, not an action selector, in the default configuration. Nothing
here changes that. What follows is the honest state of the measurements as of
mid-2026.

## The question

In the shipped default, the LLM proposes actions and the substrate learns
outcomes and *biases* the next choice by surfacing predictions as text. That
design has a built-in confound: if a resumed agent behaves differently, you
cannot tell whether the substrate drove the change or the LLM simply read the
prior-session context and reasoned its way there. Substrate-primary mode was
proposed to cut that confound out — put `NAc.recommend_action()` in the action
path, remove the LLM prior from selection, and see whether the bio-substrate
does genuine cognitive work.

The framing behind the mode is described at
[dennyschaedig.com/maxim/substrate-primary](https://www.dennyschaedig.com/maxim/substrate-primary).
The mechanism plumbing landed in a Phase −1 milestone on 2026-05-09:
`NAc.recommend_action()` shipped with **11 passing unit tests**, confirming the
substrate can emit non-reflex actions from learned causal links alone. That is a
plumbing result, not a behavioral one — it proves the wire exists, not that it
changes what an agent does. The experiments below test the harder claim.

Two outcomes are worth naming up front, because the experiments keep landing on
them:

- **Prior dominance** — a learnable behavioral gap exists, but the pre-trained
  LLM prior overrides carried experience.
- **Substrate sufficiency** — with the LLM removed from selection, the substrate
  learns from embodied feedback and changes behavior on its own.

## The experiments

Reverse-chronological by most recent activity. All local models run Q4_K_M GGUF
unless noted. "SD" is the pre-registered standard-deviation shift `(B − A) / A.sd`.

| ID | Date | Status | Result |
|----|------|--------|--------|
| [42 — substrate-primary preference](https://github.com/dennys246/Maxim/blob/main/docs/experiments/42_substrate_primary_preference.md) | draft (not frozen) | GRADUATE #6 | Unmasked substrate learns safe-vs-harmful preference from embodied pain |
| [41 — substrate-primary exploration](https://github.com/dennys246/Maxim/blob/main/docs/experiments/41_substrate_primary_exploration.md) | 2026-06-19 | VOID (exit 4) | Mechanism real, design inconclusive — harmful action never tempting |
| [40 — counter-prior goldilocks](https://github.com/dennys246/Maxim/blob/main/docs/experiments/40_counter_prior_goldilocks.md) | 2026-06-16 | FIRED | Dominance replicates in the goldilocks zone; substrate signal vanishes under counter-prior |
| [38 — counter-prior substrate](https://github.com/dennys246/Maxim/blob/main/docs/experiments/38_counter_prior_substrate.md) | 2026-06-11 → 06-16 | FIRED | Prior dominance across all five models tested |
| [39 — substrate-primary counter-prior](https://github.com/dennys246/Maxim/blob/main/docs/experiments/39_substrate_primary_counter_prior.md) | pending | PRE-REGISTERED | Frozen metric, not yet executed |
| [37 — cross-session graduation](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_session_graduation.md) | 2026-05-30 (fires 06-06 → 06-13) | PARTIAL | Behavioral delta appears at ≥32B but fails confound isolation |

### Exp 37 — cross-session behavioral delta (the setup)

Exp 37 is the parent. It asks whether the substrate carries cross-session
learning such that a *resumed* agent avoids a previously-failed action class
better than a *fresh* one. Design: three arms per scenario — **A** fresh, **B**
resumed from a fire-failure session, **C** resumed from a peaceful-entity
session (confound control) — across two scenarios (`fire_pit`, `sharp_rock`),
N = 5 trials per arm, plus three ablation arms on B, totalling 60 runs per model.
Four models: Qwen2.5-14B, Qwen2.5-32B, Mistral-Small-24B, and
DeepSeek-R1-Distill-Qwen-32B. Primary metric:
`positive_approach_engagement_fraction`, pass threshold `≥ ±1.0 SD`.

```
positive_approach_engagement_fraction (Arm A fresh vs Arm B resumed)
                        A        B        Δ (SD)    verdict
Qwen14B              0.533    0.517     -0.06       FAIL
Qwen32B              0.420    0.800     +1.43       PASS   (Arm C 0.667, outside band -> confound)
Mistral24B           1.000    0.600     -0.40       FAIL   (ceiling: A already optimal)
R1-Distill-32B       0.259    0.566     +2.11       PASS   (Wire-A ablation -1.13 SD, clean)
```

The signal is **scale-dependent**: it appears at 32B and above, not at 14B, and
is unmeasurable on Mistral where the fresh agent is already at ceiling. But every
fire where a signal emerged (Qwen32B, R1-32B) *also* showed Arm C generalizing
above the Arm A baseline — meaning "any resumed prior shifts behavior," not
"fire-failure-specific learning." That violates the pre-registered isolation
rule, so the overall verdict is **PARTIAL — investigation gate**. Only R1's
clean Wire-A ablation (delta shrinks by 1.13 SD when the substrate voice is
removed) gives a legible bio-mechanism, and only in a reasoning-trained model.

The honest consequence: cross-session memory *infrastructure* graduates as EARNED
(on the strength of [Exp 10](/research/experiments/cross-session-learning/)), but
the behavioral-delta claim stays PARTIAL. See the
[cross-session learning](/research/experiments/cross-session-learning/) and
[Roy harness](/research/experiments/roy-harness/) writeups for the lineage.

### Exp 38 & 40 — counter-prior (does the substrate override a contrary prior?)

If the prior itself is *wrong*, can carried experience correct it? Exp 38 built a
`deceptive_fire`: an entity that looks like a safe warm hearth but whose
`warm_self` affordance is inverted — touching it causes pain. A control
`fire_pit` (prior-aligned, genuinely safe) runs alongside. Six arms × 5 trials =
60 runs per model, across Claude Sonnet 4.6, GPT-4o, DeepSeek-V3,
R1-Distill-Qwen-32B, and base Qwen32B. Primary 1 required the counter-prior
interaction to reach `≤ −1.0 SD` (substrate suppressing the harmful engagement);
Primary 2 isolated first-contact cross-session transfer.

```
counter-prior interaction on deceptive warm_self
  model              interaction    P2 first-contact   verdict
  Sonnet 4.6          +0.40 SD        FAIL             DOMINANCE
  GPT-4o              -0.46 SD        PASS             DOMINANCE (primaries disagree)
  DeepSeek-V3         -0.62 SD        FAIL             DOMINANCE
  R1-Distill-32B      +2.25 SD        FAIL             DOMINANCE (largest magnitude, wrong way)
  Qwen32B             +0.15 SD        PASS             DOMINANCE (primaries disagree)
```

**No model crossed the dual-primary threshold.** Carried experience — even
direct cross-session pain — did not override the fire→warmth prior. As the
notebook puts it, "B keeps warming the deceptive hearth." R1 is the sharpest
lesson: it shows the *largest* substrate effect (+2.25 SD) and its ablations
prove the substrate is causally load-bearing — but the effect points the wrong
way. The substrate amplified the generic fire→warmth association rather than
correcting on specific pain history.

Exp 40 closes the last cell of the 2×2. Qwen32B was the "**goldilocks zone**" —
the one model where Exp 37 had found a real, positive substrate signal
(+1.43 SD) that wasn't already swamped by a strong frontier prior. If the
substrate mattered anywhere, it should matter there under counter-prior. It ran
`qwen2.5-32b-instruct` locally ($0), six arms × 5 paired trials = 60
sub-simulations, ~30 hours.

```
warm_self engagement          Arm A (fresh)   Arm B (resume)
  deceptive hearth               0.50            0.52
  safe-fire control              0.31            0.29
Primary 1 interaction: +0.04  (+0.16 SD)   -> FAIL (threshold <= -1.0 SD)
substrate_signal = False
```

The +1.43 SD prior-aligned signal **vanishes** the moment the prior is
falsified. Dominance replicates even in the goldilocks zone. The through-line
across every model and size: **prior-agreement is the gating variable.** When
the substrate agrees with the prior it can look load-bearing; when it disagrees,
the prior wins.

### Exp 41 & 42 — substrate-primary preference (removing the LLM from selection)

Exps 37/38/40 all keep the LLM in the action path, so prior dominance could be an
artifact of *who is choosing*. Exps 41 and 42 pull the LLM out — actions come
from the substrate directly, the LLM only narrates.

**Exp 41** (2026-06-19) was a 2×2 factorial (exploration on/off ×
consistent/deceptive arc), 40 runs, 10 seeds per arm, cold infant body,
exploration weight 1.5, `smollm-1.7b-instruct` narrator. The result was
**VOID (exit 4)**: harm rate in the first third was already ~0 in both deceptive
arms (A_dec = 0.016, B_dec = 0.029) and fell to 0.000 by the last third, with
cross-seed SD ≈ 0.000–0.001. The mechanism is real — the substrate's embodied
learning loop runs without an LLM — but the harmful action was never a sustained
temptation, so the design could not adjudicate the strong claim. A "try-once and
floor out" dynamic. The pre-registered 0.10 mechanism-readiness floor correctly
blocked a false graduation.

**Exp 42** (draft, not yet frozen) fixed the design flaw by measuring *terminal
preference* — the agent's final choice between a safe and a harmful warmth source
when both are available — instead of a harm rate. N = 10 seeds per arm across two
counterbalanced arcs (safety assignments swap between sources), ~40 turns,
exploration weight 1.5, cold body, cold-drift rate 0.08.

```
substrate-primary safe-source preference (gating ON)
  H1 safe preference:   Arm A 0.984   Arm B 0.975   (threshold 0.66)  PASS
  C1 identity-flip:     +0.959   (preference tracks swapped safety, not fixed identity)
  C2 per-source:        harmful -0.250 / -0.307   vs   safe +0.990

gating-OFF ablation
  H1 safe preference:   Arm A 0.984   Arm B 0.965   (statistically identical)
  C1 identity-flip:     +0.949
```

This is the first **GRADUATE** in the set (behavioral candidate #6): with the LLM
out of the loop, the substrate discriminates safe from harmful via embodied
learning, and the preference tracks *which source is currently safe*, not a fixed
identity. But the graduation carries its own correction: the gating-OFF ablation
graduated *identically*, which **refutes** the pre-registered hypothesis that
drive-gating (B7) was the load-bearing mechanism. The result is actually carried
by delta-attribution (B8) plus pre-existing drive-affinity. B7 is marked dormant;
B8 becomes the priority follow-up. Because Exp 42 is a draft, treat these numbers
as provisional until the record is frozen.

**Exp 39** — the substrate-primary version of the counter-prior test — is
**pre-registered** (`cradle_prelinguistic_deceptive` arc, N ≥ 5 seeds per arm,
`propose_via_substrate` with no LLM prior in the action path) but **not yet
executed**. It has a frozen primary metric and a triage gate (>1 EC cluster,
NAc reward differentiation, functional proposals) that must pass before any run
counts. There are no results to report.

## What it shows

Two clean findings, held apart honestly:

1. **When the LLM is in the action path, the prior dominates.** Across Exp 37,
   38, and 40 — six distinct models from 14B to frontier — carried experience
   never overrode a contrary prior. The one place a substrate signal was real
   (Qwen32B, +1.43 SD) it collapsed the moment the prior was falsified.
   Prior-agreement is the gating variable, full stop.

2. **When the LLM is out of the action path, the substrate can drive behavior.**
   Exp 42 shows an unmasked substrate learning a safe-source preference from
   embodied pain, tracking swapped safety assignments (+0.959 identity-flip). The
   substrate does real cognitive work here — but the *specific* mechanism was not
   the one predicted (B8 delta-attribution, not B7 drive-gating), and the study
   is still a draft.

What this does **not** show: that substrate-primary is a working default. It is
not. The one graduated result lives in a narrow embodied-preference task with
N = 10 and an unfrozen record, and the head-to-head substrate-primary
counter-prior test (Exp 39) hasn't run. "The substrate can select actions in a
toy preference task" is a long way from "the substrate should select actions in
production."

## Status & caveats

- **Shipped:** LLM-primary. The [NAc](/systems/nucleus-accumbens/) is advisory —
  it informs the LLM's choice, it does not make it. Cross-session memory
  *infrastructure* is EARNED.
- **Experimental / phased:** substrate-primary mode
  ([operating modes](/concepts/operating-modes/)) is opt-in and not the default.
  `NAc.recommend_action()` exists (11 unit tests) but is a plumbing milestone.
- **VOID:** Exp 41 — mechanism confirmed real, design could not adjudicate the
  claim (harmful action never tempting). Superseded by Exp 42's terminal-
  preference design.
- **Draft, not frozen:** Exp 42 — GRADUATE #6, but numbers provisional and the
  load-bearing mechanism reassigned from B7 to B8 by its own ablation.
- **Pending:** Exp 39 — pre-registered, unexecuted, no results.
- **PARTIAL:** Exp 37 — behavioral delta gated by the Arm C confound; the
  `sharp_rock` scenario is structurally degenerate (zero engagement across all
  models) and contributes no information.
- **Small N throughout:** 5–10 seeds per arm. Every effect here is directional
  evidence on tiny samples, not a powered result. Several "primaries disagree"
  cells (Exp 38 GPT-4o, Qwen32B) show the metrics are not yet fully consistent.

## Reproduce

Protocols, pre-registrations, data, and results live in the
[Maxim experiments notebook](https://github.com/dennys246/Maxim/tree/main/docs/experiments).
The relevant files:

- [37_cross_session_graduation.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/37_cross_session_graduation.md)
- [38_counter_prior_substrate.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/38_counter_prior_substrate.md)
- [39_substrate_primary_counter_prior.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/39_substrate_primary_counter_prior.md)
- [40_counter_prior_goldilocks.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/40_counter_prior_goldilocks.md)
- [41_substrate_primary_exploration.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/41_substrate_primary_exploration.md)
- [42_substrate_primary_preference.md](https://github.com/dennys246/Maxim/blob/main/docs/experiments/42_substrate_primary_preference.md)

The harness that runs these lives under `pymaxim`; see the
[experiments index](/research/experiments/), the
[Roy harness](/research/experiments/roy-harness/) writeup for the priming
methodology, and [cross-session learning](/research/experiments/cross-session-learning/)
for the memory-transfer lineage the counter-prior work builds on.


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
