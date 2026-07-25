---
title: Suprachiasmatic nucleus
description: Maxim's clock — temporal indexing that gives every memory a multi-scale time address, plus a coupled-oscillator network that learns recurring rhythms.
---

The suprachiasmatic nucleus (SCN) is the part of Maxim's bio-inspired cognitive
architecture that answers *when*. Every other memory system stores content: the
[Hippocampus](/systems/hippocampus/) holds episodes, the
[ATL](/systems/anterior-temporal-lobe/) holds concepts, the
[NAc](/systems/nucleus-accumbens/) holds causal links. The SCN holds none of
them. It holds a set of indices from time-of-day, day-of-week, week-of-month and
month-of-year onto memory IDs, so that "what usually happens around 9am?" is a
set lookup instead of a scan.

Two things live under the name. The first is plain bookkeeping — bins and
signatures — and it does exactly what it looks like. The second is an optional
Kuramoto-style coupled-oscillator network that learns how the four timescales
relate, and it is more speculative: it produces a coupling matrix, a coherence
number and an anomaly score, and one of its downstream consumers is currently
dormant. Both are described honestly below, and the line between them matters,
because the bins are load-bearing in production while the oscillator is mostly
an enrichment signal.

The code lives in `src/maxim/time/`. State persists to
`~/.maxim/util/scn_state.json` and clears with `maxim --clear-memory scn`.

## What it does

Give the SCN a memory ID and a timestamp and it does two things: it records a
`TemporalSignature` for that memory, and it drops the ID into four bins. Later
you can ask for every memory registered in a given hour bin, day bin, week bin
or month bin, or intersect several of those, or ask for everything near a given
signature. That is the whole contract of the indexing half.

The value is that time becomes a retrieval key that costs nothing to maintain.
The Hippocampus does not have to sort by timestamp, the
[EC](/systems/entorhinal-cortex/) does not have to embed a clock into its
similarity space, and consolidation gets a cheap way to notice that eleven
memories all belong to "Tuesday morning" and only one of them needs to survive.

What it is *not*: a scheduler, a calendar, or a source of truth about durations.
It stores phases and bin membership, not intervals, and it never triggers
anything on its own.

## How it works

### TemporalSignature

A signature encodes one timestamp at four scales at once, each normalised to a
phase in `[0.0, 1.0]`, plus the raw Unix timestamp as an absolute reference.

```python
from maxim.time import TemporalSignature
import time

sig = TemporalSignature.from_timestamp(time.time())
sig = TemporalSignature.now()          # convenience

sig.circadian_phase   # 0.0-1.0  midnight = 0, noon = 0.5
sig.weekly_phase      # 0.0-1.0  Monday 00:00 = 0
sig.monthly_phase     # 0.0-1.0  1st = 0, ~15th = 0.5
sig.annual_phase      # 0.0-1.0  Jan 1 = 0, July 1 ≈ 0.5
sig.timestamp         # Unix timestamp
```

Because phases are cyclic, comparison uses `circular_distance`, which knows that
0.95 and 0.05 are 0.1 apart rather than 0.9. `sig1.similarity(sig2)` blends all
four phases and takes optional weights `(circadian, weekly, monthly, annual)` —
so you can ask "similar time of day, don't care about the season" by weighting
circadian up.

`sig.to_bins()` converts a signature into the four integer bin indices used by
the index.

### The bins

The bin scheme is fixed, and small on purpose:

| Index | Bins | Purpose |
| --- | --- | --- |
| Circadian | 24 hourly | Time-of-day patterns |
| Weekly | 7 daily | Day-of-week patterns |
| Monthly | 4 weekly | Week-of-month patterns |
| Annual | 12 monthly | Seasonal patterns |

Forty-seven bins in total. Each one is a `BoundedBin` — a capacity-managed set
with a default `max_size` of 200. When a bin fills, the least significant entry
*from the older half* is evicted, which keeps a full bin from freezing out new
material while still protecting recent entries from a single high-significance
outlier. Entries carry `(memory_id, significance, registered_at)`, and the bin
exposes a set-compatible interface (`in`, `len`, `set()`, `&`), which is why
multi-criteria queries can just be intersections.

