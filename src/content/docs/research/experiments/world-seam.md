---
title: Sharing and survival on the world seam
description: The two research lines measured in a live Minecraft world — a taught want shared between agents (1.2 "Oasis") and a drowning fear learned from the game's own pain, shared, carried to a second pool and priced (1.3 "Oasis-2") — with each claim's scope and every null.
---

:::note[At a glance]
- **Lines:** `sharing` — closed with 1.2; its headline was re-run on the 1.3 platform
  and reproduced. `survival` — active; Exp 62 rung B is designed, not built.
- **Dates:** 2026-09-06 to 2026-09-20; corrections dated 2026-09-25 and 2026-09-27.
- **Releases:** 1.2.0 "Oasis" (2026-09-09) and 1.3.0 "Oasis-2" (2026-09-19).
- **Experiments covered:** [Exp 56](/research/experiments/exp-56/),
  [R1](/research/experiments/r1/), [Exp 57](/research/experiments/exp-57/),
  [R2](/research/experiments/r2/),
  [R2 learned-bias v1](/research/experiments/r2-learned-bias-v1/) and
  [v2](/research/experiments/r2-learned-bias-v2/),
  [Exp 58](/research/experiments/exp-58/), [Exp 60](/research/experiments/exp-60/),
  [Exp 61](/research/experiments/exp-61/), [R3](/research/experiments/r3/),
  [Exp 62](/research/experiments/exp-62/).
- Current as of 2026-09-26.
:::

**The world seam** is the connection 1.1.4 built between Maxim's substrate and a world it
does not control: a live Minecraft server, with real timing, real pain and real relief. It
was apparatus and made no claim of its own. Every result on this page was measured through
it. Minecraft is the instrument, not the product, and nothing here says Maxim plays the
game.

Every experiment on this page is substrate-primary: no language model sits in the action
path. Each experiment's own page links its full record, data and reproduction commands.

## The question

Can what one agent learns reach another agent that never experienced it, through the
shipped export-and-ingest path? And can the world itself do the teaching, with its own
pain and no teacher? 1.2 asked the first question with a want a teacher installed. 1.3
asked both again with a fear the game taught.

## Part 1 — Sharing a learned want

### The claim, stated precisely

A want taught to one agent — one action pays off in one world situation — can be exported
as a bundle and ingested into a second, independent agent. That transfer changes
the receiver's first choice when it meets that situation: 0.80 of first contacts were
decided by the transferred want, against 0.00 in every control arm, with n = 50 receivers
per arm. This is **earned**, and it is the 1.2 headline ([Exp 56](/research/experiments/exp-56/)).
Its scope is narrow: one campaign, one world layout, and a want installed by a teacher.
Pooling several partial learners is **partial by pre-registration**, not a pass
([Exp 57](/research/experiments/exp-57/)). Each agent learns faster as the pool grows, but
the pool spends more total experience than one agent given all of it. What moves between
agents is a cache entry for one exact situation, not a concept
([R1](/research/experiments/r1/), a null).

### What it does not show

- **Generalization.** The shared want is keyed to one exact situation cluster. A layout
  different enough to count as a different situation misses it by construction (R1).
  Transfer is shown. Generalization is not.
- **A free lunch from pooling.** Exp 57's second gate failed. The pool spent 42 / 62 / 84
  agent-trials against a matched single agent's 41 / 46 / 43. The per-participant win is
  real, and pooling is still not cheaper in total samples.
- **A scaling law.** Exp 57's gate tests whether the trials fall as the pool grows, not a
  functional form.
- **Self-taught wants.** A contingent teacher installed the donor's want.
- **Aversion, hardware, cross-layout, or the LLM path.** Exp 56 moved positive credit only,
  in Minecraft, at one layout. The two-robot hardware replication is its own
  pre-registration.

### The experiments

