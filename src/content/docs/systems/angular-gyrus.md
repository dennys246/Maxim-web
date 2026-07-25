---
title: Angular gyrus
description: Maxim's mathematical and statistical cognition — a fast approximate path for screening data and a precise symbolic path for confirming it, plus the StatisticianAgent that turns event streams into ranked analysis guidance.
---

Maxim is a bio-inspired cognitive architecture, and the Angular Gyrus is the
part of it that deals with numbers. It answers two different kinds of question.
The cheap one is *"is there something in this data?"* — asked constantly, on
every metric, in microseconds. The expensive one is *"what exactly is it, and
have I seen it before?"* — asked rarely, only when the cheap answer is
inconclusive.

The split borrows from human numerical cognition, which runs on two systems: the
intraparietal sulcus (IPS) gives an instant approximate magnitude sense — you
know 47 is "about 50" without computing anything — while the angular gyrus
handles exact arithmetic and symbolic fact retrieval, which is why 47 × 13 = 611
takes work. Damage to one leaves the other intact. Maxim implements both and
lets them collaborate.

The module lives at `src/maxim/math/` in the `pymaxim` package (imported as
`maxim`).

## How it works

### The fast path: IPS

The IPS runs every analysis cycle (roughly every 5 seconds) and handles about
90% of cases — the ones that are clearly random or clearly patterned. It exposes
three assessments:

- **`assess_randomness`** — "is there a pattern here?" This is the core
  capability, and it combines two independent statistical tests. The
  **Wald-Wolfowitz runs test** converts values to binary (above/below median)
  and counts consecutive runs: too few runs means values cluster on one side
  (trending), too many means they alternate (cyclic), the expected number means
  no structure. **Lag-1 autocorrelation** measures serial dependence and catches
  what the runs test misses — high positive values persist (clustering), high
  negative values alternate (oscillation), near zero is independent.
- **`detect_trend`** — "which way is it going?" Linear regression for direction
  and magnitude; returns direction, slope, and confidence.
- **`detect_anomaly`** — "is this value unusual?" Rolling mean and standard
  deviation against an established baseline, to catch sudden regime changes.

The two tests combine into a single `pattern_confidence` score from 0.0
(definitely random) to 1.0 (definitely patterned), which drives classification
into RANDOM (confidence < 0.4), TRENDING (runs *z* < −1.96), CYCLIC (runs *z* >
1.96), or CLUSTERING (|autocorrelation| > 0.3).

### The slow path: Angular Gyrus

The Angular Gyrus proper is invoked only when IPS confidence lands in the
ambiguous 0.3–0.65 band. It is both a computation engine and a *memory* — it
implements the `MemoryLayer` protocol alongside the Hippocampus and ATL, storing
learned mathematical knowledge as persistent `MathMemory` records connected by
an associative graph. Recalling "linear regression" also activates "R²",
"slope", and related patterns via spreading activation.

Records fall into five categories:

| Category | What it holds |
| --- | --- |
| `FACT` | Known constants and relationships, recalled without recomputation |
| `RELATIONSHIP` | Proportional or causal links between quantities |
| `METHOD` | Multi-step algorithms — higher-order than formulas |
| `CONSTANT` | Named numerical values, seeded at startup, never expiring |
| `PATTERN` | Learned statistical patterns, created by the StatisticianAgent via IPS→AG escalation |

Alongside memory it exposes four matrix operations — multiplication, symmetric
eigenvalue decomposition, linear-system solving, and determinant — each
returning an `ExactResult` that carries *both* a verbal natural-language
rendering and a Python code snippet, mirroring the way the biological angular
gyrus bridges language and computation.

