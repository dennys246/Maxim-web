---
title: Operating modes
description: Maxim's two-axis state model — an awake/sleep processing state and three autonomy levels (planning, supervised, autonomous) with per-level permission bounds.
---

Maxim's behavior is controlled by two independent dimensions: *how much it
processes* (awake or sleeping) and *how much authority it has* (planning,
supervised, or autonomous). Sleep is not a mode — the agent enters it by
calling the `sleep` tool, and wakes automatically when user input arrives.

## The two-axis model

Maxim's state is tracked by two independent axes:

```yaml
MaximState:
  processing_state: awake | sleep                        # Resource usage
  operational_mode: planning | supervised | autonomous   # Action authority
```

1. **Processing state** — `awake` or `sleep`. Determines whether the agent
   loop is running and how many resources it consumes.
2. **Autonomy level** — `planning`, `supervised`, or `autonomous` (set via
   `--autonomy`). Controls permissions: which tools are available, whether
   code execution is allowed, and filesystem access.

A sleeping agent retains its operational mode and wakes automatically when
user input arrives, resuming exactly where it left off.

> **Naming note:** each level has two names, and both are live in the code. The
> operational modes that define permissions and are enforced at dispatch
> (`OperationalMode` in `src/maxim/modes/definitions.py`) are *passive*, *active* and
> *singularity*; the autonomy levels that `--autonomy` takes (`AutonomyLevel` in
> `src/maxim/agents/autonomy.py`) are `planning`, `supervised` and `autonomous`. They
> map one to one: passive is planning, active is supervised, singularity is
> autonomous.

## Autonomy levels

The three operational modes control how much authority Maxim has. Each level
sets a maximum initiative value between 0.0 (fully reactive) and 1.0 (fully
proactive).

| Mode | What it does | Max initiative |
|------|--------------|:--------------:|
| `planning` | Propose actions, wait for approval | 0.3 |
| `supervised` | Act within defined boundaries | 0.7 |
| `autonomous` | Full autonomy, self-correcting | 1.0 |

### Planning

The default mode, and the one the plain CLI agent and `maxim.run()` start in. The
agent observes, understands, and proposes actions without unilateral execution.

- **Max initiative:** 0.3 (mostly reactive)

| Permission | Access |
|------------|--------|
| Workspace (`.maxim_workspace/`) | Always writable — drafts, notes, plans |
| CWD files | Read only; proposed edits go to the workspace as drafts |
| Commands, tests, edits, commits | Refused (since 1.3.1) |
| Code execution | Not allowed |
| Network | Allowed |

Forbidden tools: `execute_file`, `maxim_command`, `request_directory_change`. Since
1.3.1 passive also refuses every tool that acts on the host — `bash`, `edit_file`,
`git_commit`, `run_tests`, `execute_file`, `execute_sandbox_script`,
`request_directory_change`, `internet_access_toggle` and `maxim_command` — at the
moment the tool would run, not only by leaving it out of the prompt.

### Supervised

The agent executes tasks and takes actions within defined boundaries;
significant operations are gated by approval.

- **Max initiative:** 0.7 (proactive within bounds)

| Permission | Access |
|------------|--------|
| Sandbox | Full read/write |
| CWD files | Read + suggest edits (shown for approval) |
| Code execution | Requires approval |
| Network | Allowed |

No forbidden tools (execution gated by approval).

### Autonomous

Full autonomy. The agent decides and acts on its own, self-correcting and
learning continuously. Safety and ethical constraints (the Constitution)
still apply unconditionally.

- **Max initiative:** 1.0 (fully proactive)

| Permission | Access |
|------------|--------|
| Sandbox | Full access including execution |
| CWD files | Full read/write/execute |
| Code execution | Allowed |
| Network | Allowed |

No forbidden tools, full tool access.

### Choosing a level at startup

```bash
# Start in planning mode (default)
maxim --language-model mistral-7b

# Start in supervised mode
maxim --autonomy supervised --language-model mistral-7b

# Time-boxed autonomous mode
maxim --autonomy autonomous --autonomy-duration 600
```

When a timed autonomous window expires, the agent drops back to supervised
automatically.

## Sleep

Sleep is a *processing state*, not a mode. The agent enters sleep by calling
the `sleep` tool. It retains its operational mode but dramatically reduces
processing.

**Awake — full processing:**

- Full LLM processing active
- All tools available (per mode constraints)
- Default Network (orienting, social) enabled
- Video and audio capture running

**Sleep — background only:**

- LLM processing is skipped
- Background tasks run: memory consolidation, pattern extraction
- Only the `respond` tool is available
- Default Network disabled
- Wakes automatically on user input (text, voice, or wake keyword)

Like biological sleep, Maxim's sleep state isn't unconsciousness. It's active
maintenance: consolidating memories, extracting patterns, cleaning up. The
audio monitoring is analogous to the brain's ability to detect your name even
while sleeping.

## Headless mode