| Exp | Date | Status | n per arm | Result |
|---|---|---|---|---|
| [Exp 57](/research/experiments/exp-57/) | 2026-09-08 | partial | 20 cohorts per rung × condition (4 rungs × 3 conditions, 9,200 rows) | Per-agent trials to criterion fell 21 → 21 → 15.5 → 10.5 as the pool grew (p ≈ 1e-4). The pool spent more total experience than one agent. |
| [R1](/research/experiments/r1/) | 2026-09-07 | null | offline probe, three layouts | The shared want is an exact-key cache and misses at a genuinely different layout. |
| [Exp 56](/research/experiments/exp-56/) | 2026-09-06 | earned | 50 receivers | Taught receivers were bias-decisive on 0.80 of first contacts, against 0.00 in each of the three controls. Every gate passed. |

The subsections below run in date order.

### Exp 56 — a taught want transfers between independent agents

Agent A is taught by a contingent teacher. When A's pending action is the target and the
contingency situation is active, the teacher feeds it, relieving its drive. The credit
lands on A's world cluster for that situation. A's substrate is exported as a bundle and
ingested into agent B through the shipped 1.2 path (`maxim substrate ingest`). The
bundle was **unsigned**: the harness exports through the real CLI without `--sign`
(corrected 2026-09-27; the 1.2.0 notes said "signed"). The claim rests on the shipped
export and ingest path, not on signing, which is tested on its own. B is
independent by construction: a different `agent_id`, a separately built EC and sensor
encoder, and disjoint cluster ids. The earlier federation results passed only because
every participant shared one agent id and one encoder. This is the first cross-agent
transfer where that boundary exists.

The confirmatory campaign ran once, on a live Paper 1.16.5 server rather than the mock.
There were four arms of 50 receivers, each receiver seed-paired with its own donor
(95% Wilson intervals):

| Arm | First-contact raw rate | Bias-decisive rate |
|---|---|---|
| Isolated (the floor) | 0.22 [0.13, 0.35] | 0.00 [0.00, 0.07] |
| **Merged-taught (the claim)** | **0.84 [0.71, 0.92]** | **0.80 [0.67, 0.89]** |
| Merged-satiated (want-not-file) | 0.12 [0.06, 0.24] | 0.00 [0.00, 0.07] |
| Dangling-half (falsifier) | 0.12 [0.06, 0.24] | 0.00 [0.00, 0.07] |

All four gates passed:

- TRANSFERRED: 0.80 ≥ 0.70.
- ABOVE-FLOOR: 0.84 − 0.22 = 0.62 ≥ 0.20.
- WANT-NOT-FILE: 0.84 − 0.12 = 0.72 ≥ 0.20.
- BOTH-HALVES: 0.12 − 0.22 = −0.10, under the 0.10 one-sided bar.

The anti-vacuity kit also passed. The controls carry the result. The satiated donor ran
the identical schedule and feeds with its drive held at zero, so no credit was minted. Its
bundle moves a file, not a want. The dangling-half arm ships A's bias keys without the
representation they key on. The ingest report shows those keys dropped, not silently
landed. In the taught arm, 40 of the 50 first contacts were decided by the situation-keyed
learned-bias channel. The other 10, and every control choice of the target, were won by
the causal component. Those are floor-rate coincidences, not transfer.

The live world mattered. Two mock-invisible problems surfaced in a live shakedown before
any confirmatory data. `light_level` read 0 everywhere, and the original contingency slots
fused into one cluster (cosine 0.9997). Two connection races then crashed the first
campaign attempt about 88% of the way through. All four amendments were dated before the
confirmatory data.

**Re-baselined 2026-09-19 on Paper 1.20.4 (RB-1).** The campaign passed with every rate
identical to the 1.16.5 run. That is a same-seed reproduction on the new platform, not an
independent replication. One row was duplicated by an operator restart. The record
discloses it, and it moves no gate.

### R1 — a structural null: a cache, not a representation

R1 asked whether Exp 56's shared want is a representation that recurs or a cached
association. Would a want taught at one layout fire at a layout the receiver never trained
on? The mechanism answers this without a campaign. The learned-bias readout is an
exact-key lookup on `(agent, cluster, tool)`. A layout joins an existing cluster only if
its cosine to that cluster is at least 0.85. So "generalizes" and "is a genuinely
different layout" are the same 0.85 comparison with opposite signs, and they cannot both
hold. A live campaign could only re-confirm the source code.

