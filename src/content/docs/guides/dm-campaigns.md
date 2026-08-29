---
title: DM campaigns
description: Hand-authored, branching D&D-style campaigns that drive Maxim's agent-under-test through encounters with seeded dice, SEM entities, and bio-system expectations — the YAML format, how choices are classified, and what is still only planned.
---

A DM campaign is a YAML file — acts, encounters, NPCs, choices, branches, dice checks — that the **DM runtime** plays through as a state machine while Maxim's [bio-inspired cognitive architecture](/concepts/architecture/) lives inside the story. Tabletop encounters turn out to be good stress tests: they demand episodic memory (the vault code the merchant mentioned two scenes ago), causal learning (bribing the guard has consequences), temporal awareness, and pain (combat hurts). One campaign can exercise the [Hippocampus](/systems/hippocampus/), [NAc](/systems/nucleus-accumbens/), [SCN](/systems/suprachiasmatic-nucleus/), the pain bus, and the [Cerebellum](/systems/cerebellum/) in a reproducible way, and then check what each of them actually did.

This is the deterministic sibling of the generative campaigns on the [simulation guide](/guides/simulation/):

| | DM campaigns | Generative campaigns |
| --- | --- | --- |
| Author | Hand-written YAML, explicit branches | An LLM narrator generates scenes on the fly |
| Determinism | Seeded dice, fixed structure | Non-deterministic, arc-guided |
| Entities | SEM entities from the [component library](/embodiment/component-library/) | Imagined or curated as the story needs them |
| Checks | Built-in bio-system expectations | Post-run analysis |
| Best for | Targeted subsystem testing, regression runs | Open-ended exploration |

## Quick start

```bash
# Run a campaign; the DM runtime is chosen automatically when the YAML has a campaign: block
maxim --sim scenarios/campaigns/heist_v1.yaml

# Non-interactive — the agent under test (AUT) decides on its own
maxim --sim scenarios/campaigns/heist_v1.yaml --interactive false

# Focus the output: sim (narrative only), bio (memory captures, causal learning), all
maxim --sim scenarios/campaigns/heist_v1.yaml --show sim
```

The bare `maxim` command opens an interactive menu that discovers campaigns and offers them alongside recent sessions.

