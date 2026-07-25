---
title: Architecture
description: How Maxim's layered agent pipeline, biological memory systems, and safety circuits fit together into one cognitive architecture.
---

Maxim's cognitive components don't exist in isolation. They're woven into a bio-inspired cognitive architecture where LLM-powered agents make decisions informed by biological memory, attention, and learning systems. This page explains how the pieces fit together.

## The Layered Architecture

Maxim enforces strict one-way dependencies. Higher layers can call lower layers, but never the reverse. This prevents circular reasoning and ensures clean separation of concerns:

```
Agents        Goal reasoning, intent generation (NO side effects)
   ↓
Planning      Plan generation and refinement (NO execution)
   ↓
Decision      Action selection and arbitration (NO memory mutation)
   ↓
Runtime       Agentic orchestration loop
   ↓
Executor      Tool invocation and motor control
   ↓
Environment   World observation (NO side effects)
   ↓
Memory        Storage and retrieval (NO decision making)
```

## The Agent Pipeline

Five specialized agents work in the pipeline, each with a distinct role.

### PerceptionAgent

Observes raw input from the environment. Classifies objects, computes salience and novelty scores. Outputs a *Percept*: a normalized, classified observation ready for higher processing.

**Inspired by the visual cortex and sensory processing pathway.** The PerceptionAgent mirrors how the brain transforms raw sensory data into meaningful representations. In biological vision, photons hitting the retina are meaningless — it takes a cascade of increasingly abstract processing stages before you "see" a coffee mug. The PerceptionAgent implements this same progressive construction: raw pixels become detections, detections become classified objects, and classified objects become a structured Percept with salience and novelty scores attached.

- **V1/V2 (Primary Visual Cortex) → Feature Extraction.** V1 neurons detect edges, orientations, and basic spatial frequencies — the raw building blocks of vision. The PerceptionAgent's vision model (RTMDet-m by default, with YOLOv8 available as an optional extra via `pip install "pymaxim[yolo]"`) performs the analogous step: detecting object classes in every frame — extracting bounding boxes, confidence scores, and class labels from raw camera input. Like V1, neither system "understands" what it sees at this stage — it just detects structure. Downstream salience filtering decides what reaches awareness.
- **Ventral Stream ("What" Pathway) → Object Classification.** The ventral stream flows from V1 through V4 to the inferotemporal cortex, progressively building object identity — from edges to textures to shapes to "that's a mug." The PerceptionAgent's classification step mirrors this hierarchy: raw detections are matched against known categories, assigned class labels, and enriched with contextual metadata before being passed upstream.
- **Dorsal Stream ("Where" Pathway) → Spatial Awareness.** The dorsal stream flows to the parietal cortex, computing spatial relationships and motion. The PerceptionAgent's AttentionNetwork implements this: tracking *where* objects are in a spatial grid, how spatial coverage has changed, and which regions remain unexplored. This is why the robot can balance exploitation (looking at known objects) with exploration (scanning unvisited areas).
- **Salience Network (Anterior Insula + ACC) → Importance Filtering.** The brain's salience network acts as a gatekeeper, deciding which stimuli deserve conscious attention. A snake in peripheral vision triggers it; a familiar chair doesn't. The PerceptionAgent's SalienceNetwork computes the same filter: instance novelty decays over 30 seconds, class-level novelty habituates as more unique instances of a category are seen (the 20th chair is less novel than the first cup), recency fades over 5 seconds, interest labels provide a 1.5x salience boost, and the SalienceMemoryBridge adds learned importance from past interactions.

The key insight: perception isn't passive recording — it's active construction. The brain doesn't upload reality; it builds a model of what matters right now. The PerceptionAgent does the same. Its output Percept isn't "everything the camera saw" — it's a curated, scored, attention-weighted snapshot of what's relevant. Most sensory data is discarded, just as in biological vision.

### MemoryAgent

The bridge between perception and decision. Doesn't store memories itself — it delegates that to the Hippocampus. Instead, it decides *what's important*, *what's relevant*, and builds the *StructuredContext* the LLM uses to reason. New observations are held in a staging area before being committed to long-term storage. This is where biological memory systems (Hippocampus, SCN, NAc, EC) integrate with the agent loop.