An offline probe went through the real ingest path. The want fired at the trained layout
and collapsed at a distinct one (cosine below 0.85). It "transferred" to a one-block
perturbation only because that layout is the same cluster. The status is CACHE-CONFIRMED,
shipped as a null. This does not refute Exp 56, and it does not claim generalization is
impossible. The current readout has no channel for it. The record calls a
similarity-weighted or hierarchical read the designed remedy, and says that building one
to make R1 pass would be engineering the outcome.

### Exp 57 — pooling partial learners: faster per participant, at a total-experience cost

Exp 57 was the 1.2 scaling claim, run as its pre-registered second claim, the one that
could fail. N independent agents each learn the same contingency only partly. A lone agent
at its 20-trial budget covers a quarter of the situation. Their substrates are folded
together through the shipped merge. That merge is a convex combination, bounded above by
the largest contributor, so pooling can only win by coverage and not by louder wants. The
ladder ran once on the live apparatus: four rungs (N = 1/2/4/8) × three conditions × 20
cohorts, 9,200 rows.

- **MONOTONICITY (the primary): passed, in its robust form.** Per-agent trials to
  criterion fell 21 / 21 / 15.5 / 10.5 across N = 1/2/4/8 (Jonckheere–Terpstra permutation
  test, p ≈ 1e-4). The trend survived dropping the fully censored rungs (p ≈ 1e-4).
  Endpoint coverage widened 0.25 → 0.50 → 0.75 → 0.75. A lone agent never reached the
  3-of-4 criterion in 20 trials. An agent in a crèche of eight reached it in about 10.5 of
  its own.
- **NOT-JUST-MORE-DATA: failed.** At N = 2, 4 and 8 the crèche's total experience to
  criterion was 42, 62 and 84 agent-trials. One agent given all the trials needed 41, 46
  and about 43. The cost is the convex merge's overhead: averaging partial biases recovers
  coverage but dilutes signal.
- The noise-floor, seed-variance and anti-vacuity gates passed.

The pre-registration wrote this combination down in advance as its PARTIAL branch. On
2026-09-08 the owner decided to ship it in 1.2 as a named partial. **Never round it up.**
Collective learning here is a per-participant win, not a total-sample free lunch. The
failing gate is deliberately the strict serial sample-cost comparison. Eight agents in
parallel can still win on wall-clock time, and this gate did not measure that. Whether a
coverage-preserving fold closes the cost was named as 1.3 work, and 1.3 did not take it
up.

## Part 2 — Survival: a fear the world teaches

### The claim, stated precisely

In a live Minecraft water classroom, an agent held underwater until air-hunger pain,
then rescued, learns a fear keyed to the underwater situation. On later submersions it
leaves the water before the pain would fire ([Exp 60](/research/experiments/exp-60/),
earned, 5 seeds per arm). This is the first Maxim result whose learning signal is the
world's rather than a teacher's.

That fear, exported and ingested through the shipped export and ingest path, drives a fresh receiver out of
the water on its first loop-live submersion. The receiver has never felt the pain: 12/12
transferred receivers against 0/24 isolated ([Exp 61](/research/experiments/exp-61/),
earned, the 1.3 headline). Exp 61 is one campaign, and each receiver ingested one donor's
bundle.

An agent's own fear also carries to a second pool at a different altitude and spawn
distance: 12/12, Wilson lower bound 0.758, against 0/3 ablated
([Exp 62](/research/experiments/exp-62/) rung A, earned). A frozen benchmark prices what
the carried fear buys. About 25 s of latency, about 11 health points and about 22 s of
oxygen pain — **cost, not life** ([R3](/research/experiments/r3/), a reference; nothing
graduated).

### What it does not show

- **Extinction.** Nothing writes fear back down. Fear has no per-tick decay and decays by
  wall clock only when saved state is loaded. The record states this as a mechanism gap.
  No experiment here tests unlearning.
- **Scaling past one donor.** Each Exp 61 receiver ingested one donor's bundle, in one
  campaign. Folding several donors' fears is untested.
