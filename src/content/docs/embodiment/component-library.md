---
title: Component library
description: A catalog of ready-made SEM entity components — prebuilt sensors, affordances, and failure modes across seven categories — plus the ComponentIndex that discovers them by exact alias or semantic similarity.
---

Authoring a Sensor-Entity-Modulator (SEM) entity by hand means writing YAML for every sensor range, every affordance, and every failure mode an object can hit. That is fine once. It is tedious the tenth time you need a guard, a healing potion, or a dungeon corridor. The **component library** is Maxim's answer: a catalog of ready-made SEM entities you can drop into a body or world by name instead of authoring them from scratch.

Maxim is a bio-inspired cognitive architecture, and these components are the reusable furniture its cognition acts on. Every component ships with sensors, affordances, and failure modes already wired up, so the moment you reference one it behaves correctly under simulation — a dragon that can exhaust its fire breath, a laptop whose battery dies, a captain whose suspicion rises.

## What it is

A component is a template for a [SEM entity](/embodiment/sem-protocol/) — the format these components implement. Where the SEM protocol defines *how* an entity is described (sensors with ranges and units, modulators that expose affordances, failure modes with triggers), the component library is a stocked shelf of entities already written in that format. You reference one by a `category/name` path such as `npcs/guard` or `weapons/magic_staff`, and the registry hands you a fully-formed entity you can instantiate, mutate, and place into a scene.

Components are the counterpart to two other systems. The [Asset Foundry](/embodiment/asset-foundry/) is how *new* components get generated — when a campaign needs something the shelf does not stock, the foundry authors it. [Imagination](/embodiment/imagination/) is the runtime cousin: designing entities on the fly during a live simulation. The library is the durable, curated middle — the entities good enough to keep.

## The catalog

The library is organized into **seven categories**. Every component carries one or more genre tags (or is genre-neutral), which drives genre gating during a campaign.

| Category | Count | Genre tags represented |
| --- | --- | --- |
| Weapons | 9 | fantasy, neutral, modern, cyberpunk, scifi |
| Creatures | 8 | fantasy, horror, neutral, scifi, cyberpunk |
| NPCs | 13 | neutral, fantasy, historical, modern, devops, cyberpunk |
| Environments | 12 | fantasy, neutral, horror, scifi, historical, modern, cyberpunk |
| Items | 21 | fantasy, horror, modern, devops, historical |
| Vehicles | 3 | modern, fantasy, historical |
| Bodies | 6 | neutral, modern, devops, cyberpunk |
| **Total** | **72** | — |

**A note on the total.** The two sources for this catalog disagree by one. The repository's current user doc lists **72 components**, with **6** in the Bodies category. The interactive web catalog reports **73 components**, with **7** Bodies. The entire delta is that one Bodies row. This page follows the repo doc's current number (**72**), but both figures are stated here so the discrepancy is visible rather than silently resolved. If you need the authoritative count at any given moment, generate it from the registry rather than trusting a hand-copied total.

The full per-component listing — every entity, its sensors, and its failure modes — is drift-prone by nature: components get added and retuned faster than a prose table can track. For the complete enumeration, see:

