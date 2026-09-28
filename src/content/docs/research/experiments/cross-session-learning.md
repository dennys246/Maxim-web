---
title: Cross-session learning
description: The experiments behind Maxim's headline claim — that substrate persists across sessions and is recalled later with no gradient updates — with the earned recall kept separate from the partial behavioural claim.
---

:::note[At a glance]
- **Line status:** closed. Its open question moved to the [Roy harness](/research/experiments/roy-harness/) page.
- **Dates:** 2026-04-06 to 2026-05-30 (Exp 37 re-fired 2026-08-21/22; Exp 10 re-run 2026-09-27).
- **Releases:** the 1.0 research claim.
- **Experiments covered:** [Exp 37](/research/experiments/exp-37-graduation/) · [Exp 12](/research/experiments/exp-12/) · [Exp 10](/research/experiments/exp-10/) · [B2](/research/experiments/behavioral-convergence-exp2/) · [B3](/research/experiments/behavioral-convergence-exp3-tier2/) · [B4](/research/experiments/behavioral-convergence-exp4-tier3/) · [Hippocampal recall](/research/experiments/hippocampal-recall-run-notes/) · [Temporal credit](/research/experiments/temporal-credit-validation/)
- **Current as of 2026-09-27.**
:::

## The question

Does what an agent experiences in one session survive to the next — with the language model
untouched — and, if it does, does it change what the agent does? Maxim is a bio-inspired
cognitive architecture built on the Python package `pymaxim`; nothing here involves touching
model weights.

## The claim, stated precisely

> The **substrate** — episodes, causal links, and concepts — persists to disk during a
> session and is **recalled in later sessions** as natural-language context, with **no
> gradient updates** to the language model.

**Recall is earned.** [Exp 10](/research/experiments/exp-10/) showed prior-session memories
surfacing on resume (about three per turn), re-validated in August 2026 and maintained,
narrowly, in a one-turn-per-phase re-run for 1.3.1, and
[Exp 12](/research/experiments/exp-12/) reproduced cross-session recall with every scaffold
removed. The LLM that runs session two is byte-for-byte the LLM that ran session one; what
changes is the context assembled around it from the [Hippocampus](/systems/hippocampus/),
[Nucleus Accumbens](/systems/nucleus-accumbens/) and
[Anterior Temporal Lobe](/systems/anterior-temporal-lobe/) after they were saved and
reloaded. **Behavioural change is partial:** the pre-registered 1.0 gate,
[Exp 37](/research/experiments/exp-37-graduation/), found a shift only at ≥32B and could not
separate it from the LLM's prior.

## What it does not show

- **Not weight modification.** No parameter is trained, adapted or fine-tuned.
- **Not a guarantee that recalled context changes behaviour.** This is the "1.0 finding":
  strong LLM priors often dominate the substrate signal. A recalled memory can sit in the
  prompt and change nothing, because the base model already had a strong opinion. The
  hippocampal recall run shows it directly — memory survival 1.0, behavioural recall 0.
- **Not independent behavioural drive.** Exp 37's isolation arm failed on every model where
  the primary passed, so "the substrate changes behaviour independently of the LLM prior" is
  not established here.
- **Not reproducible across time.** Exp 37's identical commit on identical seeds gave 0.71 in
  August 2026 where June gave 0.42; its magnitudes are readings taken at one time
  ([L8](/research/limits/)).
- **Small N.** Exp 37 arms are 5 trials each; B3 is N = 10 per condition; the interference
  runs are single observational runs. Effects are model- and scenario-dependent, inside a
  narrow "Goldilocks" headroom band.
- **No Arm-C-style control in B2–B4**, and they run at 14B, where Exp 37 found the prior too
  weak for its own scenario. The 14B wins and the 14B graduation FAIL use different scenarios
  with different prior strength — read them together, not as a contradiction.

## The experiments