- **A received fear's reach to another pool.** Exp 62 measured the agent's **own** fear
  crossing pools. A fear received through a bundle has not been tested in a second pool.
- **Hive-side promotion.** Exp 61 used export and local ingest only.
- **General generalization.** Exp 62's apparatus has one discriminating world sensor,
  `is_in_water`, a binary flip. The situation space has two points. What carried is
  invariance to place, not to a changed situation. A lit pond reads 0.588 against the 0.85
  threshold, and the fear misses there.
- **Survival.** In R3 every agent in every arm survived. With regeneration on, survival is
  a declared ceiling and separates nothing.
- **The discount's size.** A received fear is discounted ×0.75 at ingest. The measures
  cannot tell 0.75 from 1.0, because both clear the threshold.
- **Dark means danger, or eating when hungry.** The dark-fear design was blocked at the
  instrument (Exp 58). Eating when hungry is prior-driven, not learned (R2).

### The experiments

| Exp | Date | Status | n per arm | Result |
|---|---|---|---|---|
| [Exp 62](/research/experiments/exp-62/) (rung A) | 2026-09-20 | earned | 12 cross / 12 same / 3 ablated | The agent's own fear carried to a second pool: 12/12 (Wilson [0.758, 1.000]) against 0/3 ablated, p = 0.0022. |
| [R3](/research/experiments/r3/) | 2026-09-18 | reference | 12 × 5 arms | Median time to air: A 28.0 s, B 8.6 s, C 3.2 s, D 3.1 s, E 28.1 s. Everyone survived, so the fear buys cost, not life. |
| [Exp 61](/research/experiments/exp-61/) | 2026-09-17 | earned | 24 isolated / 12 transferred / 12 cluster-not-fear / 24 dangling | A received fear drove 12/12 receivers out of the water, against 0/24 isolated (p = 8.0 × 10⁻¹⁰). |
| [Exp 60](/research/experiments/exp-60/) | 2026-09-16 | earned | 5 seeds (6 placements per probe) | Learned, anticipatory escape: 1.0 against 0.0 for the yoked twin, p = 1/252. |
| [Exp 58](/research/experiments/exp-58/) | 2026-09-14 | null | none (no gated data) | Blocked at the instrument: dark and safe never formed distinct clusters. |
| [R2 learned-bias v2](/research/experiments/r2-learned-bias-v2/) | 2026-09-12 | withdrawn | none | Stopped at design review. No harness and no data. |
| [R2 learned-bias v1](/research/experiments/r2-learned-bias-v1/) | 2026-09-12 | superseded | none | The design was caught confounded before any data. |
| [R2](/research/experiments/r2/) | 2026-09-07 | null | offline probe, two states | The game's drives did not move behaviour. Three breaks became the 1.3 build list. |

The subsections below run in date order.

### R2 — the premise null that became the 1.3 build list

R2 asked whether the `minecraft_player` body's world-owned drives move behaviour toward the
corrective acts: `eat` when hungry, `attack_nearest` when hurt. Those drives are health and
food, which the game drains rather than the model. On a fresh substrate, first-contact
selection has exactly one active signal, the cold-start drive prior. An offline probe
isolates that signal exactly. The prior picked the same passive sensor-read tool when
starving and hurt as when satiated. It scored that tool more strongly when healthy
(20.00) than when hurt (5.00). Behaviour moved backwards.

The record names three breaks:

1. The prior had no corrective affinity for `food` or `health`, and it name-matched the
   read tools.
2. The live body withheld credit for eating, so no learned bias could repair that.
3. The void test world offered nothing to eat and nothing to attack.

Per the rung's own stop rule, R3 and R4 did not run in 1.2. The three breaks became the
1.3 build list, rather than a benchmark back-fitted onto a premise that does not hold.

**Updated in 1.3, and still a null.** The 1.3 build closed all three breaks in
engineering terms. A deficit now derives a corrective need. The relief an action actually
produces reaches the credit path. A live survival world makes eating executable. A live
smoke run showed the three composing. That run validates the composition, not the claim,
because it reads the relief signal without booking a reward. R2 stays PREMISE-NULL.