```python
from maxim.time import SCN, TemporalSignature

scn = SCN()
sig = TemporalSignature.from_timestamp(memory.timestamp)
scn.register("mem_123", sig, significance=0.8)

morning       = scn.query_hour(9)
mondays       = scn.query_day(0)
first_week    = scn.query_week_of_month(0)
june          = scn.query_month(5)              # 0 = Jan

tuesday_9am   = scn.query_hour(9) & scn.query_day(1)
tuesday_9am   = scn.query_intersection(hour=9, day=1)   # equivalent

nearby        = scn.query_similar_time(sig, tolerance=1)
patterns      = scn.find_rhythmic_patterns(min_occurrences=5)
```

`find_rhythmic_patterns()` is the honest version of "pattern detection": it
returns, per rhythm type, the bins whose population exceeds a threshold —
`circadian bin 9: 23 occurrences`. It is a histogram, not an inference.

For cold start there are temporal priors, registered one hour bin at a time:
`scn.add_temporal_prior("morning_greeting", hour_bin=8)`.

**Storage cost.** The repo documents this figure directly, and it is worth
quoting because it is the reason the SCN is cheap enough to always run: for
10,000 memories the index is 47 bins, roughly 213 memories per bin on average,
and about **500 KB total**, because bins hold shared references to memory IDs
rather than copies of memories. Persistence is a JSON file (format v3.0, with
loaders for v1.0 and v2.0 where bins were plain string IDs).

## Rhythm learning

The optional half. `scn.enable_oscillator()` attaches an `OscillatorNetwork`
alongside the bins — it does not replace them, and every `register()` feeds
both. The production stack builder (`build_bio_stack`) enables it; the class
itself does not, so a bare `SCN()` is bins-only.

Four oscillators stand for the four timescales, with natural frequencies set
from their periods:

| Oscillator | Period | ω |
| --- | --- | --- |
| Circadian | 1 day | 1.0 |
| Weekly | 7 days | 1/7 |
| Monthly | 30 days | 1/30 |
| Annual | 365.25 days | 1/365.25 |

Phases evolve under Kuramoto dynamics, and the coupling matrix between them is
learned by a Hebbian rule:

```
dθ_i/dt = ω_i + (K/N) Σ_j W[i][j] * sin(θ_j - θ_i)    (Kuramoto dynamics)
ΔW[i][j] = η * cos(θ_i - θ_j)                          (Hebbian learning)
```

with `ω_i` the natural frequency of oscillator `i`, `K` the global coupling
strength (default 0.1), `N = 4`, and `W` the learned 4×4 coupling matrix. The
learning rate is `η = 0.01`, weights decay by `0.999` per step and are bounded
to `[-0.5, 2.0]`. Co-active oscillators (similar phases, `cos ≈ 1`) strengthen
their coupling; anti-phase oscillators (`cos ≈ -1`) weaken it.

Each observation also nudges the phases toward the observed signature, damped by
experience:

```
blend = max(0.1, 1 / (1 + 0.01 × observation_count))
```

Early on `blend ≈ 1.0` and the model follows the data; after ~1000 observations
`blend ≈ 0.1` and it resists disruption.

What this actually produces is four numbers and a matrix, read out through:

- `phase_coherence()` — the Kuramoto order parameter, `r ∈ [0,1]`, a measure of
  how synchronised (how "settled") the temporal model is. `None` if the
  oscillator is disabled.
- `coupling_strength(i, j)` — the learned weight between two scales.
- `temporal_anomaly_score(sig)` — circular distance between predicted and
  observed phase, `0.0-1.0`.
- `predict_next_occurrence(target_hour=14.0)` — forward-simulates the dynamics
  without mutating state, returning hours until the target phase.
- `coupling_eigenvalues()` — eigenvalues of `W`; the dominant one indicates the
  strongest learned rhythm.

The stated intent is that concepts like "Monday mornings" emerge as coupling
between circadian and weekly oscillators rather than as an intersection of two
lookups. That is the design rationale; what the code demonstrably yields today
is the coupling matrix and the four scalars above, which feed enrichment and
scoring elsewhere rather than driving behaviour directly.

Separately, the oscillator tracks per-event-type circadian phases (ring buffer
capped at `max_event_phases = 50`) so that repeated events at consistent times
register as imminent:

```python
scn.observe_event("tool:sword_slash", TemporalSignature.now())
scn.get_anticipatory_signatures(min_imminence=0.5)
# {"tool:sword_slash": 0.83}
```