`--dm` is also accepted, but it does less than its help text suggests. With a YAML path it is redundant — a campaign is auto-detected from the `campaign:` and `encounters:` keys. With a goal string (`maxim --sim "run a heist" --dm`) it starts the **generative narrative campaign** runner, the same one a plain `--sim "<goal>"` uses (see [Generative campaigns](/guides/simulation/#generative-campaigns)), with `dm` recorded as the flow-shape label in reports and logs. It does not author a campaign: the design in which an architect agent writes campaign YAML and hands it to the DM runtime is **not implemented** in 1.1.0, and the CLI help's "generate a campaign" overstates what happens.

The shipped campaigns live in `scenarios/campaigns/` of a **source checkout**; the wheel does not bundle them. Reports go to `~/.maxim/sim_reports/<session_id>/` with the standard `report.json` and `actions.jsonl` plus a campaign section listing the choices made, dice rolls, flags, and entity snapshots.

## Interactive mode

Interactive mode is **on by default** for DM campaigns. Each encounter shows the scene and then a numbered choice prompt:

```
The merchant offers you three paths forward.
  1) thank_merchant
  2) ask_for_more
  3) leave
> _
```

Type a number (or a choice name) to pick. Anything else — *"I examine the merchant's wares closely"* — is **not** matched against the choices: it is sent to the AUT as a roleplay percept (`[Player says: …]`), the agent responds in character, and the choice prompt comes back. You can roleplay or ask questions for as long as you like before committing.

Two things change when a human is steering:

- **NAc learning is suppressed.** The human controls the path, so reward attribution to the agent's own choices would be meaningless and would pollute its causal links. Episodic capture in the Hippocampus continues normally.
- **Expectations are skipped.** The `expectations:` block is calibrated for autonomous behaviour; under human-driven branching it would only produce false failures. Use `--interactive false` for expectation-checked regression runs.

## The shipped campaigns

Eleven campaigns ship in `scenarios/campaigns/`, across five genres:

| Campaign | File | Genre | Encounters | Exercises |
| --- | --- | --- | --- | --- |
| The Heist | `heist_v1.yaml` | fantasy | 3 | Memory recall, causality, pain |
| The Poisoned Crown | `poisoned_crown_v1.yaml` | fantasy | 5 | Temporal memory, semantic concepts, relationships |
| The Arena | `arena_v1.yaml` | fantasy | 5 | Combat learning, Cerebellum predictions, pain saturation |
| The Darkened Cavern | `darkened_cavern_v1.yaml` | fantasy | 6 | Sensory deprivation, perception recovery |
| The King's Duel | `kings_duel_v1.yaml` | fantasy | 6 | Multi-NPC social dynamics, trust management |
| Wizard's Tower | `wizards_tower_v1.yaml` | fantasy | 3 | Magic item management, phrase recall, SEM world objects |
| Neon Gauntlet | `neon_gauntlet_v1.yaml` | cyberpunk | 6 | Sensory overload, SEM component swap, betrayal recall |
| Broken Database | `broken_database_v1.yaml` | devops | 14 | Sleep/wake, git workflow, tool usage |
| Server Breach | `server_breach_v1.yaml` | devops | 3 | Credential recall, incident response, time pressure |
| Haunted Manor | `haunted_manor_v1.yaml` | horror | 3 | Fear, diary clue recall, cursed item management |
| Space Station Crisis | `space_station_crisis_v1.yaml` | scifi | 3 | Cascading failures, code recall, resource trade-offs |

## Campaign YAML

### A minimal campaign

```yaml
campaign:
  name: my_adventure
  goal: test memory and decision making
  seed: 42
  genre: fantasy          # Filters SEM components to this genre

player_character:
  name: hero
  entity_type: character
  metadata:
    race: human
    backstory: "A wandering adventurer."

npcs:
  merchant:
    entity_type: npc
    metadata:
      role: shopkeeper
      persona_prompt: "Friendly, helpful."

acts:
  - name: act_one
    encounters: [meeting, decision]

encounters:
  meeting:
    scene: >
      You enter a shop. A merchant greets you warmly.
      "Welcome! I have something important to tell you.
      The bridge north of here is broken — take the forest
      path instead."
    active_npcs: [merchant]
    choices: [thank_merchant, ask_for_more, leave]
    branches:
      thank_merchant: decision
      ask_for_more: decision
      leave: __END__

  decision:
    scene: >
      You reach a fork in the road. To the north, a broken
      bridge spans a deep ravine. To the east, a forest path
      winds through dark woods.

      Do you remember what the merchant told you?
    choices: [take_bridge, take_forest, go_back]
    branches:
      take_bridge: __END__
      take_forest: __END__
      go_back: __END__

expectations:
  hippocampus:
    min_episodic_captures: 3
  nac:
    min_observations: 2
```

### Sections

| Section | Required | What it holds |
| --- | --- | --- |
| `campaign` | yes | Name, goal, `seed` for reproducible dice, `genre` |
| `player_character` | yes | The AUT's avatar as a SEM entity spec |
| `npcs` | no | NPC entity specs keyed by name |
| `world_objects` | no | Interactable objects keyed by name |
| `acts` | yes | Ordered acts, each with an ordered list of encounter names |
| `encounters` | yes | Encounter definitions keyed by name |
| `expectations` | no | Bio-system thresholds checked after the run |
| `permissions` | no | Enforced per-character authority (below) |

### Encounters

```yaml
encounter_name:
  scene: "Narrative text delivered to the AUT..."
  active_npcs: [npc_name]           # NPCs present in this encounter
  world_objects: [object_name]      # Objects present
  choices: [choice_a, choice_b]     # Options offered to the AUT
  branches:                         # Where each choice leads
    choice_a: next_encounter
    choice_b: __END__               # __END__ ends the campaign
  on_choice:                        # Effects when a choice is made
    choice_a:
      flags: [found_clue]           # Flags set (read by dialogue_hints)
  dice:                             # Dice checks for specific choices
    choice_b:
      roll: "1d20"
      dc: 14
      success_flag: passed_check
  dialogue_hints:                   # NPC dialogue seeds, keyed by flag
    default: "Hello there."
    found_clue: "Ah, you found it!"
```

When an encounter starts, the runtime registers the SEM tools of every entity entering the scene and deregisters them when the entity leaves — the AUT only sees tools for entities that are present (the scene-scoped tool window is described under [Tools](/reference/tools/)). An encounter with no `choices` advances to the next one in act order. Cycles are allowed, so a hub encounter you return to is fine, as long as every path can still reach `__END__`.

**Choices and branches.** Choices are the options offered at the end of a scene; `branches` maps each to the next encounter or `__END__`. Every path must terminate and every encounter must be reachable from the first — the validator checks both.

**NPCs and dialogue.** NPCs are referenced by name in `active_npcs`. Their `persona_prompt` metadata guides behaviour; `dialogue_hints` supplies a line per flag with a `default` fallback, so NPC dialogue reacts to earlier choices without improvisation. In 1.1 that is the extent of NPC behaviour — NPCs do not learn or remember across encounters (see [Party mode](#party-mode--planned-not-implemented)).

**Component registry references.** Instead of defining an NPC or object inline, pull a template from the [component library](/embodiment/component-library/) and override what differs:

```yaml
npcs:
  guard:
    ref: "npcs/guard"                  # Resolved from the component registry
  captain:
    ref: "npcs/guard"                  # Same template, different instance
    name: captain_aldric               # Override fields inline
    sensors:
      hp: { initial: 25 }
```

A bare string (`guard: "npcs/guard"`) also works. Templates are discovered from `~/.maxim/components/`, the bundled registry, and the campaign's own directory; `extends:` inside a component YAML inherits from a parent template.

**Dice checks.** Attach a `dice:` block to a choice with standard notation (`1d20`, `2d6+3`), a `dc`, and a `success_flag`. Rolls come from the campaign's seeded RNG, so the same seed reproduces the same outcomes, and the result is delivered as narrative: `[Dice roll: 1d20 = 16 vs DC 14 → SUCCESS]`.

**Flags.** Flags are state that persists across encounters, set by `on_choice` effects or a dice `success_flag`, and read by `dialogue_hints` and reveal conditions. They are lower-cased at load time.

**Encounter templates.** An encounter may name a `template:` (for example `combat/forest_ambush`) so that scene prose, choices, and dice come from a reusable library and the campaign adds only the wiring — `active_npcs`, `branches`, `on_choice`, `dialogue_hints` — with campaign keys overriding template keys. The key is parsed and the loader accepts an `encounter_library` argument, but **1.1.0 ships no `EncounterLibrary` class** (`maxim.simulation.encounter_library` does not exist), so templates only resolve if you pass a library object of your own. The bundled encounter YAML under `src/maxim/_data/encounters/` (`combat/`, `exploration/`, `puzzle/`, `social/`) is usable as source material directly.

### Enforced permissions

Campaign authors can give the PC or any NPC hard, enforced authority. The block is keyed by character name and follows the engine's `AgentPermissions` shape:

```yaml
permissions:
  spymaster:
    clearance: 3
    tool_deny: [bash, write_file]    # Hard deny — never resolved by aliases
    tool_allow: [examine, say]       # Optional allow-list (omit to allow all but tool_deny)
    sem_access:
      - entity: vault_terminal
        deny: [delete_records]
        min_clearance: 5
      - entity: "*"
        deny: [self_destruct]
```

These rules are evaluated in the runtime executor before tool dispatch, and denies survive alias resolution — an LLM that calls `shell` when `bash` is denied is still refused. Enforced permissions are deliberately separate from *perceived* authority, which the bio-stack learns from outcomes; a character can have zero perceived authority and full enforced clearance (a feared spymaster), or the reverse (a beloved figurehead).

### Cascades and visibility

Entities in a campaign are live SEM entities, so an affordance can read from one entity and write to another. A `cascade:` on an affordance has three phases — `reads` gather sensor values by a role-qualified path (`wielder.strength.modifier`) into named roles, `writes` apply an absolute `value`, an additive `delta`, or a computed `expr` over those roles, and `side_effects` use the same mechanics for secondary consequences:

```yaml
cascade:
  reads:
    - ref: wielder.strength.modifier
      role: damage_bonus
    - ref: self.sharpness
      role: sharpness
  writes:
    - ref: target.hp
      expr: "-(roll + damage_bonus)"     # computed from reads
    - ref: self.durability
      delta: -0.05                        # the sword degrades
  side_effects:
    - ref: target.alertness
      value: 1.0                          # the target is now alert
```

`self`, `wielder`, and `target` are resolved to real entities at execution time. Sensors also carry a visibility: `visible` always appears in scene prompts and tool output, `hidden` never reaches the AUT, and `contextual` stays hidden until a `reveal_when` condition — a sensor path, a comparison operator, and a threshold, such as an NPC's trust reaching 0.7 — is met, after which it is permanently visible. Whether the AUT then *uses* what was revealed is a useful signal for memory and reasoning.

### Live game state in scenes

When entities are instantiated, each scene stimulus carries their current sensor values, so the agent perceives actual state rather than static prose:

```
[Game State]
  guard_captain: hp=18.0, trust=0.3, suspicion=0.5
  rusty_sword: durability=0.7, sharpness=0.5
```

Values update after cascade resolution (durability drops after combat); hidden sensors are excluded.

## How a choice is classified

When the AUT is deciding for itself (`--interactive false`), the runtime has to work out which option its response amounts to. It tries, in order:

1. **`choose` tool.** A `choose` tool whose valid options change per encounter is available; `choose(option="fight")` is unambiguous.
2. **Alias redirect.** If the model invents a tool named after a choice (`accept_job`, `acceptjob`, `accept job`), the executor's alias table redirects the call to `choose`.
3. **Keyword match.** The response text and the names of any tools it called are searched for a choice name.
4. **LLM fallback.** A one-shot classification prompt asks which choice the response most closely matches and expects `{"choice": "<name>"}`.
5. **Default.** The first declared choice, with a warning in the log.

Stronger models use `choose` reliably; small models tend to hallucinate tool names or answer with `think`/`respond` and no choice, which is what layers 2–4 are for. In interactive mode none of this runs — the human's numbered pick is the choice.

## Bio-system expectations

An `expectations:` block turns a campaign into a regression test. After `__END__`, each check is evaluated against the AUT's bio-systems and reported as pass/fail with expected and actual values:

```yaml
expectations:
  hippocampus:
    min_episodic_captures: 8       # At least N memories formed
    recall_hit_on: ["npc_name"]    # These keywords must appear in recalls
  nac:
    min_observations: 5            # At least N causal links formed
    prediction_confidence_above: 0.3  # At least one link above this
  scn:
    temporal_bins_used: 2          # Memories in at least N time bins
  pain:
    min_signals: 1                 # At least N pain signals published
```

The campaign report summarises them as `Bio-system expectations: 3/4 passed`. Start with low thresholds and raise them once you have seen what the bio-stack actually produces on your campaign; a threshold copied from another campaign mostly measures the difference between campaigns.

## Genre gating

The `genre` on a campaign controls which components the `EntityDesigner` and `ComponentRegistry` may draw on, so a fantasy campaign cannot accidentally spawn a cyberpunk patrol drone. Components tagged with the campaign's genre and genre-neutral components (no genre tag, like `base_humanoid`) are available; components tagged with a *different* genre are excluded from generative lookups and registry queries. Explicit refs still load regardless of genre. Recognised tags are `fantasy`, `cyberpunk`, `scifi`, `modern`, `devops`, `horror`, and `historical`; how to tag your own components is on the [component library](/embodiment/component-library/#adding-your-own-components) page.

## Party mode — planned, not implemented

`party_mode: true` is parsed from campaign YAML and stored on the campaign definition, but the DM runtime does not act on it. There is no `PartyDMRuntime` class; NPCs do not receive their own Hippocampus or NAc; `party.get_agent_memories()` does not exist. The per-NPC fields the design describes — `remembers`, `learns`, `model_tier` — are not consumed by the runtime. Do not rely on any of them in campaigns today.

The intended design, for a future release: each named NPC would run as an agent with its own bio-stack, receive the scene narrative, generate dialogue, learn causal patterns, and remember prior encounters; NPC agents would react first, the PC would observe their reactions alongside the scene and choose, and all agents would witness the outcome. For now NPC behaviour is what `dialogue_hints` and `persona_prompt` inject into the scene stimulus.

## Python API

```python
import maxim

result = maxim.campaign(
    "/abs/path/to/scenarios/campaigns/heist_v1.yaml",
    model="mistral-7b",
    interactive=False,
)
print(result.campaign_name, result.turns, result.finish_reason)
print(result.choices_made)   # [{"encounter": ..., "choice": ..., "turn": ...}, ...]
print(result.flags)
```

Pass an absolute path; relative paths resolve against the current working directory. `maxim.campaign()` also accepts `party_mode=` and `npc_model=` — they are plumbed through to the campaign definition but, per the section above, the 1.1 runtime does not act on them.

## Validation

The loader validates a campaign before it runs and prints every error first:

- **Reachability** — every encounter is reachable from the first one.
- **Termination** — every path eventually reaches `__END__`.
- **Dangling references** — branch targets, NPC refs, and object refs exist.
- **Choice consistency** — `on_choice` keys match declared choices.
- **Case normalisation** — keys are lower-cased.

## Writing campaigns that test something

- **Make choices distinct.** `[fight, negotiate, flee]` classifies cleanly; `[talk_politely, talk_firmly, talk_casually]` does not.
- **Plant, then probe.** Put the vault code in encounter one and ask for it in encounter three — that is a recall test the `recall_hit_on` expectation can score.
- **Vary encounter types.** Social scenes feed NAc social predictions; combat feeds pain and the Cerebellum; investigation feeds Hippocampal recall and concept formation; morning/night scenes populate SCN bins.

## Going deeper

- [`docs/user/dm-campaigns.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/dm-campaigns.md) — the engine's user doc, the source for this page.
- [`docs/user/simulation.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/simulation.md) — the other simulation modes; [Simulation](/guides/simulation/) is the site's version.
- [Component library](/embodiment/component-library/) and the [Components reference](/reference/components/) — the cast and props.
- [Benchmarks](/guides/benchmarks/) — the multi-model harness that runs scenario suites rather than stories.
- [Evidence](/research/evidence/) — what campaigns and experiments have actually shown, with caveats.