`MathTool` accepts natural-language operation names and normalises them before
routing, so an agent can say `sqrt 25` rather than `compute(power, [25, 0.5])`.
The alias set covers square and cube roots, squaring, cubing, and factorial. The
full alias table and method signatures live with the code — see [Going
deeper](#going-deeper).

### Math before the LLM

For simple arithmetic, Maxim answers before the language model is ever called.
Regex evaluators in the `LLMWorker` intercept two shapes: binary arithmetic
(`"what is 1+1"` → `1 + 1 = 2`; `"10 / 0"` → division by zero) and unary
operations optionally followed by a trailing binary op (`"square root of 25
plus 3"` → `√25 + 3 = 8`; `"8 cubed"` → `8³ = 512`).

The rationale is correctness first and cost second. An LLM asked to multiply is
guessing at a token sequence; a regex plus Python's arithmetic is not. Skipping
inference on these queries also costs nothing and returns instantly. The same
path doubles as a timeout fallback — if the LLM times out on what turns out to
have been a simple math question, the user gets the right answer instead of a
generic "I'm not sure."

## The StatisticianAgent

The StatisticianAgent watches the AgentBus for `ToolResult` and `GoalCompleted`
events and builds a per-metric time series from them. Each tracked metric gets
its own `PatternDetector`: a finite state machine that progresses from "I don't
know yet" to "there is definitely a pattern here" — or to "this is noise."

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  OBSERVING ──(confidence > 0.4)──> PATTERN_FORMING                       │
│       │                                    │                             │
│       │              ┌─(sustained > 0.65)──┤                             │
│       │              │                     │                             │
│       │              ▼                     │──(uncertain 8 steps)──>     │
│       │     CONFIRMED_PATTERN              ESCALATED_TO_AG               │
│       │     (publish insight)              (precise R², autocorr)        │
│       │     (store in AG memory)           (recall AG memory)            │
│       │                                    │                             │
│       │                                    ├──(R² > 0.5)──> CONFIRMED    │
│       │                                    └──(R² < 0.2)──> RANDOM       │
│       │                                                                  │
│       └──(50+ obs, confidence < 0.3)──> CONFIRMED_RANDOM                 │
│                                       (reduce monitoring)                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

OBSERVING needs at least 15 observations before the IPS runs its first
assessment. ESCALATED_TO_AG is reached only after 8 consecutive uncertain steps.
CONFIRMED_RANDOM drops monitoring to every 10th observation but can re-enter
OBSERVING if new data shows structure.

Escalation itself is a three-step process, and this is where the dual system
actually integrates. First the Angular Gyrus checks its own memory — "have I
seen this?" — recalling with `category=PATTERN`; a match on the same metric and
trend direction fast-tracks confirmation and reinforces the record. Otherwise it
runs a full linear regression via `analyze("linear")` for exact R² and
autocorrelation confidence intervals. Then it stores (R² > 0.5), rejects
(R² < 0.2), or stays escalated and retries. If a stored pattern later breaks,
its confidence is reduced by a factor of 0.7 and it may be compressed or
removed.

### Ranked analysis suggestions

Rather than telling the LLM to "investigate patterns," the StatisticianAgent
generates specific suggestions. This stage is entirely deterministic — no model
involved. It infers a `MetricDataType` per metric by naming convention first and
value distribution as fallback (BINARY for `*:success`/`*:fail` or values ⊆
{0, 1}; RATE for `*rate*`/`*ratio*` or values in [0.0, 1.0]; LATENCY for
`*latency*`/`*duration*` or non-negative values > 1.0; CONTINUOUS otherwise).
It then crosses FSM state against data type in a fixed decision matrix:
PATTERN_FORMING yields `assess_randomness` / `anomaly` / `trend` at priority
0.5, ESCALATED_TO_AG yields `analyze linear` at 0.8, CONFIRMED yields
`recall_memory` or `analyze` at 0.6, and OBSERVING and RANDOM yield nothing.
Temporal context from the SCN oscillator adds +0.15 when `temporal_anomaly`
exceeds 0.5.

Each `AnalysisSuggestion` carries metric, tool call, operation, rationale,
priority, inferred data type, and FSM state. The top 5 ride along with each
`StatisticalSummary`.

## Running without NumPy

Both the Angular Gyrus matrix operations and the SCN oscillator sit on
`maxim.math.linalg`, a pure-Python linear algebra module with no NumPy
dependency. The reason is deployment target: Maxim is meant to run on embedded
hardware where heavyweight numerical libraries aren't available, and a hard
NumPy requirement would rule those platforms out. The types are plain lists —
`Vec = list[float]`, `Mat = list[list[float]]`, row-major.

It is 25 functions across five categories: vector operations (7), matrix
construction (3), matrix operations (7), solvers (5), and utilities (3). Doing
this in pure Python on small matrices means numerical stability has to be
deliberate, so the module uses partial pivoting in Gaussian elimination to
prevent amplification from small pivots, Householder QR decomposition rather
than Gram-Schmidt, Wilkinson shifts to avoid slow eigenvalue convergence on
nearly-equal eigenvalues, and explicit tolerance constants — `1e-12` for
singularity detection, `1e-15` for zero-vector guards.

The full function reference is code-adjacent and belongs with the code; it is
not reproduced here. See the [`maxim.math` module in the
repository](https://github.com/dennys246/Maxim/tree/main/src/maxim/math).

## How it connects

The math framework is wired into the core loop rather than sitting off to one
side.

- **[SCN](/systems/suprachiasmatic-nucleus/)** — the coupled oscillator network
  is the flagship consumer of `linalg`. Kuramoto phase evolution is a coupling
  matrix times a phase vector, and `coupling_eigenvalues()` uses
  `linalg.eigenvalues_symmetric` to find the dominant learned rhythm. Without
  the module this would require NumPy. Traffic runs the other way too: SCN
  temporal anomaly scores adjust suggestion priorities.
- **[ATL](/systems/anterior-temporal-lobe/)** — the StatisticianAgent is a
  `PromotionSource`. Confirmed patterns become ATL semantic concepts via the
  `SemanticPromoter`, with cross-layer edges back to the AG records that
  produced them, attached as `MathContextEntry` enrichment.
- **MemoryAgent** — subscribes to `StatisticalSummary` and populates
  `StructuredContext.statistical_context`, `active_pattern_count`, and
  `statistical_suggestions`, which the LLM sees during goal proposal.
- **ExecAgent and LLMWorker** — consume the ranked suggestions directly, so the
  prompt carries `math assess_randomness on tool:navigate:success [binary]`
  instead of generic advice. ExecAgent takes up to 3.
- **`MathTool`** — the agent-facing surface. IPS operations (compare, trend,
  anomaly) and Angular Gyrus operations (compute, analyze, mat_multiply,
  eigenvalues, solve_system, determinant) route through it, with alias
  normalisation and PEMDAS decomposition guidance for multi-step expressions
  using `store_value`/`recall_value` for intermediates.

For where this sits relative to everything else, see the [systems
overview](/systems/overview/), [architecture](/concepts/architecture/), and
[memory systems](/memory/overview/), plus the sibling pages for the
[Hippocampus](/systems/hippocampus/), [EC](/systems/entorhinal-cortex/),
[NAc](/systems/nucleus-accumbens/), [Cerebellum](/systems/cerebellum/), and
[Fear circuit](/systems/fear-circuit/).

## Going deeper

- [Math & Statistical Cognition](https://www.dennyschaedig.com/maxim/math-cognition)
  — the original long-form guide, including the SCN oscillator maths and a
  worked end-to-end example
- [`maxim.math` in the repository](https://github.com/dennys246/Maxim/tree/main/src/maxim/math)
  — the canonical `linalg` function reference, `MathTool` aliases, and method
  signatures
- [`docs/memory.md`](https://github.com/dennys246/Maxim/blob/main/docs/memory.md)
  — the Angular Gyrus as a memory layer among the others