### R2 bias v1 and v2 — the learned-bias pre-registrations (superseded, withdrawn)

- **v1** was frozen 2026-09-12. A pre-data review found its primary metric confounded, and
  it never took data. It is **superseded**.
- **v2** was drafted the same day. The design review stopped it before any harness was
  built or any data taken, so it is **withdrawn**. An offline experiment then settled the
  underlying question. Eating is selected by the innate prior and a state-blind causal
  link. The drive-relief cluster credit is a behavioural messenger, not a cause. The record
  closes the line and says no live learned-bias run is owed.

### Exp 58 — dark means danger: a null with cause, blocked at the instrument

The first 1.3 fear design tried to teach an agent that the dark is dangerous: take mob
damage in the dark, then leave the dark early. The mechanism, called Wire 4, was built and
passed its offline gates. Pain books a negative valence onto the world cluster active when
it arrives, and that valence is read back as an anticipatory threat need. Live, the write
side worked. In a dry run, fear accumulated to the −1.0 cap over all ten conditioning
episodes.

What never held was the prerequisite: the danger situation and the safe one never formed
distinct world clusters. That failure repeated with light, with depth, and with depth plus
a persistent hostile and a position gap. This is
[L11](/research/limits/#l11--the-sensor-count-discrimination-ceiling) sensor dilution,
realized live. On a 17-sensor world channel, no partial contrast clears the 0.85 threshold.
No gated data was taken, because every live run refused at the cluster-distinct preflight.

The verdict is NULL-WITH-CAUSE, instrument-blocked. A correction dated 2026-09-16 narrows
what the dry run showed. The "flee up the staircase" was the harness's own actuation check,
not the agent loop. The loop's read-and-act path was never demonstrated live on this line.
The cue was swapped to water for Exp 60, because water does separate.

### Exp 60 — learned drowning avoidance from the game's own pain

Water separates because of a binary `is_in_water` sensor. The underwater situation is
then its own cluster before any pain arrives (the run-authorizing cosine was 0.787). An
`oxygen` drive makes air-hunger publish pain, and an `escape_water` actuator bypasses the
pathfinder, which does not work in water.

The protocol was frozen 2026-09-15. Five FEAR agents were held underwater until
air-hunger pain, then rescued, for 10 usable episodes each. Five yoked ABLATED twins had
the same water, pain, episodes, actuator and loop, with only the fear subscriber detached.
Each post-training probe used six pain-free placements.

All five gates passed:

- FEAR post-training median P(surface before the pain) was **1.0**, from 0.0 before
  training, on every seed.
- ABLATED stayed at **0.0**, with zero executor calls in 30 of 30 placements.
- Exact permutation test, p = 1/252 = 0.0040. That is the floor for five against five.
- Specificity held on every seed: water fear −1.0, shore fear 0.0.

Median latency to air was 1.72 s. That is inside the 4.34 s window before pain, and a
median 3.4 s before the agent's own air-hunger pain would have fired.

- **Caveat, as recorded.** After a seed's first escape, `escape_water` also carries a
  positive causal link. Placements two to six therefore read fear plus that link. The
  fear-only read is the first post-training placement per seed. All 5 of those surfaced,
  at 2.9–3.3 s.
- **Run 1 was the instrument's null.** The first run was INCOMPLETE and executed zero
  actions in 54 placements. Four instrument causes were measured and fixed before run 2,
  none touching the substrate. The harness loop had been running at an autonomy level
  that never executes a body action.

### Exp 61 — a learned fear transfers between independent agents

The 1.3 headline is the 1.2 transfer moved from a want a teacher installed to a fear the
world taught. Donors learned the fear by the Exp 60 protocol and exported their substrate
through the real CLI, unsigned — the harness is Exp 56's (corrected 2026-09-27; the 1.3.0
notes said "signed-bundle path").
A fresh receiver ingested it through the real CLI, discounted ×0.75 at the ingest bound,
since a fear you were told about is real but weaker than one you felt. The receiver then
rebooted and met the water. Its lifecycle first submerges it once with the loop **off**,
at a representation gate. "First loop-live submersion" means the next one.