**Inspired by the medial temporal lobe.** The MemoryAgent mirrors the medial temporal lobe (MTL) — not as a storage vault, but as an active *convergence zone* that integrates multiple memory systems into a coherent context for decision-making. In the brain, you don't "look up" a memory like a database query. The MTL reconstructs it by weaving together episodic traces, temporal context, familiarity signals, and spatial patterns. The MemoryAgent does exactly this when building StructuredContext for the LLM.

Like biological working memory, observations don't become permanent memories instantly. They pass through *staged formation*: new observations enter a forming pool, accumulate context as they graduate to working status, and are finally committed to the Hippocampus for long-term storage. During the active session, forming and working entries are protected from eviction — just as the prefrontal cortex actively maintains items in biological working memory until they're consolidated.

- **Hippocampus → Episodic Retrieval.** The hippocampus binds "what, where, when" into episodic memories and retrieves them via pattern completion — a partial cue triggers recall of the full episode. The MemoryAgent queries the Hippocampus with the current percept as a cue, retrieving relevant past episodes: "2 hours ago I found the mug on the counter" or "last week, searching the living room failed." These become the *relevant_memories* field in StructuredContext.
- **Entorhinal Cortex → Pattern Completion.** The EC's grid cells create abstract representations that generalize across experiences — letting you recognize that "finding a water bottle in the kitchen" is similar to "finding a mug in the kitchen." The MemoryAgent uses the EC's LSH-based similarity search to find analogous situations even when surface details differ, enabling transfer learning from past experience to novel contexts.
- **Parahippocampal Cortex → Contextual Framing.** The parahippocampal cortex processes scenes and spatial context — telling you "this is a kitchen" before you've identified any specific object. The MemoryAgent's SCN integration serves the same role: it provides temporal scene context ("it's 9 AM on a Tuesday, morning tasks typically involve the kitchen") that frames the current situation before any specific memory is retrieved. This is the *temporal_context* field.
- **Perirhinal Cortex → Familiarity Signals.** The perirhinal cortex provides rapid familiarity judgments — "I've seen this before" — without full episodic recall. The MemoryAgent computes novelty scores from the Hippocampus index: if an object or situation has many matching memory entries, it's familiar and novelty is low. If there are no matches, novelty is high. This fast signal shapes whether the system explores (novel) or exploits (familiar).

The key insight: memory retrieval is goal-directed. The prefrontal cortex tells the MTL what to look for, and the MTL returns what's relevant — not everything it has. The MemoryAgent implements this top-down control: active goals shape which memories are retrieved, which temporal patterns are surfaced, and which predictions are included. The same percept produces different StructuredContexts depending on what the robot is currently trying to do.

### ExecAgent

Proposes goals via LLM. Uses context from MemoryAgent to generate *ProposedGoal* objects. Considers current state, active goals, and relevant history to suggest what the robot should do next. After each goal completion, evaluates significance for *acute staging* and provides the `recall_deep` tool for LSH-seeded deep memory recall.

**Inspired by frontal lobe executive function.** The ExecAgent is modeled after the prefrontal cortex (PFC), the brain region responsible for executive function — the cognitive control system that decides *what to do* rather than *how to do it*. Just as the PFC sits atop the cortical hierarchy and orchestrates lower brain regions, the ExecAgent sits above memory and perception and orchestrates goal formation.

- **Dorsolateral PFC → Goal Formulation.** The dlPFC maintains working memory and performs abstract reasoning to formulate plans. The ExecAgent mirrors this by holding StructuredContext in its prompt window and reasoning over it to propose new goals. It doesn't react to stimuli directly — it deliberates.
- **Anterior Cingulate → Conflict Monitoring.** The ACC detects when active goals conflict or when the current plan isn't working. The ExecAgent evaluates active goals against new percepts and can propose goal revisions, replacements, or escalations when it detects a mismatch between expectations and reality.
- **Orbitofrontal Cortex → Value Assessment.** The OFC evaluates the expected value of potential actions. The ExecAgent receives predicted outcomes from the NAc (reward system) and energy cost estimates, weighing them when choosing which goal to propose — favoring high-value, low-cost actions just as the OFC does.
- **Inhibitory Control → Goal Filtering.** A hallmark of executive function is the ability to *suppress* inappropriate responses. The ExecAgent doesn't just generate goals — it filters them. Redundant goals, goals conflicting with active tasks, and low-priority distractions are suppressed before they ever reach the AgenticGoalAgent.

