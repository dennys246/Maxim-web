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
  federation on a deterministic substrate ([exp 46](#46--operant-orient-a-mother-teaches-a-creche-pools)),
  habituation as novelty-detection in noise ([exp 47](#47--habituation-a-novel-sound-in-a-wall-of-noise)),
  and the embodied seam graduation ([exp 48](#48--cradle-mother-seam-the-embodied-infant)).
- **Built infrastructure, not a behavioral claim:** the generative cradle
  simulator that narrates developmental scenes ([exp 11](#11--cradle-sensorimotor-poc)),
  and the Phase 0 harness smoke test.
- **Design / planned:** the *cradle harness wired end-to-end into
  substrate-primary mode* as a standard way to raise an agent. The
  [NAc page](/systems/nucleus-accumbens/) states this plainly — Phase 0
  (end-to-end wiring, cradle harness, telemetry) is *planned*, and the
  `--aut-mode substrate-primary` flag is opt-in and slated for v1.1. The
  [`cradle_mother.md`](https://github.com/dennys246/Maxim/blob/main/docs/plans/cradle_mother.md)
  design doc is largely a **plan and post-mortem**, not a description of a
  shipped feature.

None of the "planned" pieces are things you can turn on today and expect to
work end to end. What *is* real is a set of concrete experiments that each test
one slice of the idea.

## The cradle simulations — reverse chronological

| ID | Experiment | Date | Status | Headline result |
|----|-----------|------|--------|-----------------|
| 48 | [cradle-mother seam (embodied)](#48--cradle-mother-seam-the-embodied-infant) | 2026-07-23 | PASS / graduate | Embodied taught 0.875 vs no-feed 0.448 (rise +0.211) |
| 47 | [habituation, novel sound in noise](#47--habituation-a-novel-sound-in-a-wall-of-noise) | 2026-07-22 | Complete (scripted) | Habituating 1.00 catch-rate vs 0.04 control at 40-noise density |
| 46 | [operant orient / crèche](#46--operant-orient-a-mother-teaches-a-creche-pools) | 2026-07-22 | Complete (scripted) | Taught 0.90 vs none 0.50; 12 merged infants reach 1.00 |
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

### 48 — cradle-mother seam: the embodied infant

The most recent run, and the one that changes the story of the plan doc.
Experiment 46 proved the mechanism on a *scripted* substrate, but the
**embodied** `cradle_mother` simulator was still measuring at chance —
perception and interoception were diluting the operant signal. Experiment 48
introduces an **extero/intero seam** (a structural separation of the perception
channels) and asks whether that fix carries to the embodied instrument.

- **N:** 12 seeds per arm, 24 runs total. Arms: *taught* (mother feeds +
  credits toward-turns) vs. *no_feed* (control, no contingent care).
- Environment: `bodies/infant_operant` with `MAXIM_OPERANT_ONLY_CREDIT=1`,
  explore bonus 1.5, turn-only toolset. Metric: **directedness** (fraction of
  turns that move the infant toward the sound).

| Arm | Early | Late | Rise |
|-----|-------|------|------|
| taught | 0.664 | **0.875** | **+0.211** |
| no_feed | — | 0.448 | — |

Both graduation criteria ("late ≥ 0.65 and rose ≥ 0.15") were met, and the
taught-vs-control margin, 0.875 − 0.448 = **+0.427**, cleared the required 0.20
by more than twofold. Verdict: **PASS / graduate** — the embodied infant is "no
longer at chance," with the mother's teaching isolated as the causal factor.
This updated experiment 46's dormant status and qualified `cradle_mother.py` as
a behavioral-graduation candidate.

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
  direction learning went from chance to 100% correct within about ten trials
  and two independently trained substrates merged into a working combined
  policy. The cradle federation results (twelve infants → 1.00) are the
  same substrate-merge story tested at scale in simulation.
- **Evidence index** — for the broader substrate-primary evidence base, see
  [substrate-primary evidence](/research/experiments/substrate-primary-evidence/)
  and the full [experiments log](/research/experiments/).

## Status & caveats

This is forward-looking, experimental work. Treat the section headings as
claims of *different strength*:

- **Validated, scripted:** exp 46 (operant orient + federation) and exp 47
  (habituation) are the solid ground. They are deterministic and do not depend
  on the embodied simulator's artifacts.
- **Validated, embodied, recent:** exp 48 graduated the embodied infant on
  2026-07-23 with N=12 per arm. It is a single passing run of a newly
  seam-fixed instrument; read it as a graduation candidate, not a long-settled
  result.
- **Superseded / invalidated:** the *original* cradle-mother design included an
  intrinsic "centeredness drive (azimuth homeostatic set_point 0)." Probes
  showed the infant oriented at contingent **1.000 vs ~0.50 chance even with no
  mother anywhere** — proving the intrinsic drive, not maternal teaching, drove
  the learning. That design was **superseded**; the current design gives the
  infant *no* innate orient drive and exteroceptive perception only.
- **Stale plan doc:** the
  [`cradle_mother.md`](https://github.com/dennys246/Maxim/blob/main/docs/plans/cradle_mother.md)
  design/status still reads **SUPERSEDED / DORMANT (2026-07-22)** — "measured
  at chance," resurrection pending a credit-attribution fix. Experiment 48
  (2026-07-23) *is* that fix, and it passed, so the plan doc lags the latest
  result. If the two disagree, exp 48 is newer.
- **Planned, not shipped:** the cradle harness wired end-to-end into
  substrate-primary mode. Per the NAc page this is Phase 0 of a multi-phase
  roadmap, with `--aut-mode substrate-primary` opt-in and slated for v1.1;
  `--aut-mode llm-primary` remains the default indefinitely. Do not read "raise
  an agent in the cradle before autonomy" as an available workflow yet.

## Going deeper

- Design doc and post-mortem: [`docs/plans/cradle_mother.md`](https://github.com/dennys246/Maxim/blob/main/docs/plans/cradle_mother.md)
- Experiment log index: [`docs/experiments/README.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/README.md)
- [`46_operant_orient_creche.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/46_operant_orient_creche.md)
- [`47_habituation_novel_in_noise.md`](https://github.com/dennys246/Maxim/blob/main/docs/experiments/47_habituation_novel_in_noise.md)
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