The campaign ran once at one code hash: 121 rows, zero refusals.

| Arm | n | First-contact escape |
|---|---|---|
| Isolated | 24 | 0/24 |
| **Transferred fear** | 12 | **12/12** (Wilson [0.758, 1.0]) |
| Cluster-not-fear: the ablated donor's cluster and percept valence ship, no fear | 12 | 0/12 |
| Dangling: the fear ships without its world node | 24 | 0/24 |

All six gates passed. Transferred against isolated: Fisher one-sided p = 8.0 × 10⁻¹⁰.
Transferred against cluster-not-fear: p = 3.7 × 10⁻⁷. In every dangling ingest the fear
was dropped for want of its node. Before any loop ran, the loop-off gate read the
discounted fear (−0.75) exactly on all 12 receivers. The three control arms made zero
executor calls in 60 of 60 windows.

Transferred receivers reached air at a median 3.14 s, about 1.9 s before the pain edge.

- **Not earned:** extinction, scaling past one donor, a received fear's reach to another
  pool, and hive-side promotion.
- The pain edge was not re-measured on campaign day. It was read from Exp 60's apparatus
  record.

### R3 — what a carried drive is worth: cost, not life

R3 is an instrument and a frozen baseline. It is a **reference**, and nothing graduated.
Five arms of 12 fresh agents each got one unrescued submersion on a depth-calibrated,
frozen gauntlet: 60 events at one hash.

| Arm | What it carries | Median time to air |
|---|---|---|
| A | the innate health reflex only | 28.0 s |
| B | learns the fear there, in the water | 8.6 s |
| C | carries a fear it learned earlier | 3.2 s |
| D | carries a fear it received (the Exp 61 receiver) | 3.1 s |
| E | the same pain exposure as C, fear subscriber detached | 28.1 s |

Every agent in every arm survived, 12/12 everywhere. With regeneration on, survival is a
declared ceiling. What the carried fear buys is the cost it removes: about 25 s of
latency, about 11 health points and about 22 s of oxygen pain. **Cost, not life.**

- **E ≡ A.** Exposure without the subscriber buys nothing.
- **D ≡ C** (p 0.84). The argmax makes the two structurally identical, so the record
  reports them side by side and never contrasts them as the discount's price.
- C, B and E each separate completely from A or from each other on 12 against 12.
  Mann–Whitney gives p = 3.7e-5 by normal approximation; the exact p is 7.4e-7.

**The frozen report read INCOMPLETE on two instrument rules.** A code-hash rule could not
be satisfied by any bench, because the calibration's own data merge advances main. A
tick-period band, calibrated on 28-second events, measured the loop's phase rather than its
cadence on 3-second ones. Both rules were amended after the data, instrument-only, and
reviewed by two independent lenses. The amended report reads COMPLETE, and both reports
are published side by side.

The frozen band had been refusing the carried-fear arm's fastest rows. Restoring them
moved C's median 0.10 s, in the claim's own direction. A 2026-09-19 erratum corrected the
amendment's first account of that direction. The amendment rests on the instrument
argument, not on the rows' outcomes.

### Exp 62 — a learned fear carries to a second pool (rung A)

Exp 62 ran the day after 1.3.0 shipped, on the shipped body, with no mechanism change, no
new sensor and no ingest. Agents that learned the fear in pool 1 (floor y 35) were tested
in pool 2 (floor y 90, a different distance from spawn). The pools were the same
sealed-shell class, with the same frozen day and the same depth. The campaign produced 27
rows at one code hash, with zero refusals.

| Arm | n | First contact | Wilson 95% |
|---|---|---|---|
| Cross-pool (train pool 1, test pool 2) | 12 | **12/12** | [0.758, 1.000] |
| Same pool (train and test pool 1) | 12 | 12/12 | [0.758, 1.000] |
| Cross-pool, fear-ablated | 3 | 0/3, zero executor calls | [0.000, 0.561] |