The key insight: the frontal lobe doesn't execute actions — it decides what's worth doing. The ExecAgent preserves this separation. It proposes and prioritizes, but never acts. Execution is always delegated downward, just as the PFC delegates to motor cortex and basal ganglia.

### AgenticGoalAgent

Accepts or rejects proposed goals. If accepted, executes via tool invocation. Manages goal execution lifecycle and chains sub-goals hierarchically.

### StatisticianAgent

Monitors operational metrics — tool success rates, goal latencies, percept distributions — and detects emerging patterns. Uses the *dual number system*: IPS (fast approximate) for continuous screening, Angular Gyrus (slow precise) for uncertain cases. Infers metric data types (binary, continuous, rate, latency) and generates ranked *analysis suggestions* based on FSM state, which flow through to the LLM prompt as actionable guidance.

**Inspired by the posterior parietal cortex.** The posterior parietal cortex (PPC) integrates sensory streams into quantitative assessments that feed executive decision-making. The intraparietal sulcus (IPS) handles fast magnitude estimation — "about how many? more or less than before?" — while the angular gyrus performs slow, precise computation when the gut check is inconclusive.

- **IPS (Fast Path) → Randomness Screening.** The IPS uses Wald-Wolfowitz runs tests and lag-1 autocorrelation to quickly assess whether a metric series contains structure or is just noise. This runs every analysis cycle and costs microseconds. Handles the 90% case: clearly random metrics stay quiet, clearly patterned ones escalate immediately.
- **Angular Gyrus (Slow Path) → Precise Confirmation.** When IPS can't decide (pattern confidence between 0.3–0.65 for several steps), Angular Gyrus is invoked for exact R² computation, autocorrelation confidence intervals, and memory recall. It checks: "Have I seen this pattern before?" If found in memory, fast-track. If new, compute precisely and store the result.

