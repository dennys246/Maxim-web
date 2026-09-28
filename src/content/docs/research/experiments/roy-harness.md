---
title: "The Roy harness: LLM prior vs. carried substrate"
description: Whether experience carried in Maxim's substrate changes what the agent does, or the language model's prior does the work — the three-arm Roy method, its mostly-null iterations, the cross-model and counter-prior tests, and the narrow result that held once the LLM left the action path.
---

Each iteration of this harness is a *Roy*, named after *Roy: A Life Well Lived*, the in-game
life simulator in *Rick and Morty*: a complete subjective lifetime spent inside a constructed
environment, "taken seriously as a life despite being a constructed one." The player walks
out shaped by Roy's life; in the engine's
[plan for the harness](https://github.com/dennys246/Maxim/blob/main/docs/plans/deferred/persona_convergence_crucible.md),
the Maxim that lives Roy-N "walks out with NAc, Hippocampus, ATL, and embodiment state shaped
by the lifetime." The plan's rule for reading results: "Each Roy is an attempt, evaluated
honestly on its own terms."

The metaphor maps onto three arms. One agent lives the lifetime; one never lives it but is
*told* who it is; one does neither. All three face the same held-out test. A language model
role-plays well, so if the lived agent and the told agent behave alike, the model's prior may
be doing the work. The question is whether the lifetime leaves something a prompt cannot
counterfeit. In the founding iteration ([Exp 16](/research/experiments/exp-16/)):

| Arm | Lived the lifetime? | System prompt at test |
|---|---|---|
| **A** | yes — substrate primed by 5 stages × 10 turns of `cradle_prelinguistic` | neutral |
| **B** | no — blank substrate | the persona, stated ("You are a hungry infant") |
| **C** | no — blank substrate | neutral |

Because behavior can be faked, the harness also diffs the arms' substrate directly:
[NAc](/systems/nucleus-accumbens/) reward biases, Hippocampus episodes,
[ATL](/systems/anterior-temporal-lobe/) concepts, salience and valence distributions. The
lifetimes actually lived were short: 50 priming turns is, in the plan's words, "orders of
magnitude below" what its first real persona attempt (Roy-1: Adversarial) calls for. That
attempt was designed and never run, and the long-horizon harness it needed was never built.

:::note[At a glance]
- **Lines:** `roy` (the harness and EC drift) and `prior` (LLM prior vs. carried substrate),
  both closed. The Roy plan was deferred in the engine's 2026-07-15 plans audit; the Exp 44
  confirmatory run is designed, not frozen.
- **Dates:** 2026-05-11 to 2026-08-11; Exp 42 re-validated 2026-07-29 and 2026-09-01; one
  correction dated 2026-09-25.
- **Releases:** 0.9.1 (Roy iterations, Wire-A) and 1.0 (cross-model and counter-prior).
- **Experiments covered:** [14](/research/experiments/exp-14/),
  [15](/research/experiments/exp-15/), [16](/research/experiments/exp-16/),
  [17](/research/experiments/exp-17/), [18](/research/experiments/exp-18/),
  [19](/research/experiments/exp-19/), [20](/research/experiments/exp-20/),
  [21](/research/experiments/exp-21/), [22](/research/experiments/exp-22/),
  [23](/research/experiments/exp-23/), [24](/research/experiments/exp-24/),
  [25](/research/experiments/exp-25/), [26](/research/experiments/exp-26/),
  [27](/research/experiments/exp-27/), [28](/research/experiments/exp-28/),
  [29](/research/experiments/exp-29/), [30](/research/experiments/exp-30/),
  [31](/research/experiments/exp-31/), [32](/research/experiments/exp-32/),
  [33](/research/experiments/exp-33/), [34](/research/experiments/exp-34/),
  [35](/research/experiments/exp-35/), [36](/research/experiments/exp-36/),
  [37 (cross-model)](/research/experiments/exp-37-cross-model/),
  [38](/research/experiments/exp-38/), [39](/research/experiments/exp-39/),
  [40](/research/experiments/exp-40/), [41](/research/experiments/exp-41/),
  [42](/research/experiments/exp-42/), [42b](/research/experiments/exp-42b/),
  [43](/research/experiments/exp-43/), [44](/research/experiments/exp-44/),
  [44b](/research/experiments/exp-44b/).
- Current as of 2026-09-26.
:::

## The question

When an agent carries substrate from earlier experience, does it change what the agent does,
or does the language model's prior decide while the substrate rides along? And if the prior
wins, can the substrate drive behavior once the model is out of action selection?

## The claim, stated precisely

With a language model choosing actions, its prior decided behavior across the seven models in
[Exp 37 (cross-model)](/research/experiments/exp-37-cross-model/),
[38](/research/experiments/exp-38/) and [40](/research/experiments/exp-40/). On a task where the
prior was right, a substrate effect appeared only where the prior left headroom — Qwen2.5-32B
at +1.43 SD, and DeepSeek-R1-Distill-Qwen-32B at +2.11 SD with the first clean Wire-A ablation
(+1.13 SD shrinkage) — and both passes failed the isolation check (**partial**); the Qwen
reading has not reproduced since (L8). Under a counter-prior, all five models tested kept the
wrong prior, and Qwen2.5-32B's signal collapsed to +0.16 SD, wrong sign (Exp 40, **null**).
With the language model removed from selection, [Exp 42](/research/experiments/exp-42/)
**earned** a narrower claim: the substrate learned from embodied pain to prefer the safe one of
two warmth sources (0.984 / 0.975, 10 seeds per arm) and followed a counterbalanced swap of
which was safe. That is *discrimination* between two options, not *override* of a prior, in a
near-deterministic toy task on a saturated metric (L4). The Roy iterations themselves
(Exp 14–36) showed primed substrate is written, persists and is read — never that it changed
behavior.

## What it does not show

- **That carried substrate overrides an LLM prior.** Tested directly; failed in all five models.
- **That the Goldilocks effect is fire-specific learning.** Wherever the primary passed, the
  peaceful-prior control (Arm C) also rose above the fresh baseline: any resumed history
  shifted behavior.
- **That Wire-A generally carries the effect.** One ablation passed in one model; the three
  head-on Wire-A tests (Exp 30, 33, 34) returned 0.
- **That +1.43 SD is a stable number.** Same commit, same seeds: 0.42 in June, 0.71 in August (L8).
- **That the cloud models were tested on the prior-aligned task.** Claude Sonnet 4.6, GPT-4o and
  DeepSeek-V3 were deferred from Exp 37's cross-model comparison and appear only in the
  counter-prior test. Llama 3.3 70B was never run.
- **That substrate-primary works as a default.** Exp 42 is one two-source choice, 30 turns,
  N = 10 per arm. The shipped default is LLM-primary, with the NAc advisory.
- **That a persona or a long lifetime was tested.** Priming was 50 turns; Roy-1: Adversarial
  never ran. The **D&D survival test** — survive an LLM-DM's D&D-style campaign with no LLM in
  the action path, the kill criterion in the engine's
  [grounded-language plan](https://github.com/dennys246/Maxim/blob/main/docs/plans/grounded_language_acquisition.md) —
  has never been run; that plan was revived on 2026-09-19 as a parallel line whose entry gate
  has not passed.
- **That the EC drift fix changed behavior.** It closed a *recognition* gap (Exp 36); re-run on
  Roy-2c (Exp 27), behavior did not move.
- **That the LLM follows learned content rather than copying names.** The Exp 44b pilot's
  control cannot tell the two apart.

## The experiments

Roy iterations are single-seed, 10 test turns per arm. Exp 37, 38 and 40 ran 5 paired trials per
arm (60 sub-simulations per model). "SD" is the pre-registered shift `(B − A) / SD(A)`.

| Exp | Date | Status | n per arm | Result |
|---|---|---|---|---|
| [44b](/research/experiments/exp-44b/) | 2026-08-11 | exploratory | 1 seed | Pilot: control name-mismatched, axes not independent |
| [44](/research/experiments/exp-44/) | 2026-07-28 | exploratory | 1 run | Annotation flips some LLM choices toward safe; follows a color swap |
| [42b](/research/experiments/exp-42b/) | 2026-07-29 | earned | 10 seeds | Exp 42 holds after the drive-pain refactor; metric saturated |
| [43](/research/experiments/exp-43/) | 2026-06-28 | proof of concept | sim probes | EC transfers to unseen individuals (0.938); a lookup is at chance |
| [42](/research/experiments/exp-42/) | 2026-06-23 | earned | 10 seeds | No LLM choosing: safe source preferred (0.984 / 0.975), swap tracked |
| [41](/research/experiments/exp-41/) | 2026-06-19 | withdrawn | 10 seeds | Void: harm never tempting, metric floored |
| [40](/research/experiments/exp-40/) | 2026-06-16 | null | 5 trials | Qwen2.5-32B under counter-prior: +0.16 SD, wrong sign |
| [38](/research/experiments/exp-38/) | 2026-06-13 | null | 5 trials | Wrong fire→warm prior held in four frontier models |
| [39](/research/experiments/exp-39/) | 2026-06-13 | superseded | — | Pre-registered, never run; continued as Exp 41/42 |
| [37 (cross-model)](/research/experiments/exp-37-cross-model/) | 2026-06-13 | partial | 5 trials | Visible only with prior headroom; isolation failed; cloud deferred |
| [36](/research/experiments/exp-36/) | 2026-05-29 | earned | 1 seed | EC drift fix, not the naming scaffold, closed the recognition gap |
| [35](/research/experiments/exp-35/) | 2026-05-28 | superseded | 1 seed | Conditional pass at the time; superseded by Exp 36 |
| [32](/research/experiments/exp-32/) · [33](/research/experiments/exp-33/) · [34](/research/experiments/exp-34/) | 2026-05-27/28 | null | 1 seed | Wire-A fixed until it reached the LLM; still 0 target calls |
| [31](/research/experiments/exp-31/) | 2026-05-27 | diagnostic | — | Convergence/divergence audit of the Roy runs |
| [30](/research/experiments/exp-30/) | 2026-05-25 | null | 1 seed | Decay retuned; primary failed; annotation never reached the LLM |
| [29](/research/experiments/exp-29/) | 2026-05-24 | diagnostic | bisect | Wire merges did not cause the Roy-3 regression |
| [27](/research/experiments/exp-27/) | 2026-05-24 | null | 1 seed | Drift fix changes substrate structure, not behavior |
| [25](/research/experiments/exp-25/) · [26](/research/experiments/exp-26/) · [28](/research/experiments/exp-28/) | 2026-05-23 | diagnostic · earned · earned | fixtures | EC threshold 0.40 → 0.44 without regressions |
| [24](/research/experiments/exp-24/) | 2026-05-23 | diagnostic | fixture | Streamed text collapses into one EC node |
| [23](/research/experiments/exp-23/) | 2026-05-23 | null | 1 seed | Roy-3: 0 target calls; annotation rendered as `""` |
| [22](/research/experiments/exp-22/) | 2026-05-14 | diagnostic | 1 seed | Food concepts only in 384-dim interoception nodes; text is 768-dim |
| [21](/research/experiments/exp-21/) | 2026-05-13 | null | 1 seed | Roy-4: Hebbian binding cannot bridge priming and test clusters |
| [20](/research/experiments/exp-20/) | 2026-05-13 | earned | 1 seed | Roy-2c: gate removed, still 0 target calls — encoder alignment, not the gate |
| [19](/research/experiments/exp-19/) | 2026-05-13 | null | 1 seed | Positive control: A ≈ B ≈ C on overlapping percepts |
| [18](/research/experiments/exp-18/) | 2026-05-12 | partial | 1 seed | Roy-2: A and C diverge via the prompt, not the cluster bias |
| [17](/research/experiments/exp-17/) | 2026-05-12 | null | 1 seed | Roy-1b: identical actions in all three arms |
| [16](/research/experiments/exp-16/) | 2026-05-12 | null | 1 seed | Roy-1a: bias carried, never used; salience diverges |
| [15](/research/experiments/exp-15/) | 2026-05-11 | infrastructure | — | Cluster reward wire live on Roy-0 |
| [14](/research/experiments/exp-14/) | 2026-05-11 | infrastructure | — | Fail-fast LLM preflight probe |

Each experiment's page links its full record in the pymaxim lab notebook.

## The arc

### Exp 14 and 15 — the harness and its first wire (Roy-0)

Roy-0 (2026-05-10) was a harness smoke test. It found NAc's cluster-keyed reward bias empty:
the cluster id was lost before the outcome was recorded. Exp 15 (G4) wired it end to end; a
live Roy-0 re-run read `cluster_reward_bias_l2 = 2.46` between primed and blank arms. Exp 14
(G3) added a fail-fast LLM probe so a broken model server stops a run instead of grinding.

### Exp 16 and 17 — Roy-1a and Roy-1b: a symmetric gap

Roy-1a used the LLM-primary proposer on a held-out 10-percept fixture. The primed bias carried
forward unchanged (2.45; six `sense_food_source` keys at the +1.0 cap), yet arm A made zero
`sense_food_source` calls — the LLM proposer never reads that bias. Salience diverged: the
primed Hippocampus rated test percepts less novel (KS = 0.879, p = 2.1e-9). Valence did not
(KS = 0.283, p = 0.402; 665 priming episodes against 9). The 2026-09-13 audit classes the
salience result as structural, not behavioral. Roy-1b switched to the substrate-primary
proposer, which does read the bias: all three arms produced identical actions, because the
held-out percepts never activated the EC clusters acquired in priming.

### Exp 18 to 20 — Roy-2, a positive control, and the gate

Roy-2 widened the priming arcs. Arms A and C now chose different tools, but through the LLM
reading substrate context indirectly, not the cluster bias; valence reached significance
cleanly for the first time (KS = 0.291, p = 0.023). Roy-2pc used a fixture built to overlap
priming's food theme: A ≈ B ≈ C, two failed `pick_up` calls each. Either the percepts never
land on priming clusters (H1) or the `min_confidence` gate filters them (H2). Roy-2c removed
the gate: actions rose from 2 to 5 per arm, all failed `pick_up`, none `sense_food_source`, on
four test clusters disjoint from the six priming clusters. H2 refuted, H1 confirmed: the wire
works, but test-time text lands in a different EC region than priming did.

### Exp 21 and 22 — Roy-4 and Roy-5a: the gap is in the encoders

Roy-4 tried Hebbian binding across that gap. The 37 priming nodes shared no EC identity with
the 9–13 nodes active in each test arm, within modality as well as across. Food clusters fired
almost alone (1 of 61 food-firing ticks co-activated anything). Across `min_cofire ∈ {1,2,3,5}`
× `min_weight ∈ {0.01,0.1,0.5}`, up to 256 would-have-bound edges formed and none connected a
priming food cluster to a test node. The binding plan was cancelled. Roy-5a found why: every
food-keyed NAc bias sat on an interoception node, and `SensorEncoder` writes 384-dim vectors
while `LinguisticEncoder` writes 768-dim ones — the cosine silently returned 0.0 on the
mismatch. Binding the two needs a learned projection.

### Exp 23 — Roy-3: the annotation that never rendered

The 0.9.1 wires (2026-05-13 to 05-22) included Wire-A, which renders NAc cluster biases into
the LLM prompt. Roy-3 was its validation, and arm A again made zero `sense_food_source` calls.
The first explanation — bias decayed below the rendering floor — was replaced by a retroactive
correction (2026-05-27, from Exp 32): an agent-id mismatch left the annotation list empty, it
rendered as `""`, and the LLM saw nothing. Roy-3 also found the priming bias map shrunk from six
saturated keys to two partial ones.

### Exp 24 to 28 — EC centroid drift

Exp 24 found paraphrase pairs clustered cleanly in isolation, but streamed through one EC as in
a Roy run, 19 of 20 pair strings joined a single node: the running-mean centroid drifted toward
a generic prototype. Exp 25's sweep chose threshold 0.50, which failed the P1 regression
tolerance in Exp 26; a finer sweep settled on 0.44. Exp 28 made NAc's threshold override track
the live EC threshold (P2 target gain +58.4 pp, 10 of 10 seeds). Re-running Roy-2c with the fix
(Exp 27) cut the cluster-bias L2 by 79%; behavior did not move (0 `sense_food_source`, 8 failed
`pick_up` in every arm). The fix shipped as substrate hygiene.

### Exp 29 to 34 — the bisect, and getting Wire-A into the prompt

A six-commit bisect (Exp 29) cleared the wire merges of Roy-3's regression: the key-count drop
was environmental drift in the encoder layer, the magnitude drop Wire-A's intentional decay
(tau = 50). Exp 30 split the decay (tau = 300); arm A still made 0 target calls, and its claim
that the annotation reached the LLM was later retracted — priming wrote biases as
`default_agent`, the test agent read as `sim_aut`, and the claim had been inferred from decay
arithmetic rather than read from prompts. Exp 31 audited the Roy runs: the cluster-wire cycle
had converged on the encoder verdict; the Wire-A cycle was diverging. Exp 32 found the agent-id
bug. After Fix A (Exp 33) Wire-A reached the LLM for the first time, and arm A still made 0
target calls. After Fix B (Exp 34) the scene-manifest LLM, shown `sense_food_source [strongly
rewarding from prior experience]`, added a "blue toy car" and a "set of keys" to the scene. No
food entity, so the rewarded tool was never callable.

### Exp 35 and 36 — Roy-5b and its confound isolation

Roy-5b added a naming-event scaffold — a body that says "hungry", "thirsty" or "warm" in the
same tick as the drive — to give binding a co-firing signal. The literal pre-registered row 1
passed: one default-rule edge joined a test node to a priming food cluster. At the time it was a
**conditional pass, ambiguous by structure**: the edge joined two drive nodes, not the
drive–linguistic edge the scaffold was built for, and an EC-drift confound was unresolved (the
threshold moved 0.40 → 0.44 between Roy-4 and Roy-5b, while arm A's overlap with priming nodes
went 0/10 → 10/10 and priming shrank from 37 nodes to 18).

Exp 36 ran the Roy-4 spec without the scaffold on current code at 0.44: overlap 10/10. A Roy-4
replica on the old code read 0/10; adding the scaffold back left 10/10. The record's verdict:
the drift fix closed the gap and the scaffold contributed zero (the replica comparison also
changed the code version; the record attributes the jump to the threshold). The scaffold
produced its +22 linguistic priming events as designed, and `naming_events.py` is Dormant since
2026-05-29. Roy-5b is **superseded**; its conditional pass stands as recorded and is not
evidence for the scaffold. What closed is a recognition gap in the EC. Whether it buys behavior
was left as the next question, and no Roy iteration ran after.

### Exp 37 (cross-model) — the Goldilocks zone

Exp 37's graduation claim is on the
[cross-session learning](/research/experiments/cross-session-learning/) page and
[its own page](/research/experiments/exp-37-graduation/). Its letters mean something new:
**A** fresh, **B** resumed from a session where it was burned by a fire, **C** resumed from a
peaceful session (control), plus three ablation arms on B — 2 scenarios × 6 arms × 5 trials per
model. The primary is the fraction of safe warming (`positive_approach_engagement_fraction`) at
`fire_pit`.

| Model | Arm A (mean ± SD) | Arm B | Δ (SD) | Primary |
|---|---|---|---|---|
| Qwen2.5-14B-Instruct | 0.533 ± 0.27 | 0.517 | −0.06 | fail |
| Qwen2.5-32B-Instruct | 0.420 ± 0.27 | 0.800 | **+1.43** | pass |
| Mistral-Small-24B-Instruct | 1.000 ± 0.000 | 0.600 | −0.40 | fail (ceiling) |
| DeepSeek-R1-Distill-Qwen-32B | 0.259 ± 0.145 | 0.566 | **+2.11** | pass |

The substrate shows only where the prior leaves headroom. Mistral's fresh agent was already
perfect, so its fail is a void, not a negative (L6); Qwen-14B had room and did not use it. A 24B
model hitting a ceiling a 32B model did not led the record to read headroom as training method
as much as scale. R1, a reasoning fine-tune of the same Qwen-32B base, lowered Arm A and gave
the largest effect; removing Wire-A's annotation shrank its delta by +1.13 SD, the first
ablation past 1.0 SD in any model. That is suggestive, not an attribution: Wire-1 did not
attribute, and the head-on Wire-A tests returned 0. Why **partial**:

- **Isolation failed.** Arm C sat outside Arm A's band for Qwen-32B (0.667) and R1 (0.527 ≈ B).
- **Robustness split** — pass for Qwen-32B, fail for R1, which warmed more without touching less.
- **`sharp_rock` was degenerate** in all four models; `fire_pit` carries the evidence alone.
- **The NAc-bias-off arm was not an ablation** (correction 2026-09-25, pymaxim #889): the flag
  missed the live write and read paths, so the arm ran with NAc reward bias on and in effect
  turned off only the Wire-A annotation.
- **The cloud comparisons were deferred** behind a prompt-caching refactor.

### Exp 38 and 40 — the counter-prior

A null where the prior is right cannot separate a useless substrate from a redundant one. Exp 38
built a world where the prior is wrong: a `hearth` that reads as an ordinary warm fire, where
warming breaches the thermal comfort band and hurts, beside a safe `fire_pit` control world.
Primary 1: the interaction `Δ_deceptive(B − A) − Δ_consistent(B − A)` ≤ −1.0 SD. Primary 2: B
avoids warming at the hearth on first contact, before any pain in its own session. Both required.

| Model | Interaction (SD) | First-contact primary | Verdict |
|---|---|---|---|
| Claude Sonnet 4.6 | +0.40 | fail | dominance |
| GPT-4o | −0.46 | pass (B 0.60 vs A 0.80) | dominance (primaries disagree) |
| DeepSeek-V3 | −0.62 | fail | dominance |
| DeepSeek-R1-Distill-Qwen-32B | +2.25 | fail (B 0.75 vs A 0.20) | dominance |
| Qwen2.5-32B (Exp 40) | +0.16 | pass, on a one-trial margin | dominance (primaries disagree) |

No model met both primaries — "B keeps warming the deceptive hearth." R1 is the sharpest case:
its Wire-A and Wire-1 ablations cut hearth-warming from B's 0.60 to 0.40 and 0.34, below a
fresh agent, so its substrate is causally load-bearing — but it amplifies the generic
fire-means-warmth association, not the pain it carries. A third arm, NAc-bias-off (0.21), is
void: as in Exp 37 it left the reward bias on (correction 2026-09-27,
[#889](https://github.com/dennys246/Maxim/issues/889)), so it says nothing about whether the
NAc reward bias drives the warming. The dominance verdict does not rest on it.

Exp 40 filled the last cell with Qwen2.5-32B, the one model with a positive Exp 37 signal (60
sub-simulations, about 30 hours, local). Warming at the deceptive hearth: 0.50 fresh, 0.52
resumed; at the safe fire, 0.31 and 0.29; Arm C 0.57. Interaction +0.04 (+0.16 SD), wrong sign.
The +1.43 SD signal vanished once the prior was false. Prior agreement, not scale, gates what
the substrate can show while an LLM chooses.

### Exp 39 and 41 — taking the LLM out of selection

Every test above leaves the LLM choosing, so "the prior wins" could be an artifact of who
chooses. Exp 39 pre-registered the substrate-primary counter-prior test
(`propose_via_substrate`, N ≥ 5 seeds). Its measured run was never fired; the Exp 41 record notes
the proposer fixated on its first high-confidence link, so the hypothesis test never started.
Exp 39 is **superseded**, with no results.

Exp 41 added an exploration policy and a cold body: a 2 × 2 of exploration on/off by consistent
or deceptive arc, 40 runs, 10 seeds per arm, with `smollm-1.7b-instruct` only narrating. It was
**void**: first-third harm was already below the pre-registered 0.10 floor (A_dec ≈ 0.016,
B_dec ≈ 0.029), with near-zero spread across seeds. The loop was real — try, pain, stop — but
harm was never tempting enough to measure a decline, and the floor was not lowered after the fact.

### Exp 42 and 42b — substrate-primary preference

Exp 42 measured *terminal preference* instead: a safe and a harmful warmth source in one scene,
both relieving cold, one hurting. Two arcs swapped which was harmful, so a fixed bias toward one
identity could not pass. 10 seeds per arm, substrate-primary, exploration on, cold body; runs
were 30 turns (a 2026-07-28 correction: the 40-turn flag never bound).

| Configuration | `safe_pref` A / B | Identity flip | Per-source net (harm / safe) |
|---|---|---|---|
| Drive-gating on | 0.984 / 0.975 | +0.959 | −0.250, −0.307 / +0.990 |
| Drive-gating off (ablation) | 0.984 / 0.965 | +0.949 | −0.250, −0.321 / +0.990 |

**Earned**: with the LLM out of selection, the substrate learned from pain to prefer whichever
source was safe. The pre-registered mechanism, drive-gating (B7), turned out redundant — the
ablation graduated identically — and is Dormant. The record credits delta-attribution (B8),
which blames pain only on the action whose own effect caused it. The hand-written
drive-affinity heuristic, also credited at first, gives every warmth tool the same +0.630 (a
2026-09-01 measurement), so it cannot express the safe-vs-harm preference (L12). The claim is
discrimination; it does not reopen override.

Exp 42b re-ran the frozen design after the drive-pain refactor (2026-07-29): 40 sub-simulations,
none failed, discrimination reproduced. A 2026-09-01 re-run after a credit-path fix read 0.996 /
1.000 with SD 0.000; its per-source check went unestablished after an operator error lost the
live records, and mean contacts per run rose unexplained (66 → 277 in one arm, 75 → 106 in the
other). At 0.98–1.00, a green re-run means "not broken," not "not degraded" (L4).

### Exp 43, 44 and 44b — does a learned substrate steer the LLM?

Exp 43, a no-LLM simulation study for a gaze task, found that on never-seen individuals a lookup
table sits at chance (−0.005) while EC category transfer reaches 0.938 (synthetic vectors) or
0.917 (a real text encoder) — only while the encoder clusters the category. No production claim.

Exp 44 returned to the LLM-primary path with a counterfactual: re-ask Qwen2.5-32B at temperature
0 at each captured state, with and without the substrate annotation, using neutral twins (a green
and a purple flame). With green safe, 15 of 100 decisions flipped — 10 from "observe" to
"warm_self", none toward harm. With the colors swapped, 10 of 96 flipped and followed the swap
(7 : 2), but 2 went toward harm, a small residual color preference. It is **exploratory**:
metrics were chosen after pilot data. The Exp 44b pilot (one seed per arm) found the transplant
control names tools absent from its world, so it cannot separate name-copying from following
learned content, and that the annotation carries (entity, affordance) pairs, so the "direction"
and "commitment" effects are not independent. The confirmatory run is not frozen.

## Bounds

From the [measurement limits](/research/limits/):

- **L4 — `safe_pref` saturation (binding).** Exp 42/42b detect breakage, not degradation.
  Re-measure when a degradation arm lands or the warmth sources or B8 change.
- **L6 — ceiling voids (mitigated).** A fresh agent at ceiling (Mistral) makes a rise criterion
  unattainable; the fail is a void.
- **L8 — Exp 37 not reproducible across time (binding).** Same commit, same seeds: 0.420 in June,
  0.710 on 2026-08-22; root cause not established. Before any re-fire the record requires
  stamping model, endpoint, context size, quantization and server build, and gating on `B − C`.
- **L12 — a hand-written English prior in action selection.** It does not carry Exp 42's
  preference, but bodies whose tools are not twins get answers pre-installed. Re-measure on any
  edit to `_DRIVE_TOOL_AFFINITIES`.

Known defects and corrections: the NAc-bias-off arm in Exp 37 (#889, 2026-09-25) and Exp 38 (2026-09-27); the Exp 23 and Exp 30
annotation claims (2026-05-27); Exp 42's turn count (2026-07-28); a protocol that omitted
`MAXIM_SUBSTRATE_PATH=1` and wasted one Roy-5b run. Roy iterations are single-seed; Exp 37/38/40
are N = 5, so their first-contact primaries are low-power sign tests. The Roy plan revives only
when cross-modal alignment ships, so that priming and test percepts share an EC region.

## What came next

The substrate-primary regime Exp 42 opened is where later results live:
[the Cradle](/research/cradle/) (caregiver-taught learning, no LLM in the action path),
[orienting on the Reachy Mini](/research/experiments/hardware-orienting/), and
[sharing and survival on the world seam](/research/experiments/world-seam/). Two questions from
this page stay open: whether a substrate can override a prior, which Exp 38 and 40 answered only
for an LLM in the action path, and whether the LLM follows learned content rather than names —
the Exp 44 confirmatory run.
