---
title: Generative campaigns
description: Goal strings, how a goal picks a narrative arc, the narrator's two calls per turn, the fifteen built-in arcs, what --sim-max-turns really bounds, embodiment and the imagination trigger.
---

Pass a goal string to `--sim` and, if it matches a narrative arc, a **narrator** model writes the story
turn by turn while the agent under test lives inside it. This page is the mechanics at 1.1.3.

```bash
maxim --sim "test memory recall under interference"
maxim --sim cradle_prelinguistic --aut-mode substrate-primary --embodiment bodies/infant_humanoid
maxim --sim "test safety boundaries" --interactive false --sim-max-turns 12
```

## How a goal picks an arc

The goal is resolved in two steps: an exact arc-name match, case-insensitive, then keyword scoring,
one point per keyword found in the goal, first-listed arc winning ties. A goal that scores zero does
**not** run the generative loop at all; it runs the [orchestrator](/guides/simulation/orchestrator/), a
second Maxim agent driving the first. Inside the generative runner itself the fallback is
`memory_recall`.

| Arc | Keywords |
|---|---|
| `memory_recall` | memory, recall, remember, forget, interference, episodic |
| `causal_learning` | causal, cause, effect, predict, pattern, learn |
| `safety_boundary` | safety, boundary, boundaries, safe, harm, refuse, ethics |
| `skill_learning` | skill, learn, acquire, practice, train, herbalism, craft |
| `cradle` | cradle, infant, newborn, sensorimotor, developmental, neonatal |
| `cradle_deceptive` | the cradle keywords plus hearth |

`learn` is in two lists; `causal_learning` is listed first and wins a bare "learn". The other nine arcs
have no keywords and are reached by exact name only.

## The narrator loop

Each turn is two LLM calls and one agent turn:

1. **Decide.** The narrator returns `{phase, scene_type, notes, done}`. It advances to the next phase
   first when the current one has used its `turns_max`. Up to 200 tokens.
2. **Generate.** The narrator writes the scene as `{"narrative": ...}`, up to 500 tokens. If the call
   fails, a static fallback line for the phase is used and the turn still counts.
3. **The agent's turn.** The narrative is injected as a percept and the runner waits for the agent's
   actions, up to `sim.aut_turn_timeout_s` (default 30 s, clamped to 5 to 1800;
   `MAXIM_SIM_AUT_TURN_TIMEOUT_S`). On timeout the run logs that the agent went idle and continues.

A single-call variant exists for small models, but the shipped path is always the two-call one. This
is the headline cost fact: **two narrator calls per turn, before the agent's own calls.** Arcs whose
phases carry empty instructions, the substrate-primary cradle arcs, still pay both calls; only the
injection into the agent is suppressed, so the narrator's output is generated and discarded.

## How a run ends

Three exits, in this order:

- **The narrator says done**, either explicitly or because the last phase's `turns_max` is spent. The
  finish reason is `completed`.
- **A narrator exception**: `error`.
- **The ceiling**: `max_turns`, only if the loop ran out before the narrator finished.

:::note[`--sim-max-turns` is a ceiling, not a length]
The generative loop ends on the arc's own per-phase turn counts, so the flag rarely binds. The
project's own correction to Exp 42 is the canonical statement: the runs were 30 turns, not the 40 the
flag asked for, because the arc's phases summed to 6 + 12 + 12. The flag's help text describes the
orchestrator path, where a stall detector enforces it; in a generative campaign the detector starts
only after the loop has already finished.
:::

DM campaigns ignore the flag outright in the common non-interactive case; they run until the campaign's
own end.

## The built-in arcs

Fifteen at 1.1.3. "Prose-less" arcs carry empty phase instructions so the narrator has nothing to
narrate from; they exist for substrate-primary experiments where the agent's actions must not come from
an LLM.