Each tracked metric has its own PatternDetector state machine: OBSERVING → PATTERN_FORMING → CONFIRMED_PATTERN (or ESCALATED_TO_AG when uncertain). The SCN oscillator provides temporal context, distinguishing "this is unusual" from "this is unusual *for this time*." [Full details](https://www.dennyschaedig.com/maxim/math-cognition#statistician)

## Where Biology Meets AI

The integration points between biological systems and the agent pipeline:

| Biological System | Integration Point | Effect on Agent |
| --- | --- | --- |
| Hippocampus | MemoryAgent (storage + context) | Long-term memory store; provides relevant past episodes for LLM reasoning |
| SCN | MemoryAgent context | Adds temporal patterns ("this usually happens at...") |
| NAc | Decision Engine | Predicts action outcomes before execution |
| EC | MemoryAgent retrieval | Finds similar situations from different contexts |
| Attention | PerceptionAgent | Prioritizes unexplored spatial regions |
| Salience | PerceptionAgent | Highlights important objects for attention |
| Pain | Decision Engine | Blocks or modifies harmful action proposals |
| PFC (Executive Function) | ExecAgent | Goal formulation, conflict monitoring, inhibitory filtering, value-based prioritization |
| Cerebellum (FocusLearner) | Executor (motor) | Error-driven motor adaptation, movement gain calibration via Rescorla-Wagner learning |
| IPS (Intraparietal Sulcus) | StatisticianAgent | Fast approximate math: randomness screening, trend detection, anomaly scoring |
| Angular Gyrus | StatisticianAgent | Slow precise math: exact R², correlation matrices, pattern memory recall and storage |
| ATL (Anterior Temporal Lobe) | MemoryAgent context | Semantic knowledge: typed relationships between concepts distilled from episodes |

## The StructuredContext

The MemoryAgent compiles a *StructuredContext* that gives the LLM everything it needs to reason about the current situation:

```
StructuredContext:
  current_percept:
    - detected_objects: [{"class": "mug", "confidence": 0.89, "position": [0.3, 0.2]}]
    - attention_target: "mug"
    - novelty_score: 0.2
    - salience_score: 0.7

  relevant_memories:
    - "2 hours ago: Successfully found mug on kitchen counter"
    - "Yesterday: User asked for coffee, mug was near coffee maker"
    - "Last week: Mug search failed in living room"

  temporal_context:
    - current_time: "09:15 Tuesday"
    - scn_pattern: "Morning tasks typically involve kitchen"

  predicted_outcomes:  # From NAc
    - "counter_search": {valence: POSITIVE, strength: 0.82}
    - "living_room_search": {valence: NEGATIVE, strength: 0.45}

  active_goals:
    - "Find the coffee mug for the user"

  statistical_context:  # From StatisticianAgent
    - "[PATTERN] navigate tool success declining (R²=0.73)"
    - "[TEMPORAL] High coherence (0.91) — deviations significant"

  statistical_suggestions:  # Ranked analysis recommendations
    - {metric: "tool:navigate:success", operation: "recall_memory",
       data_type: "binary", priority: 0.6, rationale: "Confirmed pattern with AG memory"}
    - {metric: "sensor:battery:rate", operation: "assess_randomness",
       data_type: "rate", priority: 0.5, rationale: "Emerging pattern (mean=0.72)"}

  pain_warnings:
    - None currently active

  concept_context:   # From ConceptContextBuilder (ATL)
    - {id: "f47ac10b...", name: "kitchen", category: "location",
       confidence: 0.82, episode_count: 14,
       relationships: [{id: "e3b9d4f1...", type: "EXECUTES_WITH",
                        target: "skill:navigate"}]}

  provenance_context:  # From ProvenanceCollector (recent traces)
    - "**recall** → 2 concepts: `atl:c7f2a1b3` kitchen, `atl:e3b9d4f1` navigate"
    - "**decision** → navigate_to (confidence: 0.9)"
```

### Bio-Skill Integration

Skills integrate with biological memory systems by writing context into the agent's perception observations. The MemoryAgent, ConceptExtractor, and ATL relationship graph do the rest automatically — no explicit wiring needed on the skill side.

```
Skill activates → Protocol injects skill name into context
  → MemoryAgent writes _skill_name into perception observations
    → ConceptExtractor creates "skill:patrol" concept (category=skill_execution)
      → EXECUTES_WITH edges formed to co-occurring concepts
        → PatternCompleter discovers skill concepts via graph
          → ConceptContextBuilder ranks skills by edge overlap
```

The system *learns* which skills are relevant to which concepts organically — no hardcoded triggers needed. The ATL relationship graph IS the trigger system.

## Decision Safety: The Fear Circuit

Before any action executes, it passes through harm prediction.

**Two-tier harm detection:**

- **Tier 1 — Predictive (zero latency):** Analyzes action parameters before execution. MovementHarmPredictor checks velocity, JointLimitHarmPredictor checks workspace bounds.
- **Tier 2 — Reactive (learned):** PainDetector monitors execution, feeds outcomes to NAc. Next time, similar actions are predicted as harmful.

The *FearAgent* reviews actions against harm predictions and pain history, returning a `ReviewResult` with a binary **allow/block** decision and a risk assessment:

- **allow = true:** Proceed — risk is acceptable
- **allow = false:** Block the action entirely

Each review also produces a `RiskLevel` (LOW, MEDIUM, HIGH, CRITICAL) and a list of specific `Finding` objects describing what was detected. The risk level informs the binary decision but is also available to upstream agents for context.

## Coding Tools

Maxim includes code-aware tools for autonomous software development:

- **edit_file** — Text-anchor edits (old_text → new_text). Stable across multi-step plans — no line number drift.
- **search_code** — Regex search with context lines, file pattern filtering. Always allowed (read-only).
- **run_tests** — Execute test suites with structured pass/fail results. 5-minute timeout. Feeds CodingReplanContext on failure.
- **git_diff / git_commit** — Version control awareness. git_diff is always allowed (read-only); git_commit requires autonomy approval.

## Motor Learning: The Cerebellum

If the ExecAgent is the prefrontal cortex deciding *what* to do, the Executor layer's *FocusLearner* is the cerebellum — learning *how* to do it smoothly.

**The biological parallel.** The cerebellum receives a copy of every motor command (efference copy) and compares the intended movement against what actually happened. When there's a mismatch — you reached for a cup and missed by 2cm — it adjusts an internal model so the next attempt is more accurate. Over many trials, movements become smooth and precise without conscious effort. This is why you can touch your nose with your eyes closed.

Critically, the cerebellum operates *below* conscious awareness. The prefrontal cortex decides "pick up that mug" and the cerebellum handles the fine-grained calibration of the reach. This mirrors Maxim's architecture exactly: the ExecAgent proposes goals, the AgenticGoalAgent accepts them, and the Executor layer's FocusLearner silently calibrates the motor commands that carry them out.

How the FocusLearner implements cerebellar learning:

- **Efference Copy → Command Logging.** The cerebellum receives a copy of each outgoing motor command. The FocusLearner records every gaze command issued — the intended target position and the movement gain used — so it can compare intent against outcome.
- **Error Signal → Prediction Error.** Cerebellar Purkinje cells encode the difference between expected and actual sensory feedback. The FocusLearner computes a prediction error: how far the camera actually moved versus how far it should have. This error drives all adaptation.
- **Synaptic Plasticity → Rescorla-Wagner.** The cerebellum adjusts synaptic weights through long-term depression at parallel fiber–Purkinje synapses. The FocusLearner uses Rescorla-Wagner learning to adjust movement gain: small errors produce small corrections, large errors produce large corrections, and learning rate decays as performance improves.
- **Automaticity → Unconscious Execution.** Cerebellar learning is implicit — you don't decide to be more accurate, you just become so. The FocusLearner operates entirely below the agent pipeline. No agent is aware of gain adaptation. Goals flow down, calibrated motor commands flow out, and the learning happens silently in between.

The result: a robot that starts clumsy and becomes precise. Early gaze commands overshoot and oscillate. After dozens of trials, movements are smooth and accurate. No parameter tuning required — the system calibrates itself, just as the cerebellum does.

## Energy Awareness

Actions consume resources. Maxim tracks energy expenditure across multiple domains:

```
Energy Types:
  - LLM_TOKENS: Input + output tokens consumed
  - LLM_LATENCY: Time waiting for LLM responses
  - MOTOR_COMMAND: Movement execution cost
  - VISION_INFERENCE: Vision model processing
  - AUDIO_PROCESSING: Speech transcription/synthesis
  - ATTENTION: Cognitive focus cost
```

Energy signals flow to the NAc, creating associations between actions and their costs. Over time, the robot learns which approaches are efficient and which are wasteful, incorporating this into decision-making.

## Design Principles

- **Layered Separation** — One-way dependencies prevent circular reasoning
- **Biological Plausibility** — Core systems mirror neuroscience mechanisms
- **Learning Over Tuning** — Systems adapt rather than requiring manual configuration
- **Safety First** — Multi-tier harm detection before and during execution
- **Continuous Memory** — Persistent learning enables improvement across sessions
- **Human Deference** — Always yields to human authority and intervention

## The Root Goal

> "Understand reality and help people."

Every decision in Maxim traces back to this root goal. The biological systems provide the machinery for understanding (memory, attention, learning). The agent architecture provides the machinery for helping (goal decomposition, planning, execution). The integration of both creates something that might, in small ways, begin to resemble a mind.

---

**Deeper reference:** for the code-adjacent, canonical description of Maxim's internals, see [ARCHITECTURE.md](https://github.com/dennys246/Maxim/blob/main/ARCHITECTURE.md) in the repository.
