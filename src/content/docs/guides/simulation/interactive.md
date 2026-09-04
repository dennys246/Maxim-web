---
title: Interactive sessions
description: What happens when you run a simulation at a terminal — the redirect, the split-panel display, the commands that actually work, the grace periods, and why causal learning pauses while a human is present.
---

Run a simulation from a terminal and you get a Rich split-panel display, a command line, and an agent
that knows a human is watching. This page describes that surface as it is at 1.1.3, including three
places where older docs describe commands or timings that no longer match the code.

## Starting one

```bash
maxim --sim                       # same as: maxim --sim interactive
maxim --sim "test memory recall"  # a generative campaign, interactive because stdout is a TTY
maxim --sim scenarios/campaigns/heist_v1.yaml   # a DM campaign, interactive by default
```

Bare `--sim` is literally `--sim interactive`. It does not launch a standalone REPL: the engine boots the
full agentic stack and then redirects into a simulation with the goal "open interactive session — respond
to user input naturally", a hard-coded ceiling of 200 turns (`--sim-max-turns` is ignored on this path)
and your `--embodiment` if you gave one. That goal matches no narrative arc, so it runs on the
**orchestrator** path, where the command line below is live.

Which path you land on decides how interactive a run really is:

| Run | Human input during the run |
|---|---|
| Bare `--sim`, `--sim agent`, or a goal string that matches no arc | The [orchestrator](/guides/simulation/orchestrator/) drives the agent and the commands below work throughout |
| A goal string that matches an arc (a [generative campaign](/guides/simulation/generative/)) | **None.** The narrated loop runs to completion on the main thread before the stdin reader starts; no command reaches it. The only effect of a TTY is the display and the learning pause below |
| A DM campaign | A choice prompt each encounter, plus free-text roleplay woven into the scene |

Interactive mode is **on for any TTY**, generative sims included. The `--interactive` flag's own help text
says it disables for generative sims; the code does not. Pass `--interactive false` (space separated; the
`--interactive=false` form is not recognised as explicit and falls back to TTY detection) for CI or a
piped run.

:::note[The standalone `sim>` REPL is not reachable]
The engine still ships a module with `/new`, `/save`, `/status` and `quit` at a `sim>` prompt, and older
docs describe it. At 1.1.3 nothing calls it. The commands below are the ones that run.
:::

## The display

With `rich` installed and stdout a TTY you get a layout of a scene title, a status bar (mode, goal, turn),
a scrolling agent log with extension panels beside it, and an input panel. Bio subsystems render dimmed;
narrative and the deliberation subsystems stay bright. Without `rich` or without a TTY, every display call
is a silent no-op and lines go to plain `print`.

The line format is elapsed seconds, a subsystem tag, the agent nickname, `[AUT]` or `[ORCH]` for which
loop emitted it, then the message:

```text
    24.13s [SENSOR      ] [sim_aut] [AUT] 📡 infant_humanoid.stamina=1.00 (baseline=1.00, drift=+0%)
   172.17s [PERCEPT     ] [ORCH] 👁️ [cli] The arena gates open. Sand crunches under your boots.
```

`--display clean|bio|debug` chooses which subsystems appear; the default `bio` includes memory and
learning. See [display tiers](/guides/simulation/outputs/#display-tiers-are-not-log-levels).

## Commands

Typed at the input panel while an orchestrator-driven simulation runs:

| Command | Effect |
|---|---|
| `/cancel`, `/stop`, `/quit` | End the simulation. The finish reason is `cancel`, which exits with code 4, the same code as an infrastructure abort. |
| `/pause` | Tell the orchestrator to stop probing; you can talk to the agent directly. Status shows PAUSED. |
| `/resume` | Resume the orchestrator. |
| `/new <goal>` | Start a new goal while keeping prior findings in context. The goal is required; bare `/new` is not handled. |
| `/status` | Turn count, actions recorded, actions blocked. |
| `/report` | Ask the orchestrator for an interim roundup without stopping. |
| `/display clean\|bio\|debug` | Switch the display tier mid-run. |
| `/focus <name>\|all\|next\|prev` | Switch which agent's panel has focus. Exists because macOS Terminal strips the Shift+arrow modifiers. |
| `/help` | The keybinding and command table. |
| free text | Injected as guidance to the orchestrator. |

After a campaign's report renders, typing a new goal continues the session; `/cancel`, `quit` or `exit`
finish it.

## Grace periods

When the percept source runs dry, the agent loop waits a **180 second** grace period for the agent to
finish acting. Once new actions appear and nothing is pending, it tightens to **15 seconds**. Older docs
give 60 and 5; those were the values before April 2026.

The interactive stall detector also gets a larger budget of orchestrator actions before nudging, twelve
instead of six, on the assumption that a human at the keyboard is the slow part.

## Why learning pauses while you are present

With interactive mode on, the NAc does **not** record causal links from tool outcomes. Three independent
gates enforce it: the executor skips the tool-pain bridge's start record, and the pain bus's two NAc
subscribers return early. The reasoning, in the code's own words, is that human-directed tool calls would
corrupt the causal model with patterns that depend on human presence rather than environmental facts.

Episodic capture is untouched: the hippocampus still records what happened. The agent's system prompt
gains an INTERACTIVE MODE block telling it a human is present and to act first, ask second. The Console's
Adventure and the Roy harness force interactive mode **off** around their runs so learning stays on.

Two consequences follow from the gate being keyed on the terminal rather than on a human actually
having a channel: a generative campaign run at a TTY pauses causal learning even though you cannot type
to it, and `--dm` with a goal string, whose only live effect at 1.1.3 is forcing interactive mode on,
does the same. Pass `--interactive false` when you want the learning recorded.

## Choosing in a DM campaign

In a DM campaign at a terminal you pick from the encounter's numbered choices or type free-text
roleplay that is woven into the scene. Run with `--interactive false` and the agent chooses on its own,
which is the mode benchmarks and CI use. The [DM campaigns guide](/guides/dm-campaigns/) covers the
format; the Console's Adventure surface is a different path and is described on its own page when it
ships.

## Related

- [CLI and environment reference](/guides/simulation/cli/) for `--interactive`, `--display` and the stall settings
- [Generative campaigns](/guides/simulation/generative/) for what the redirect actually runs
