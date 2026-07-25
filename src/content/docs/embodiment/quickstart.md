---
title: Quickstart
description: Give Maxim a body in three commands — install, load the default embodiment, and watch it sense and react in simulation.
---

This page gets a body running as fast as possible. For what any of it *means* — the
Sensor-Entity-Modulator model, headless vs. embodied operation, porting to real
hardware — read the [Overview](/embodiment/overview/) next. To run on an actual robot,
jump to the [Reachy Mini guide](/guides/reachy-mini/).

## 1. Install Maxim and a model

```sh
pip install pymaxim
```

Maxim needs a language model to drive the agent. The quickest path is a local model,
which auto-downloads on first run (see [Installation](/installation/) for cloud keys and
options):

```sh
maxim --list-models          # see what's available
maxim --llm mistral-7b       # auto-downloads on first use
```

## 2. Run with the default body

Maxim runs **headless** (software only) by default. To give it a body, pass
`--embodiment` with a body reference. The bundled default is `bodies/base_humanoid` — a
genre-neutral loadout of sensors, affordances, and failure modes:

```sh
maxim --sim --embodiment bodies/base_humanoid
```

`--sim` runs in simulation so you need no hardware. Body references resolve against the
components bundled with the package and your local `~/.maxim/components/`.

## 3. Confirm the body wired up

Maxim generates a tool for each sensor and affordance in the body. Check that they were
created:

```sh
maxim doctor --embodiment bodies/base_humanoid
```

You should see the auto-generated tools (patterns like `sense_<entity>`,
`read_<entity>_<sensor>`, and `<entity>_<affordance>`) and no load errors. From here,
run a simulation and watch the agent read sensors, act through affordances, and hit
failure modes — the raw material its [cerebellum](/systems/cerebellum/) learns motor
predictions from and its [fear circuit](/systems/fear-circuit/) treats as pain.

## Where to go next

- **[Overview](/embodiment/overview/)** — the SEM idea, headless vs. embodied, and how to bring Maxim to a new robot
- **[The SEM protocol](/embodiment/sem-protocol/)** — define your own body in YAML
- **[Component library](/embodiment/component-library/)** — drop in prebuilt entities instead of authoring from scratch
- **[Asset Foundry](/embodiment/asset-foundry/)** — generate new components with an LLM pipeline
- **[Imagination](/embodiment/imagination/)** — design entities on the fly for unfamiliar objects
- **[Reachy Mini](/guides/reachy-mini/)** — run all of this on real hardware
