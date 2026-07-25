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

> **Naming note:** older material referred to the levels as *passive*,
> *active*, and *singularity*. The canonical names in the codebase
> (`AutonomyLevel` in `src/maxim/agents/autonomy.py`) are `planning`,
> `supervised`, and `autonomous`; the old names survive only as voice-command
> aliases.

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

The default mode. The agent observes, understands, and proposes actions
without unilateral execution — it waits for your approval before acting.

- **Max initiative:** 0.3 (mostly reactive)

| Permission | Access |
|------------|--------|
| Sandbox (`.maxim_sandbox/`) | Always writable |
| CWD files | Read only, edits require approval |
| Code execution | Not allowed |
| Network | Allowed |

Forbidden tools: `execute_file`, `maxim_command`, `request_directory_change`

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
- "Maxim passive" — switch to `planning` mode
- "Maxim active" — switch to `supervised` mode
- "Maxim singularity" — switch to `autonomous` mode

(The passive/active/singularity phrasings are the legacy aliases mentioned
above, kept for voice ergonomics.)

### Agent tools

- **`mode_switch`** — switch between operational modes. Logs switches with
  timestamps and reasoning.
- **`autonomy_level`** — request autonomy changes. Dropping to a more
  restrictive level is always allowed; requesting *more* autonomy goes
  through a proposal queue and requires human approval.
- **`sleep`** — enter the sleep processing state. The agent wakes
  automatically when user input arrives.

An emergency halt drops the agent to `planning` immediately and pauses
execution until a human resumes it.

## See also

- [Architecture](/concepts/architecture/) — how the agent loop and Default
  Network fit together
- [Memory systems](/memory/overview/) — what the sleep-time consolidation
  works on
- [Installation](/installation/) — CLI flags and first run
- [Modes guide in the pymaxim repo](https://github.com/dennys246/Maxim/blob/main/docs/user/modes-guide.md)