All five frozen gates passed. Cross-pool against ablated: Fisher one-sided p = 0.0022.
**The interval is the number, not p and not "100%".** Both fear arms sit at the ceiling
by design, so the cross-pool arm reads as at least 0.758. The two arms' latency intervals
overlap, so there is no evidence the second pool is slower. The ablated agents resolved to
the **same** node with fear 0. The contrast is therefore the fear alone, with the
representation held identical. A committed offline replay predicted the cross-pool cosine
(0.9992), and the live run agreed.

This is the agent's **own** fear. A received fear's reach to another pool is untested.
With one binary discriminating sensor, what carried is invariance to place, not to a
changed situation. The context wall stands, and it was measured: a lit pond reads 0.588
against the 0.85 threshold.

**Corrected 2026-09-25
([#899](https://github.com/dennys246/Maxim/issues/899)).** The record first reported a
"night pool" reading of 0.799 as a miss at night. That reading was taken at
`time_of_day` 0.99, the minute before the clock wraps, and the body encodes the circular
clock as a straight line. At the fear's pool, midnight reads 0.903, inside the key. The
fear misses only at time ≈ 0.94–0.99, roughly the last 5% of each in-game day. The
frozen-day protocol hides this. The lit-pond miss (0.588) is unaffected and stands. No gate,
number or verdict changed. See [Engrams](/memory/engrams/#its-two-limits).

Rung B — the context wall and what crossing it would take — is **designed, not built**.

## Bounds

- **[L11](/research/limits/#l11--the-sensor-count-discrimination-ceiling), sensor-count
  dilution.** This limit blocked Exp 58 outright. It shaped Exp 56, where Amendment 2
  moved the contingency slots after a live shakedown found them in one cluster, and it is
  why Exp 60 needed a binary full-swing cue. Any situation engram here is only as specific
  as the world channel lets it be.
- **L12, the name-keyed drive prior** (see [limits](/research/limits/)). Exp 56 and 57
  used opaque tool and drive names and gated `score_components["drive"] == 0`, so that
  channel could not pay off there. In the survival line the fear reaches action through
  that affinity table. That is why `flee` fires first on every first contact and fails
  fast in water before `escape_water`. R3 measured that tie-break at about 0.77 s.
- **Exact-key read (R1).** It bounds every transfer on this page. A different situation is
  a different key.
- **The daily clock wrap
  ([#899](https://github.com/dennys246/Maxim/issues/899)).** The earned fear misses in
  roughly the last 5% of each in-game day. Encoding the clock without a wrap is owned by
  the 1.4 keying work.
- **No fear extinction mechanism.** Nothing writes fear down. A received fear holds
  unchanged for the session and decays by wall clock only on load.
- **Sample sizes.** Exp 60 had 5 seeds per arm. Exp 61 and Exp 62 had 12 in the claim
  arm, and their ceiling results should be read by the Wilson lower bound (0.758).
- **Re-run triggers named in the records.** Exp 56 and 57 re-run on any change to the
  ingest adapter or `substrate_merge`, the world-cluster credit routing,
  `recommend_action`'s cluster read, the world-channel encoder, their bodies, or the
  bridge protocol, plus a minor-version heartbeat. R1 becomes a live experiment if a build
  adds a cross-cluster generalization channel. Exp 60 re-runs on changes to the fear write
  or read, the `minecraft_player` sensor ranges, `escape_water`, or the loop's idle and
  autonomy handling. R3 names its numbers to re-run against — A 27.995 / B 8.575 /
  C 3.180 / D 3.131 / E 28.084 s — on any change touching Wire 4, the innate reflex, the
  NAc credit path or the loop cadence.

## What came next

The open question both parts leave is the same: transfer is shown, generalization is
not. Crossing a changed situation — a lit pond, or a different layout — needs a graded,
similarity-weighted read at the cluster boundary. That is Exp 62 rung B's design and the
working direction of the 1.4 roadmap, not a result. See
[Engrams](/memory/engrams/) for the mechanism and its open items, the
[evidence ledger](/research/evidence/) for how these claims sit beside the rest, and the
[experiments index](/research/experiments/) for everything else in both lines.