One caveat stated plainly in the repo: the consumer of this,
`TemporalCreditDistributor.anticipatory_pre_activate()`, has been **dormant
since 2026-05-26**. It is implemented, and would prime NAc eligibility traces
for predicted events at `anticipatory_weight = 0.2`, but no per-tick caller is
wired in the production loop. Treat anticipation as available machinery, not as
running behaviour.

## Sleep and consolidation

The SCN's main job during consolidation is clustering. `Hippocampus.sleep_with_clustering()`
calls `scn.get_all_clusters()` to group memories by `(hour, day)` temporal
cluster and then keeps only the best representative per cluster — this is the
primary SCN → consolidation path. It is also why `TemporalAwareStrategy`, the
eviction strategy used when the SCN is connected, boosts *sole representatives*:
a memory that is the only witness to its time slot is worth more than one of
twenty near-duplicates.

Around that, four smaller couplings:

1. **Registration.** `MemoryHub.on_percept_received()` registers each captured
   memory's signature with its salience as the significance score.
   `TemporalCreditDistributor.record_event()` registers temporal events for bin
   indexing too.
2. **Staging metadata.** After each goal, `ExecAgent._evaluate_staging()` reads
   the current signature and attaches circadian/weekly/monthly/annual phase data
   plus the oscillator anomaly score to the staging sidecar JSON. It does *not*
   register anything in the SCN.
3. **Deletion.** When consolidation removes a memory, the `_on_memory_deleted`
   callback chain calls `SCN.remove_memory(memory_id)` so the index does not
   accumulate dangling IDs.
4. **Eviction.** `BoundedBin` caps growth independently of anything the
   Hippocampus does.

## How it connects

```
      percept ──► MemoryHub.on_percept_received()
                       │  register(memory_id, sig, significance=salience)
                       ▼
   ┌──────────────────────────────────────────────┐
   │                    SCN                       │
   │  BIN INDICES (always on)   OSCILLATOR (opt.) │
   │  24 hour / 7 day           phases[4]         │
   │  4 week / 12 month         coupling[4x4]     │
   │  query_hour/day/month      phase_coherence() │
   │  get_all_clusters()        anomaly_score()   │
   └───────┬───────────────────────────┬──────────┘
           │                           │
   sleep_with_clustering()      anomaly / phase context
           ▼                           ▼
     Hippocampus                StatisticianAgent ─► ATL
   (keep best per cluster)      (Angular Gyrus / IPS)
```

- **[Hippocampus](/systems/hippocampus/)** — every captured episode gets a
  temporal address here, and sleep clustering hands the Hippocampus its
  representatives. Deletions flow back the other way.
- **[ATL](/systems/anterior-temporal-lobe/)** — the semantic layer has a typed
  relationship for exactly this: `PHASE_LOCKED_TO`, asymmetric, as in
  `"success_rate" PHASE_LOCKED_TO "circadian"` with `phase` and `coupling` in
  the relationship metadata. Rhythms the SCN surfaces can be promoted into
  durable semantic structure rather than staying in the index.
- **[Angular Gyrus](/systems/angular-gyrus/)** — shares the pure-Python linalg
  module (no numpy, because Maxim runs on embedded hardware); the oscillator's
  `coupling_eigenvalues()` uses `linalg.eigenvalues_symmetric`. In the other
  direction the StatisticianAgent takes SCN temporal context as an input,
  raising an analysis suggestion's priority by 0.15 when `temporal_anomaly > 0.5`.
- **[NAc](/systems/nucleus-accumbens/)** — the target of anticipatory
  pre-activation, currently dormant as noted above.
- **CrossLayerGraph** — SCN → memory edges are typed `TEMPORALLY_CORRELATES`.
- **MemoryHub** — the coordinator that owns all of this wiring; see
  [Systems overview](/systems/overview/) for the full routing picture and
  [Memory systems](/memory/overview/) for consolidation policy.

## Going deeper

- [Systems overview](/systems/overview/) — how the hub wires the subsystems together
- [Memory systems](/memory/overview/) — tiers, decay, consolidation
- [Architecture](/concepts/architecture/) — the agent pipeline above the substrate
- [`docs/time.md`](https://github.com/dennys246/Maxim/blob/main/docs/time.md) — the full SCN, TemporalSignature and oscillator reference
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md) — MemoryHub integration points
- [Math cognition](https://www.dennyschaedig.com/maxim/math-cognition) — Kuramoto derivation, linalg module, StatisticianAgent integration