When no robot hardware is detected, Maxim automatically enters headless
mode — the full agent loop runs without media capture, motor control, or
Default Network overhead. Detection uses mDNS: if the robot's hostname
doesn't resolve within 5 seconds, Maxim skips the SDK connection and starts
immediately.

Headless mode means:

- Full LLM processing and agent loop active
- CLI input and file-change perception only (no video/audio)
- Default Network disabled (no motor commands)
- Frame/audio capture workers not started
- All bio memory systems active (Hippocampus, ATL, NAc, AG, EC)
- Tools, provenance, and concept memory fully operational

Set `MAXIM_ROBOT_TIMEOUT=5` (seconds) to tune the mDNS timeout for faster
headless startup. The system uses capability detection, not mode flags —
like a biological organism adapting to sensory loss rather than requiring an
explicit switch.

## Switching modes at runtime

You do not have to restart Maxim to change modes.

### Voice commands

- "Maxim sleep" — enter sleep (calls the `sleep` tool)
- "Maxim wake up" — wake from sleep
- "Maxim passive" — switch to passive (`planning`)
- "Maxim active" — switch to active (`supervised`)

"Maxim singularity" is **refused** since 1.3.1, spoken or typed: any audio in the room —
a video, the robot's own speech — could say it. Starting Maxim in a mode deliberately is
unchanged.

### Agent tools

- **`mode_switch`** — switch between operational modes. Logs switches with
  timestamps and reasoning. Since 1.3.1 it refuses a switch into any mode that can
  execute code (today, singularity), and records the refusal.
- **`autonomy_level`** — request autonomy changes. Dropping to a more
  restrictive level is always allowed. Requesting *more* autonomy needs a human
  approver, and no shipped runtime attaches one yet: since 1.3.1
  ([#827](https://github.com/dennys246/Maxim/issues/827)) such a request fails with that
  reason instead of waiting forever in a queue nothing reads. The approval surface is
  engine issue [#922](https://github.com/dennys246/Maxim/issues/922).
- **`sleep`** — enter the sleep processing state. The agent wakes
  automatically when user input arrives.

An emergency halt drops the agent to `planning` immediately and pauses
execution until a human resumes it.

## Enforced since 1.3.1

Before 1.3.1 a mode's limits were applied to the prompt only: a tool the mode
excluded still ran if the model named it. 1.3.1 enforces them where tools run, and
closes the ways the agent could raise its own authority. What that buys, and what it
does not:

- **The executor checks the live mode at every tool call** (engine
  [#826](https://github.com/dennys246/Maxim/issues/826)). It refuses the mode's
  forbidden tools, the tools its capabilities exclude, and — in passive — the tools that
  act on the host. Memory, introspection and protocol tools, and tools you register with
  `maxim.register_tool`, work in every mode.
- **The agent cannot put itself into singularity**
  ([#821](https://github.com/dennys246/Maxim/issues/821),
  [#828](https://github.com/dennys246/Maxim/issues/828)). The mode tool and the CLI
  refuse a self-requested switch into any mode that can execute code, and so does the
  spoken phrase.
- **The honest limit: passive → active is not gated**
  ([#924](https://github.com/dennys246/Maxim/issues/924), open). Active mode runs shell
  and sandbox tools under approval, and a non-interactive run answers every
  confirmation "yes", so an unattended passive agent can still switch itself to active
  and act. Treat passive as a default, not a boundary, until #924 and the approval
  surface (#922) land.
- **The sandbox runs what was approved, and only inside the sandbox**
  ([#800](https://github.com/dennys246/Maxim/issues/800)–[#802](https://github.com/dennys246/Maxim/issues/802)).
  Python scripts now run at all (the restricted wrapper used to block its own imports);
  containment compares resolved paths and does not follow a symlink out; what runs is
  the content that was approved, not whatever is at the path later. A script that needs
  approval, with no approver attached, does not run. The Python import restrictions are
  defense in depth, not a boundary — the resource limits and the container are. No
  shipped runtime wires the sandbox tools today.
- **A web fetch the model chooses connects only to the public address it checked**
  ([#824](https://github.com/dennys246/Maxim/issues/824)), which closes DNS
  rebinding, and the byte cap now bounds the download itself
  ([#825](https://github.com/dennys246/Maxim/issues/825)). These fetches no longer use
  `HTTP(S)_PROXY`.
- **Tool output reaches the model fenced as untrusted data**
  ([#823](https://github.com/dennys246/Maxim/issues/823)), so a fetched page's own
  "instructions" no longer look like the prompt's. Fencing cannot stop a model from
  choosing to follow injected text.

## See also

- [Architecture](/concepts/architecture/) — how the agent loop and Default
  Network fit together
- [Memory systems](/memory/overview/) — what the sleep-time consolidation
  works on
- [Installation](/installation/) — CLI flags and first run
- [Modes guide in the pymaxim repo](https://github.com/dennys246/Maxim/blob/main/docs/user/modes-guide.md)