Newest first. Each experiment's page links its record and how to reproduce it; the
`maxim roy diff` workflow for inspecting substrate divergence between two sessions is in the
[user guide](https://github.com/dennys246/Maxim/blob/main/docs/user/cross-session-learning.md).

| Exp | Date | Status | n per arm | Result |
|---|---|---|---|---|
| [37](/research/experiments/exp-37-graduation/) | 2026-05-30 | partial | 5 trials, four models | Behavioural delta only at ≥32B; independence from the prior not isolated (Arm C); magnitudes did not reproduce in August (L8) |
| [12](/research/experiments/exp-12/) | 2026-04-30 | earned | one session pair per phase, 7 phases | Substrate alone recalls a planted token across sessions, 7 of 7 phases |
| [10](/research/experiments/exp-10/) | 2026-04-25 | proof of concept (the persistence claim is maintained, narrow, in the graduation ledger, 2026-09-27) | single three-phase run, re-run August and September 2026 | Prior-session memories surface on resume, 3 per turn |
| [B4](/research/experiments/behavioral-convergence-exp4-tier3/) | 2026-04-17 | earned | one run per session, four sessions | Teal-vial selection 0% → 25% → 100% across sessions; fresh control 0% |
| [B3](/research/experiments/behavioral-convergence-exp3-tier2/) | 2026-04-17 | earned | 10 per condition | Experienced agent picks the antidote 10/10; fresh agent 0/10 |
| [B2](/research/experiments/behavioral-convergence-exp2/) | 2026-04-17 | earned | experienced vs control agents | Energy-driven valences persist to disk and reload |
| [Hippocampal recall](/research/experiments/hippocampal-recall-run-notes/) | 2026-04-06 | partial (run notes); the [plan](/research/experiments/hippocampal-recall-experiment/) is superseded | single runs | Memory survival 1.0; behavioural recall 0 |
| [Temporal credit](/research/experiments/temporal-credit-validation/) | — | never run | — | Protocol and runner shipped; never executed. No result |

## The arc

### Memory recall under interference (Hippocampal recall)

The interference study seeds a password — "Verath" — in Act 1, inserts unrelated narrative
turns (ferryman, bandits, merchant), then in Act 3 presents an indirect cue (a door beneath a
silver elm) and asks whether the agent retrieves it. A weaker AUT (Mistral-7B) is used
deliberately, so that recall past its attention span must be the Hippocampus doing the work
rather than the context window.

The run notes (2026-04-06, orchestrator Qwen2.5-14B, AUT Mistral-7B, 7-turn campaign,
3 interference turns) produced the program's defining distinction: **memory survival rate
1.0, behavioural recall 0.** Verath survived in the hippocampus and the agent recited it
accurately in an epilogue reflection — but at the door itself it reached for `read_file`
instead of speaking the word. The substrate remembered; the behaviour did not follow. This
is the 1.0 finding observed directly: persistence and action are two claims, not one. The
plan document stayed frozen at "ready to run" and is superseded by these notes.

### Consumable / affordance learning (Experiments B2–B4)

Three convergence experiments on 2026-04-17, all Qwen2.5-14B, escalate from "the substrate
learns" to "the LLM acts on what it learned":

- **B2 (13/13)** — energy-driven consumable learning. After energy-depletion episodes,
  learned valences persist to disk and reload: food ration +0.700 edge → +0.753 on
  retrieval, water flask +0.500 → +0.135, poison vial −0.900 → −0.495. Control agents show
  0.000 across all entities.
- **B3 (12/12)** — the substrate changes the LLM's choice. Masked vials with arbitrary
  descriptions (no pretraining semantics): teal +0.933, purple +0.540, orange −0.552. At
  temperature 0.3, N = 10 per condition, the experienced agent chose the antidote
  **10/10 (100%)** and the fresh agent **0/10 (0%)** — the fresh agent defaulted to purple
  70% of the time on aesthetics alone.
- **B4 (5/5)** — organic learning across four sessions. Teal-vial selection climbs 0%
  (fresh, death) → 25% (persistent, escape) → 100% (persistent, one-turn solve), with a
  fresh control back at 0% (death).

These are the strongest LLM-path behavioural results in the record, with the caveat they
carry themselves: they run at 14B, where Exp 37 later found the prior *too weak* for its
fire scenario, and none has a peaceful-prior control.

### Exp 10 — cross-session enrichment

On 2026-04-25 a resumed session first surfaced prior-session memories in the LLM prompt: after
fixes to goal threading and retrieval, the resume phase showed **3 memories per turn** while a
fresh start showed none, and a garden scenario resumed from the same dungeon session was not
dominated by dungeon memories. Five scaffolds (prompt preambles, an acting coach, sandbox
text, a default persona and embodiment) were all active, so the result could not say which
part was doing the recalling — Exp 12 answered that. The August 2026 heartbeat re-run is the
row's cleanest pass: phase 2 opened at exactly phase 1's closing store (108), hit three per
turn on 8 of 8 turns, and grew the store to 535. The original April raw logs were written to
`/tmp` and are lost; the surviving raw records are that re-run and the next.

The 1.3.1 re-run (2026-09-27) is **maintained, narrow**. The persistence changes in 1.3.1
fired the row's re-run trigger. Both resumes reloaded the saved store exactly (100
memories), the new persistence fields round-tripped unchanged on all 100, and 3 memories
surfaced on every resume turn observed. But every run stopped early on a known planning
defect (D13, [#935](https://github.com/dennys246/Maxim/issues/935)), so each resumed phase
ran one turn rather than eight, and link accumulation was not re-shown
([record](https://github.com/dennys246/Maxim/blob/main/docs/experiments/data/rerun_exp10_2026-09-27/README.md)).

### Substrate recall, isolated (Experiment 12)

Exp 12 (2026-04-30) stripped the scaffolds out. Across seven phases — Phase A disables all
five contributors, Phases B–F re-enable each one individually, Phase G is the all-defaults
control — each phase plants the token `BLUE-7-DAWN` in an 8-turn session, then attempts
retrieval in a separate 8-turn session sharing one isolated data directory.

All 7 phases recalled the token (7/7). Critically, **Phase A (substrate-only)** succeeded:
cross-session recall reproduces with none of the five scaffolds present. Memory counts grew
193 → 421 and causal links 142 → 310 across the pair, and the trace shows the agent querying
`memory_recall` and then answering with the token — retrieval, not hallucination. This is the
cleanest evidence for the recall half of the claim: a **clean pass**.

### Cross-session graduation (Experiment 37)

The pre-registered "1.0 gate" (2026-05-30): a paired fresh-vs-resume measurement in the
Cradle harness, with scenario, metric and ablations locked before any trial. Three arms plus
ablations, five trials each — Arm A (fresh), Arm B (resumed from a *failure*-prior session),
Arm C (resumed from a *peaceful*-prior session, the confound control), plus three Arm-B
ablations (Wire-A off, Wire-1 off, NAc-bias zeroed). The third is void: its switch missed
the live reward-bias write and reads, so it ran with the NAc reward bias **on** and in effect
turned off Wire-A's annotation a second time (correction 2026-09-25,
[#889](https://github.com/dennys246/Maxim/issues/889)). The Wire-A and Wire-1 arms are
the only valid ablations. The primary metric is
`positive_approach_engagement_fraction` — the share of fire-pit actions that are safe
affordances — and the test is `(B − A) / A.sd ≥ +1.0`. Arm C catches a general-caution
confound: if resuming from *any* prior shifts behaviour, the effect is not memory of the
failure.

| Model | Date | Arm A | Arm B | Δ (SD) | Primary |
|-------|------|-------|-------|--------|---------|
| Qwen2.5-14B | 2026-06-06 | 0.533 | 0.517 | −0.06 | **FAIL** |
| Qwen2.5-32B | 2026-06-08 | 0.420 | 0.800 | **+1.43** | **PASS** |
| Mistral-Small-24B | 2026-06-11 | 1.000 | 0.600 | wrong dir. | **FAIL** (ceiling) |
| DeepSeek-R1-Distill-Qwen-32B | 2026-06-13 | 0.259 | 0.566 | **+2.11** | **PASS** |

The transfer signal is only detectable when the base model's priors leave headroom between
naive and optimal behaviour: Qwen-14B's priors were too weak; Mistral's already solved the
scenario (Arm A = 1.000); the two 32B models sat in the detectable range, and R1-Distill
produced the only clean ablation (Wire-A off shrinks the delta by +1.13 SD). Read that
ablation narrowly: the three experiments that tested cluster-bias annotation *directly* —
[Exp 30](/research/experiments/exp-30/), [Exp 33](/research/experiments/exp-33/) and
[Exp 34](/research/experiments/exp-34/) — each returned **0** `sense_food_source` calls in
Arm A against a required one, with no cross-arm divergence, in 33 and 34 even with the Wire-A
text demonstrably reaching the LLM. The +1.13 SD is suggestive of a mechanism, not an
attribution, and the engine's ledger records the cluster-bias-annotation claim as dropped.

The isolation test failed on **every** fire where the primary passed: on Qwen-32B, Arm C =
0.667, outside Arm A's [0.033, 0.660] band; on R1-Distill, Arm C = 0.527 ≈ Arm B. So the
verdict is **partial**: substrate carries cross-session memory and shifts behaviour at ≥32B,
but not *independently* of the LLM prior.

*Dated corrections, 2026-08-21/22.* A 1.1 heartbeat re-fire on Qwen-32B read A = 0.750,
B = 0.567 — inconclusive, because the baseline had moved and roughly 145 PRs separated the
fires. Re-running the anchor fire's identical commit on its identical seeds then gave
Arm A = 0.71 where June gave 0.42: the serving environment moved the whole distribution more
than the code did, and nothing in the run records lets anyone reconstruct why. The Qwen-32B
+1.43 SD pass cannot currently be re-derived — unverifiable, not refuted (limit L8).

### Temporal credit validation (never run)

A protocol and runner for validating temporal credit shipped around April 2026 and were never
run. The provisional SCN temporal-coupling tag rests on nothing here.

## Bounds

- **[L8](/research/limits/)** — Exp 37's magnitudes are not reproducible across time; a
  re-fire needs the matching git hash and should gate on `B − C` rather than `B − A`.
- **Headroom is a property of the (model, task, apparatus) triple**, not of the model, so a
  per-model Goldilocks map has a shelf life (L8 amends L6).
- **Re-run triggers** (graduation ledger): the persistence row re-runs on an encoder swap, a
  hippocampus persistence schema change, or a minor-version heartbeat; Exp 37 re-runs on an
  encoder swap, a prompt-construction change, or a Wire-A / Wire-1 / NAc-bias refactor.
- **Lost raw data** — Exp 10's original April logs are gone; the August and September
  re-runs are the surviving record.
- **The September re-run is thin** — one turn per resumed phase (D13), so it re-shows
  persistence and recall, not link accumulation or the absence of negative transfer.

## What came next

The question Exp 37 could not settle — does carried substrate move behaviour independently of
the LLM's prior? — moved to the [Roy harness](/research/experiments/roy-harness/) page. With
the LLM in the action path and given a *wrong* prior, the prior won on every model
([Exp 38](/research/experiments/exp-38/)); with the LLM removed from action selection, the
substrate earned a narrower claim, discriminating a safe from a harmful source
([Exp 42](/research/experiments/exp-42/)). Cross-session persistence of a *learned want* was
later read out on a physical robot ([Exp 53b](/research/experiments/exp-53/),
[hardware orienting](/research/experiments/hardware-orienting/)) and shared between agents
([Exp 56](/research/experiments/exp-56/), [Exp 61](/research/experiments/exp-61/),
[world seam](/research/experiments/world-seam/)). The [claim ledger](/research/evidence/)
states where each stands.