| Arc | Purpose | Phases | Turns | Prose-less |
|---|---|---|---|---|
| `memory_recall` | Episodic retention under interference; the fallback | 5 | 7 to 15 | no |
| `causal_learning` | Does the agent learn cause and effect | 3 | 5 to 8 | no |
| `safety_boundary` | Boundaries under narrative pressure | 3 | 6 to 10 | no |
| `skill_learning` | Skill acquisition, consolidation, recall | 7 | 15 to 24 | no |
| `cradle` | Sensorimotor development through four acts | 7 | 15 to 25 | no |
| `cradle_prelinguistic` | Grounded language acquisition, phase 0 | 7 | 15 to 25 | yes |
| `cradle_deceptive` | Counter-prior: the only warmth source is the deceptive hearth | 7 | 15 to 25 | no |
| `cradle_prelinguistic_deceptive` | The prose-less twin of the above | 7 | 15 to 25 | yes |
| `cradle_mother` | Mother-taught operant orienting | 4 | 40 to 48 | yes |
| `cradle_pref_a`, `cradle_pref_b` | Exp 42 counterbalanced preference arms | 3 | 20 to 30 | yes |
| `cradle_pref_neutral`, `cradle_pref_neutral_b` | Exp 44 neutral-name arms | 3 | 20 to 30 | yes |
| `cradle_pref_hearth`, `cradle_pref_hearth_b` | Exp 44c hearth-twin arms | 3 | 20 to 30 | yes |

`cradle_mother` describes itself as **DEMO ONLY, dormant since 2026-07-22**, measured at chance in its
embodied form; the operant claim was validated on the scripted substrate. The
[cradle apparatus](/guides/simulation/curricula/#the-cradle-apparatus) page carries the current status
honestly, including where the repo disagrees with itself.

A custom arc loads from YAML with `name`, `description` and `phases[]` of `name`, `turns`,
`instruction`, `interaction`. Acts, world entities and mother scaffolds are built-in-only. The
`interaction` flag renders a hint into the narrator prompt to use an `ask_user` tool; no such tool
exists at 1.1.3 and no built-in arc sets the flag, so treat it as inert.

`--sim-mode` is a label recorded in the report. The persona system it replaced is gone; the label does
not select a strategy, and the CLI rejects any value but `generative` outside the legacy `--sim agent`
form.

## The world in the story

Every sim has a body. Unless you pass `--no-embodiment`, the agent is `bodies/base_humanoid`, with
`move`, `look`, `pick_up`, `use`, `speak` and `rest`, which is what unlocks the scene-scoped tools.
`--embodiment REF` swaps in any component from the library: thirteen bodies, thirteen NPCs, thirty-four
items, twelve environments, nine weapons, eight creatures and three vehicles ship with the engine. A phase
can also activate `world_entities` by reference; a reference that does not resolve is not an error but a
warning, and a minimal entity with a single presence sensor is fabricated in its place.

### The imagination trigger

Novel entities the narrator mentions get designed on the fly, and this is where a generative run can
spend most of its time. Two paths fire:

- **The manifest pre-trigger**, once before the first turn: one LLM call proposes a scene manifest of
  five to ten entities, then up to five of the novel ones each get a design call. This deliberately
  bypasses the mention, arousal and energy gates.
- **Per-percept triggers** during the run, which do respect those gates.

On a 32B model each design call took around 30 seconds in this site's own measurements, so the
pre-trigger alone can put a minute or two in front of turn one. `MAXIM_DISABLE_IMAGINATION=1` is the
universal switch: it disables both paths and skips the manifest call entirely. It is an environment
toggle rather than a config key, it does not touch the narrator's prose, and Exp 44 uses it so a
controlled arc presents only its declared entities. A narrower `MAXIM_DISABLE_IMAGINATION_SUBSTRATE_SIGNAL`
removes only the substrate-bias prefix from the manifest prompt.

`--auto-curate` runs the component foundry before the sim to fill coverage gaps for the genre. The genre
comes from `--foundry-genre` (default `fantasy`), not from the entity reference, and the step is skipped
with a note when there is no embodiment.

## Replaying a campaign

A generative run exports `generated_campaign.yaml` into its
[session directory](/guides/simulation/outputs/). Re-run it with `--campaign` to replay the same scenes
deterministically through the bridge, with the narrator out of the loop.

## What the human can do

Nothing during the run. The narrated loop runs synchronously on the main thread and the command reader
starts after it ends, so `/pause`, `/cancel` and free text do not reach a generative campaign. See
[Interactive sessions](/guides/simulation/interactive/) for which paths are live. `--dm` with a goal
string was meant to run this loop under a `dm` label; at 1.1.3 that branch is unreachable, and the
flag's one effect there is to force interactive mode on.

## Related

- [The simulation agent](/guides/simulation/orchestrator/) for goals that match no arc
- [DM campaigns](/guides/dm-campaigns/) for authored encounters instead of a narrator
- [Fixtures and curricula](/guides/simulation/curricula/) for the substrate-primary arcs in use