- **[Components reference](/reference/components/)** — the full on-site catalog, every entity by category, sourced from the repo registry
- Interactive catalog with search and filtering: [dennyschaedig.com/maxim/component-library](https://www.dennyschaedig.com/maxim/component-library)
- Repo registry (canonical source): [`src/maxim/_data/components/`](https://github.com/dennys246/Maxim/tree/main/src/maxim/_data/components)
- Repo user doc: [docs/user/component-library.md](https://github.com/dennys246/Maxim/blob/main/docs/user/component-library.md)

To give a sense of the shape: `weapons/magic_staff` (fantasy) tracks mana, durability, attunement, and corruption, and can fail via `mana_exhaustion`, `corruption_overload`, or `shattered`. `creatures/dragon` (fantasy) tracks hp, fire-breath charge, aggression, altitude, and armor integrity, failing to `grounded`, `breath_exhausted`, or `death`. `bodies/reachy_mini` (a robot body) tracks head yaw/pitch/roll, camera health, battery, and motor temperature, failing to `thermal_throttling`, `low_battery`, `pose_drift`, or `camera_lost`. The Items category also bundles seven `cradle_*` scene objects used by the `cradle` developmental arc, reachable through the registry like any other component.

### Genre gating

Components are tagged with genres, and a campaign filters the registry by its declared genre. When a campaign specifies `genre: fantasy`, the registry automatically:

- **includes** components tagged `fantasy`,
- **includes** genre-neutral components (no genre tag), and
- **excludes** components tagged with other genres (e.g. `cyberpunk`).

The available genres are `fantasy`, `cyberpunk`, `scifi`, `horror`, `historical`, `modern`, and `devops`.

## Discovery: the ComponentIndex

Referencing `npcs/guard` by its exact path is the easy case. The harder case is a campaign — or a generative agent — asking for `"old iron door"` when the registry stores it as `environments/rusty_gate`. The **ComponentIndex** handles both through a two-layer lookup.

**Layer 1 — alias hash table (O(1)).** Every component's canonical name and its declared synonyms are indexed in a hash table. An exact name or a known alias resolves in constant time. This is the fast path and covers most lookups.

**Layer 2 — embedding cosine similarity (threshold 0.65).** When Layer 1 misses, the index falls back to semantic search. Component descriptions are embedded with sentence-transformers, and the query is matched by **cosine similarity with a threshold of 0.65**. A query like `"old iron door"` clears the threshold against `environments/rusty_gate` and resolves to it. Below 0.65, the index reports no match rather than returning a bad guess.

The index is built for concurrent use. Access is guarded by a **reentrant lock (`RLock`)** so multiple simulation threads can query and update it safely. Persistence is deliberately pickle-free: embeddings are stored as a **`.npy`** array alongside a **`.json`** sidecar of metadata, so the index can be rebuilt or shipped without executing arbitrary serialized objects.

## Using components

### Python API

Instantiate a component from the registry, read and write its sensors directly, and enumerate what is available:

```python
import maxim

# Instantiate from the registry
guard = maxim.create.entity("npcs/guard", name="Captain Aldric")
guard.sensors["suspicion"].value = 0.8

# Sensors can be read as well as set
staff = maxim.create.entity("weapons/magic_staff")
print(staff.sensors["mana"].read())

# List what's available, grouped by category
for category, names in maxim.create.templates().items():
    print(f"{category}: {', '.join(names)}")
```

The returned object is a live SEM entity: setting `guard.sensors["suspicion"].value` changes the state the cognitive pipeline will read during simulation, and the guard's `hostility` failure mode fires from that same sensor state.

### Campaign YAML (registry refs)

Inside a campaign, you pull components in by reference and override only what differs from the template. A `ref` resolves against the component library; `overrides` patches sensor initials, metadata, and names on top of the resolved entity:

```yaml
npcs:
  captain:
    ref: npcs/guard           # Resolves from component library
    overrides:
      name: captain_aldric
      metadata:
        persona_prompt: "A stern captain who guards the east gate."
      sensors:
        suspicion:
          initial: 0.6         # Override default value

world_objects:
  magic_staff:
    ref: weapons/magic_staff   # Items usable during encounters

encounters:
  gate:
    scene: "The captain blocks the gate..."
    active_npcs: [captain]
    world_objects: [magic_staff]   # Makes affordances available as tools
```

Placing a component in `world_objects` and then listing it in an encounter's `world_objects` exposes its affordances to the agent as callable tools for that scene. These campaign files are what the [simulation guide](/guides/simulation/) runs — components are the cast and props of a scripted or generated scenario.

### Adding your own components

The registry discovers components from disk automatically. Drop a YAML file into `~/.maxim/components/{category}/` and it is picked up on the next run:

```yaml
component:
  name: my_weapon
  tags: [weapon, melee, fantasy]
  category: weapons

entity:
  name: my_weapon
  entity_type: weapon
  sensors:
    durability:
      unit: ratio
      range: [0, 1]
      initial: 0.9
  modulators:
    combat:
      affordances:
        swing:
          params: {target: str}
          description: "Swing at a target"
  failure_modes:
    - name: broken
      trigger: {field: durability, op: "<", value: 0.1, pain: 0.5}
```

Once written, the ComponentIndex adds it to the alias table and embeds its description, so it becomes reachable both by exact path (`weapons/my_weapon`) and by semantic query.

## How it connects

- [SEM protocol](/embodiment/sem-protocol/) — the sensor/entity/modulator format every component implements.
- [Asset Foundry](/embodiment/asset-foundry/) — how new components are generated when the shelf does not have what a campaign needs.
- [Imagination](/embodiment/imagination/) — designing entities at runtime, the live-simulation cousin of the curated library.
- [Simulation](/guides/simulation/) — where components are cast into campaigns as NPCs, world objects, and encounter props.

## Going deeper

- Repository: [github.com/dennys246/Maxim](https://github.com/dennys246/Maxim)
- User doc (source of truth for counts): [docs/user/component-library.md](https://github.com/dennys246/Maxim/blob/main/docs/user/component-library.md)
- Interactive catalog: [dennyschaedig.com/maxim/component-library](https://www.dennyschaedig.com/maxim/component-library)

Maxim installs as `pip install pymaxim` and imports as `maxim` — see [Installation](/installation/) to get set up before instantiating your first component.
