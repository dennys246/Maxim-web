---
title: The Cradle
description: Maxim's developmental-training harness — raising an agent's substrate through staged, caregiver-driven simulations before autonomy — and the operant-orient, habituation, and cradle-mother experiments that test whether it works.
---

The **Cradle** (also called the *crèche*) is Maxim's idea of a *developmental
training harness*: instead of dropping a fresh agent into an open task and
hoping the base model behaves, you raise its **substrate** — the learned
causal links, orient policies, and habituation state that live below the
language model — through a series of controlled, caregiver-driven simulations
first. A "mother" process feeds and corrects an "infant" body; the infant's
[nucleus accumbens](/systems/nucleus-accumbens/) learns which actions reduce
which drives; and only once that substrate is shaped does the agent run more
autonomously.

Maxim is a bio-inspired cognitive architecture (package `pymaxim`, imports as
`maxim`), and the Cradle is the most explicitly *developmental* part of it. It
borrows the framing of infant operant conditioning — a driveless infant learns
to orient toward a sound purely because a caregiver feeds it when it turns the
right way — and uses that as a clean testbed for one question: **can the
substrate learn behavior on its own, with no language model in the action
path?**

## Design vs. built — read this first

The Cradle is a mix of shipped experiments and forward-looking plan. Be clear
about which is which:

- **Built and validated (scripted):** operant-orient learning and crèche
  federation on a deterministic substrate ([exp 46](#46--operant-orient-a-mother-teaches-a-crèche-pools)),
  and habituation as novelty-detection in noise ([exp 47](#47--habituation-a-novel-sound-in-a-wall-of-noise)).
- **Built, embodied, and EARNED:** caregiver-taught orienting through hunger
  relief on the embodied infant ([exp 52](#52--nurture-caregiver-taught-orienting-through-hunger-relief)).
  The infant learns to turn toward the mother's voice only when her feed
  relieves its hunger — the same feed without need teaches nothing.
- **Superseded — the apparatus case study:** the extero/intero seam experiment
  ([exp 48](#48--cradle-mother-seam-the-embodied-infant)) stays PARTIAL for the
  constant-credit apparatus it measured. The mother effect was re-earned on the
  corrected apparatus, but the learning gate was not met and the metric turned
  out to track phase alignment. Read it as the apparatus correction — v1 contest
  → v2 re-baseline → sweep → shuffle — that made exp 52's measurement possible.
- **Built infrastructure, not a behavioral claim:** the generative cradle
  simulator that narrates developmental scenes ([exp 11](#11--cradle-sensorimotor-poc)),
  and the Phase 0 harness smoke test.
- **Design / planned:** the *cradle harness wired end-to-end into
  substrate-primary mode* as a standard way to raise an agent. The
  [NAc page](/systems/nucleus-accumbens/) states this plainly — Phase 0
  (end-to-end wiring, cradle harness, telemetry) is *planned*, and the
  `--aut-mode substrate-primary` flag ships in 1.1 as an experimental opt-in. The
  [`cradle_mother.md`](https://github.com/dennys246/Maxim/blob/main/docs/plans/cradle_mother.md)
  design doc is largely a **plan and post-mortem**, not a description of a
  shipped feature.

None of the "planned" pieces are things you can turn on today and expect to
work end to end. What *is* real is a set of concrete experiments that each test
one slice of the idea.

## The cradle simulations — reverse chronological

| ID | Experiment | Date | Status | Headline result |
|----|-----------|------|--------|-----------------|
| 52 | [nurture: orienting through hunger relief](#52--nurture-caregiver-taught-orienting-through-hunger-relief) | 2026-08-25, re-validated 2026-09-02 | **COMPLETE — EARNED, reproduced** | Taught 0.878 vs satiated 0.441 (fed, never hungry) vs no-feed 0.413 on the shuffled apparatus v3, 12 seeds/arm; re-run 0.837 / 0.413 / 0.413, GRADUATE reproduced; scripted phase 0.892 vs 0.496 for every control |
| 48 | [cradle-mother seam (embodied)](#48--cradle-mother-seam-the-embodied-infant) | re-baselined 2026-08-14, sweep completed 2026-08-18 | **COMPLETE — not graduated; superseded by 52** | Mother effect re-earned on apparatus v2 — taught 0.649 vs no-feed 0.167 (+0.482) — but LEARNED-v2 missed and the sweep attributes the gap to phase-locked attractor selection |
| 47 | [habituation, novel sound in noise](#47--habituation-a-novel-sound-in-a-wall-of-noise) | 2026-07-22 | Complete (scripted) | Habituating 1.00 catch-rate vs 0.04 control at 40-noise density |
| 46 | [operant orient / crèche](#46--operant-orient-a-mother-teaches-a-crèche-pools) | 2026-07-22 | Complete (scripted) | Taught 0.90 vs none 0.50; 12 merged infants reach 1.00 |
| 13 | phase0 harness smoke | 2026-05-09 | Recorded | Phase 0 harness clears success criterion; no behavioral claim |
| 11 | [cradle sensorimotor PoC](#11--cradle-sensorimotor-poc) | 2026-04-26 | Recorded (infra) | Narrator generates all 10 developmental scenes |

### 46 — operant orient: a mother teaches, a crèche pools

The load-bearing result. **Scripted and deterministic on real substrate with a
real Hivemind merge — no LLM in the action path.** An infant body has a hunger
drive but a *null* intrinsic azimuth drive: it has no built-in reason to face a
sound. External operant credit is applied via `NAc.credit_operant_reward()`
only when the mother feeds the infant after it turns toward the sound.

- **Learning curve** (8 seeds, ε=0.2): taught rose from baseline 0.65 to a
  settled **0.90**; a *yoked* control (random action, same reward schedule)
  sat at 0.36; a *none* control (no credit) sat at 0.50 (chance). Verdict:
  "LEARNED + MOTHER-TAUGHT PASS." Learning converged in roughly ten ticks.
- **Federation** (12 infants × 2 ticks each, 10 seeds, real `nac_merge`):
  twelve barely-trained infants merged into a policy scoring **1.00**, versus
  0.51 for a crèche with no mother. Pooling substrate recovers a
  full-experience policy from fragments.
- **Graded orienting** (place-cell population code, Gaussian bumps width 0.12):
  taught **0.19 → 0.82** (an ε=0.2 ceiling), yoked 0.03, none 0.17.
- **Graded federation:** a single infant trained 300 ticks reached 1.00; a
  merged crèche (12 × 25 ticks) also reached **1.00**, versus 0.16 with no
  mother.

The reason this matters: it isolates the mechanism from the messy embodied
simulator. Operant conditioning *alone* drives orienting, and federated crèches
reach full coverage by pooling — both without any language model deciding
actions.

**Correction (2026-09-03) on what the federation shows.** Every infant in the
crèche runs under one shared agent id with one shared encoder and entorhinal cortex
— the script says so in its own words: *"SAME id for every infant so the merged
cluster keys align."* That is the one configuration in which the merge's
key-alignment defect cannot fire. Until 1.1.3, a substrate merged from an agent with
*its own* clusters read out as exactly 0.0 on the receiver while the merge reported
success (D43), so these numbers show pooling within a shared cluster space, not
sharing between independent agents. The independent-agent case was mechanically fixed
in 1.1.3 and earned its behavioural claim in 1.2, in a different apparatus: a taught
want transferring into a genuinely independent receiver on a live Minecraft world
([Exp 56](/research/evidence/#a-taught-want-transfers-between-independent-agents)).
That result does not retroactively license these numbers — they still show pooling
within a shared cluster space, and the crèche-scaling question has its own, partial,
answer in [Exp 57](/research/evidence/#pooling-partial-learners--faster-per-participant-at-a-total-experience-cost).

### 47 — habituation: a novel sound in a wall of noise

Tests the other half of "shaping a substrate": not just learning what to
approach, but learning what to *ignore*. Scripted, 200 seeds per condition,
background noise varied across 1, 5, 10, 20, and 40 concurrent sounds.

- At **40-noise density**, a habituating agent caught the novel sound at
  **1.00** while a non-habituating control managed **0.04** (chance ~0.02).
  Habituation works as noise suppression that *enables* novelty detection.
- Reward-protected content — the mother's voice — held **1.00** attention
  despite identical exposure frequency. Salience that matters resists
  habituation.
- Federation: a solo infant hearing half of twenty background noises caught
  novelty at **0.06**; pooling familiarity counts across a crèche of twelve
  pushed it to **1.00**. The group collectively suppresses background nobody
  individually heard enough of.

### 52 — nurture: caregiver-taught orienting through hunger relief

The result the 1.1 "Sensorimotor" release was reopened to test, and the successor
to exp 48. The question is sharper than "does the mother's feeding teach
orienting?": does the infant learn *because feeding relieves a need*? Three things
had to be true — it learns when hungry and fed contingently (LEARNED); it does
**not** learn when fed contingently but never hungry (HUNGER-NECESSARY, the arm
exp 48 never had); and it does not learn when fed on the same schedule
non-contingently, or not at all (MOTHER-NECESSARY).

**What changed versus exp 48.** The mother's feed already wrote a real hunger delta;
the credit was a constant `feed_reward=1.0`, so a full infant was credited exactly
like a starving one. Exp 52 makes the operant credit's value the **sign of the
drive relief the feed actually produced** in the infant — zero relief, no credit —
delivered through the existing one-turn operant trace. No new mechanism class.
Pre-registered with frozen gates, both phases run 2026-08-25.

- **Phase A — scripted substrate (8 seeds × 600 ticks): PASS.** Taught settled at
  **0.892**; satiated **0.496**, yoked **0.496**, no-feed **0.496**. Satiated and
  no-feed are identical to the digit — with no credit minted, both are the same
  seeded random walk. Yoked received every one of the taught arm's 4,305 credits
  decoupled from its own actions and stayed at chance: contingency carries the
  learning, not reward volume.
- **Phase B — embodied `cradle_mother`, apparatus v3 (12 seeds/arm, 48 turns,
  exposure-matched): GRADUATE.** Shuffled stimulus order broke the phase-locking
  that exp 48's sweep exposed. Taught late-bin directedness **0.878** (rising from
  0.61 in act 1); satiated **0.441** (fed on 35% of turns, credited on 0%);
  no-feed **0.413**. LEARNED (0.878 ≥ 0.65, +0.26 rise), MOTHER-TAUGHT (+0.465)
  and HUNGER-NECESSARY (+0.437; satiated rise +0.10 < 0.15) all pass under gate
  v3. The apparatus check is clean: every arm shows real seed spread (SD
  0.08–0.13, 6–8 distinct late values) — the exact seed-invariant twelfths of
  apparatus v2 are gone, and directedness is a graded measure again.

| Arm (Phase B) | act1 | act2 | act3 | act4 | late (act3+4) | fed | credited |
|---|---|---|---|---|---|---|---|
| taught | 0.61 | 0.85 | 0.87 | 0.89 | **0.878** | 73% | 73% |
| satiated | 0.34 | 0.43 | 0.43 | 0.45 | 0.441 | 35% | **0%** |
| no_feed | 0.33 | 0.40 | 0.38 | 0.44 | 0.413 | 0% | 0% |

**Re-validated 2026-09-02.** The D53 credit-path fix fired the row's re-run trigger,
and Phase B was re-run whole on the fixed code under the same frozen v3 gate and the
same twelve seeds: taught late **0.837**, satiated **0.413**, no-feed **0.413** —
all three gates pass and GRADUATE is reproduced, with every delta from the original
inside the per-seed spread. Phase A was not re-run (scripted; its credit does not
route through the changed path).

**Correction (2026-09-02).** This page used to say that one taught seed was a weak
learner (late 0.54) and that the margin instrumentation explained why, via the
visibility floor. That sentence is retracted — the one sentence of the original
write-up the re-run retracts. Per-seed values are not reproducible run-to-run: only 4
of 36 (arm, seed) cells were identical across the two runs, per-seed late scores
correlate at r = +0.66 (taught), +0.29 (no-feed) and −0.24 (satiated), and the
"weak" seed read 0.667 the second time. The seed fixes the stimulus order, not the
trajectory. Arm means replicate; per-seed narratives from this apparatus do not, and
none is carried here. The per-arm table above is what the gates read.

**What it shows, and what it does not.** On both the clean substrate and the
embodied sim, an infant with no orient drive acquires "turn toward the voice" from
the mother's contingent feeding *only when the feed relieves something*. That is
the operational content of "learns to want to orient from a primary reward". It
does **not** show "fed while hungry" in the everyday sense: the sign-only credit
discriminates nonzero-from-zero relief (hunger at feed ≈ 0.05–0.1, far below the
deprivation threshold). Not modeled: secondary reinforcement of the voice itself,
or devaluation. Nothing here speaks to magnitude, loudness, the LLM-driven action
path, or multi-turn credit. **Phase B is one session, n = 12 per arm** —
cross-session replication is outstanding.

**Readout on hardware (exp 53b).** Three of these taught infants' persisted NAc + EC
files, loaded unchanged onto a physical Reachy Mini with nothing crediting on the
robot, turned toward the speaker in 36 of 36 trials (delivered directedness 1.00 per
seed); the never-hungry controls loaded the same way took no action, and the no-feed
controls turned right every time. Readout, not learning; n = 3 seeds per arm, fixed
step, front hemisphere. Re-run on the robot on 2026-09-02 with the same files, it
reproduced exactly (1.00 / 0.00 / 0.50) — on a platform that emitted 85
actuator-degradation warnings across 180 trials, all roll and pitch, never yaw, the
axis azimuth readout rides on. A pass on a platform that was warning, not a clean
win. Details and the apparatus finding from exp 53
are on the [evidence page](/research/evidence/#cross-context-readout-on-hardware);
record: [`53_cross_context_readout.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/53_cross_context_readout.md).

Record: [`52_nurture.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/52_nurture.md) ·
[pre-registration](https://github.com/dennys246/Maxim/blob/main/docs/experiments/protocols/exp52_nurture_preregistration.md)
· raw data under [`docs/experiments/data/52_*`](https://github.com/dennys246/Maxim/tree/main/docs/experiments/data).

### 48 — cradle-mother seam: the embodied infant

Experiment 46 proved the mechanism on a *scripted* substrate, but the
**embodied** `cradle_mother` simulator was still measuring at chance —
perception and interoception were diluting the operant signal. Experiment 48
introduces an **extero/intero seam** (a structural separation of the perception
channels) and asks whether that fix carries to the embodied instrument.

:::caution[The 2026-07-23 result has been retired]
Exp 48 originally reported a much larger taught-vs-control gap and a GRADUATE
verdict. A 2026-08-11 contest found those magnitudes did not reproduce and that
the mechanism conflicted with how the apparatus behaved. The experiment was
**re-baselined on a fixed apparatus (v2) against a gate re-frozen before the
data (gate v2)**. The v1 magnitudes are retired as **v1-apparatus artifacts** —
not comparable, and not a target. Everything below is the apparatus-v2 record.
:::

**Current disposition: COMPLETE — not graduated**, landing on the experiment's own
pre-registered PARTIAL branch. Re-baselined 2026-08-14; the explore-weight sweep
completed 2026-08-18. The experiment ran to completion and answered its question;
what it did not do is clear the bar it set for itself in advance.

- **N:** 12 seeds per arm, 24 runs, 0 failed. Exposure-matched at 48 turns per
  seed in both arms — the v1 arms were *not* exposure-matched, which was one of
  the contested confounds.
- Environment: `bodies/infant_operant` with `MAXIM_OPERANT_ONLY_CREDIT=1`,
  a turn-scoped action budget (`MAXIM_SUBSTRATE_ACTIONS_PER_TURN=6`), explore
  weight 1.5, turn-only toolset, mistral-7b narrator in a deterministic greedy
  regime. Metric: **directedness** (fraction of turns that move the infant
  toward the sound). Runs pinned at `executed_git_hash a9ea66fe`.

| Arm | act1 | act2 | act3 | act4 | Late bin |
|-----|------|------|------|------|----------|
| taught | 0.55 | 0.58 | 0.63 | 0.67 | **0.649** |
| no_feed | 0.18 | 0.17 | 0.17 | 0.17 | **0.167** |

Against the two pre-registered gates:

- **MOTHER-TAUGHT: PASS, decisively.** Taught 0.649 vs no_feed 0.167 is
  **+0.482** against a required margin of 0.20. The mother's operant teaching
  is the difference, re-confirmed on the fixed apparatus.
- **LEARNED-v2: FAIL.** Late 0.649 against the 0.65 level is a **0.001 miss**
  — recorded and deliberately *not* retuned, per the discipline the gate was
  frozen under — and the rise of **+0.104 against 0.15** from the act1-only
  early bin is the substantive miss.

**What the completed sweep showed.** Re-running across explore weights was
meant to find the ceiling; it found something more informative. Every cell came
out an exact, seed-invariant twelfth:

| Explore weight | taught late | no_feed late |
|---|---|---|
| 1.5 | 8/12 = 0.667 | 2/12 = 0.167 |
| 1.0 | 8/12 = 0.667 | 2/12 = 0.167 |
| 0.75 | 4/12 = 0.333 | 6/12 = 0.500 |

These twelfths are the seeds landing in the directed attractor, which is why they
differ slightly from the 0.649 late-bin average quoted above: the plateau is
*exactly* 8/12 at both of the higher weights — a structural ceiling that does not
move with the exploration share — while the late-bin figure averages across the
final two acts. At explore weight 1.0 the level criterion actually recovers
(0.667 clears 0.65) and the gate still fails on rise, which is what identified the
wall as structural rather than a tuning problem.

At 0.75 **the arms invert**, and the control moves with zero teaching involved.
The experiment's own reading: on this deterministic apparatus — greedy narrator,
cycling stimulus, alternating explorer — directedness measures **phase alignment
between the turn cycle and the stimulus cycle**. The explore weight selects
which phase-locked attractor each arm falls into, and the operant credit tips
the taught arm between attractors.

That qualifies the mother effect rather than erasing it: the +0.482 gap is real
and causally the mother's credit, but the honest description is **credit-tipped
attractor selection, not graded orienting skill** — were it graded skill,
lowering exploration would not invert the arms. The result is **not retracted,
and it is not a code regression**; a matched re-run at the original graduation
commit reproduced the same behavior.

The sweep dimension was considered exhausted, and the sanctioned next step — the
contest's other pre-registered control, **randomised stimulus order**, under a
**v3 gate frozen before the data** — has since run as
[exp 52](#52--nurture-caregiver-taught-orienting-through-hunger-relief), which also
replaced the constant credit with relief-sourced credit and graduated. Exp 48's
verdict stands for the constant-credit apparatus; to reproduce its rows, the
harness now needs `--credit constant`.

This phase-locking finding was general enough to be promoted into the repo's
[measurement-limits ledger](https://github.com/dennys246/Maxim/blob/main/docs/limits/README.md)
as L2: a graded-learning claim on a deterministic apparatus needs a dither
source, or the metric measures phase geometry rather than skill.

### 11 — cradle sensorimotor PoC

The earliest cradle work, and an *infrastructure* result rather than a
behavioral one. It tests whether a generative runner can orchestrate a
sensorimotor developmental arc for an infant humanoid: `maxim --sim cradle`,
with a narrator generating scenes and the bio-pipeline forming memory.

In the primary validation run (Claude Sonnet, 10 turns, 390.3 s, $0.21) the
narrator generated **all 10 scenes** with no fallbacks, progressing through
`exploration → pain_consequence → object_introduction → discrimination`. An
earlier run logged **30 causal links formed, 20 enrichment traces, and 15
episodic memories**. The verdict was explicitly narrow: infrastructure
validated (drive parsing, entity acquisition, generative-mode auto-detection),
but orchestrator sensor writes were still incomplete and no behavioral learning
claim was made.

## How it connects

The Cradle is not a standalone toy — it is the developmental front end of
several systems documented elsewhere.

```
   Cradle simulations (mother + infant body)
              │
              │  operant credit, drive-pain relief
              ▼
   Nucleus accumbens  ──►  causal links, orient policy, reward bias
              │
              │  substrate-primary: NAc selects actions, no LLM in path
              ▼
   Substrate-primary mode (planned Phase 0 harness)
              │
              ▼
   Real hardware orient (Reachy Mini): chance → 100% in ~10 trials
```

- **[Nucleus accumbens](/systems/nucleus-accumbens/)** — every cradle result
  runs through the NAc. Credit is applied with `NAc.credit_operant_reward()`,
  and the "no LLM in the action path" property *is* the substrate-primary
  mechanism the NAc page describes. That page is also the honest source on what
  is shipped (the selection method, "Phase −1") versus planned (the cradle
  harness, Phase 0).
- **Roy harness methodology** — the cradle experiments follow the same
  scripted, seeded, control-armed, substrate-diffable discipline used
  throughout the lab. Provenance and `maxim roy diff` on the resulting
  substrate are how "the mother taught it" is separated from "the base model
  already knew." See the [Roy harness write-up](/research/experiments/roy-harness/).
- **Real-hardware orient** — the crèche's sound-orienting task is the
  simulation counterpart of the [Reachy Mini](/guides/reachy-mini/) work, where
  direction learning went from chance to 100% correct within about ten trials.
  A third arm merged two independently trained substrates, but it has since
  been downgraded to a vacuous guard — its two learners shared one agent id and
  one cluster space. The cradle federation results (twelve infants → 1.00) are
  that same shared-key configuration at scale in simulation, not a test of
  sharing between independent agents (see the correction under exp 46).
- **Evidence index** — for the broader substrate-primary evidence base, see
  [substrate-primary evidence](/research/experiments/substrate-primary-evidence/)
  and the full [experiments log](/research/experiments/).

## Status & caveats

This is forward-looking, experimental work. Treat the section headings as
claims of *different strength*:

- **Validated, scripted:** exp 46 (operant orient + federation) and exp 47
  (habituation) are the solid ground. They are deterministic and do not depend
  on the embodied simulator's artifacts.
- **EARNED, embodied:** exp 52 is the graduation. On the shuffled apparatus
  with relief-sourced credit, the infant learns to orient from the mother's
  feeding only when it is hungry — 12 seeds per arm, sign-only relief credit,
  arm means reproduced by a second run on 2026-09-02 (per-seed values were
  not); read its stated scope before citing it.
- **PARTIAL, embodied — superseded:** exp 48 is *not* a graduation. On the
  corrected apparatus the mother effect is real and causal (+0.482), but the
  learning gate failed and the completed sweep showed the metric tracking phase
  alignment rather than orienting skill. It stands as the apparatus case study
  that exp 52 was built on.
- **Superseded / invalidated:** the *original* cradle-mother design included an
  intrinsic "centeredness drive (azimuth homeostatic set_point 0)." Probes
  showed the infant oriented at contingent **1.000 vs ~0.50 chance even with no
  mother anywhere** — proving the intrinsic drive, not maternal teaching, drove
  the learning. That design was **superseded**; the current design gives the
  infant *no* innate orient drive and exteroceptive perception only.
- **Read the experiment record, not the plan doc:** the
  [`cradle_mother.md`](https://github.com/dennys246/Maxim/blob/main/docs/plans/cradle_mother.md)
  design doc is a plan and post-mortem that lags the experiment record. The
  authoritative dispositions live in
  [`52_nurture.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/52_nurture.md),
  [`48_cradle_mother_seam.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/48_cradle_mother_seam.md)
  and the
  [behavioral-graduation ledger](https://github.com/dennys246/Maxim/blob/main/docs/plans/behavioral_graduation_candidates.md).
  Where any two disagree, the experiment record and the ledger win.
- **Planned, not shipped:** the cradle harness wired end-to-end into
  substrate-primary mode. Per the NAc page this is Phase 0 of a multi-phase
  roadmap, with `--aut-mode substrate-primary` shipped in 1.1 as an experimental opt-in;
  `--aut-mode llm-primary` remains the default indefinitely. Do not read "raise
  an agent in the cradle before autonomy" as an available workflow yet.

## Going deeper

- Design doc and post-mortem: [`docs/plans/cradle_mother.md`](https://github.com/dennys246/Maxim/blob/main/docs/plans/cradle_mother.md)
- Experiment log index: [`docs/experiments/README.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/README.md)
- [`46_operant_orient_creche.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/46_operant_orient_creche.md)
- [`47_habituation_novel_in_noise.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/47_habituation_novel_in_noise.md)
- [`52_nurture.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/52_nurture.md)
- [`48_cradle_mother_seam.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/48_cradle_mother_seam.md)
- [`11_cradle_sensorimotor_poc.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/11_cradle_sensorimotor_poc.md)
- Framing: [Substrate-primary mode](https://www.dennyschaedig.com/maxim/substrate-primary) and [Sound orientation](https://www.dennyschaedig.com/maxim/sound-orientation)


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
