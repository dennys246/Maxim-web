---
title: CLI Reference
description: Maxim command-line options, peer and tunnel commands, voice and keyboard controls, memory management, and debugging.
---

Full reference for the `maxim` command line. For installing Maxim see [Installation](/installation/); for persistent settings and environment variables see [Configuration](/configuration/).

## Command-Line Options

```text
Basic usage

maxim [OPTIONS]

Connection

--robot-name TEXT            Robot identifier (default: reachy_mini)
--home-dir PATH              Data directory (default: ~/.maxim/)
--timeout FLOAT              Connection timeout in seconds (default: 30.0)

Execution

--mode MODE                  exploration|live|agentic|sleep|reflection|train
--epochs INT                 Stop after N cycles (0 = unlimited)
--audio true|false           Enable audio recording (default: true)
--audio_len FLOAT            Transcription chunk duration (default: 5.0s)
--interactive true|false     Enable interactive mode (default: true for TTY + DM campaigns)
                             Human picks choices, types roleplay, sees Rich display
                             Use --interactive false for CI, scripts, or autonomous runs
                             NAc learning is suppressed while interactive mode is active

Agentic mode

--language-model TEXT        LLM profile (e.g., mistral-7b)
--prompt-profile TIER        minimal|standard|rich
--autonomy LEVEL             planning|supervised|autonomous
--autonomy-duration FLOAT    Timed autonomy in seconds
--memory-path PATH           Memory persistence file
--reset                      Clear memory on startup
--enable-embeddings          Enable semantic similarity (Phase 4)

Multi-LLM & Cloud

--cloud-fallback MODEL       Cloud fallback on large tier (e.g., claude-sonnet)
--cloud-lane TIER MODEL      Assign cloud model to a tier (e.g., small claude-haiku)
--cloud-budget DOLLARS       Max session cost for cloud providers (default: $5)
--aut-model MODEL            Separate LLM for agent-under-test (dual-LLM mode)

Network

--internet-access            Enable internet (default)
--no-internet                Disable internet access

Audio / TTS

--tts                        Enable text-to-speech
--tts-model TEXT             Voice model (default: en_US-lessac-medium)

Maintenance

--clear-cache                Remove __pycache__ directories
--clear-memory [TYPE]        Clear persistent memory and exit
--log-level 0|1|2            Logging level (alias: --verbosity, deprecated)
--display bio|clean|debug    Output detail (DEFAULT: bio)
--no-agentic-console         Suppress agentic event output
--audit-architecture         Audit codebase for architecture layer rule violations and exit
```

The `--mode` and `--autonomy` values combine processing states (awake/sleep), operational modes (passive/active/singularity), and strategies (observe/explore/research/assist/reflect/learn) — see [Operating Modes](/concepts/operating-modes/) for the full breakdown.

## Peer & Tunnel Commands

Connect peers to a leader's GPU for distributed inference. See [Networking & Mesh](https://www.dennyschaedig.com/maxim/networking) for full details.

```sh
# Environment diagnostics

maxim doctor                           # Platform-aware health checks
maxim doctor --retry                   # Walk through failures interactively
maxim doctor --json                    # Machine-readable output (CI/scripts)
maxim doctor --as peer https://...     # Peer-mode connectivity checks
maxim doctor --as leader               # Force leader-mode checks

# Tunnel setup (leader machine)

maxim tunnel setup                     # One-time guided tunnel config
maxim tunnel status                    # Show tunnel + key state
maxim tunnel key rotate                # Generate/replace API key
maxim tunnel key export                # Print peer export snippets

# Peer setup (client machine)

maxim peer connect https://maxim.yourdomain.com/v1
maxim peer show                        # Verify peer config
maxim peer test https://maxim.yourdomain.com/v1
maxim --llm mistral-7b                 # Per-session local override (wins over peer)
maxim doctor --last-decision           # Why did the last sim pick this model? (P9)

# Model profile management (leader/standalone)

# Bundled profiles include qwen2.5-32b, mixtral-8x7b, llama-3.1-70b
# for capable hardware. Beyond that, register custom profiles:

maxim model add my-qwen-32b-q5 \
    --hf bartowski/Qwen2.5-32B-Instruct-GGUF:Qwen2.5-32B-Instruct-Q5_K_M.gguf \
    --n-ctx 32768
maxim model add my-local --local ~/models/custom.gguf --chat-format llama3_instruct
maxim model list                       # show user profiles
maxim model remove my-qwen-32b-q5

# Profiles live in ~/.config/maxim/profiles.yml; user profiles win
# over bundled ones on collision. Chat-format auto-inferred from name
# when possible. See llm-setup.md § Adding Custom Profiles.

# Debug trace (see everything)

MAXIM_LANE_TRACE=1 maxim               # Trace every LLM call
MAXIM_HEARTBEAT=1 maxim                # System health every 10s
```

## Common Recipes

### Full Agentic Mode with Mistral

```sh
maxim --mode live \
  --language-model mistral-7b \
  --prompt-profile standard \
  --autonomy supervised
```

### CPU-Only with Small Model

```sh
CUDA_VISIBLE_DEVICES="" maxim \
  --mode live \
  --language-model smollm-1.7b \
  --prompt-profile minimal
```

### Verbose Debugging Session

```sh
maxim --mode live \
  --log-level 2 \
  --display debug \
  --language-model phi-3-mini
```

For a first run without a robot, see [Installation](/installation/#first-run-no-robot).

## Voice Commands

All voice commands begin with the wake word *"Maxim"*:

| Command | Effect |
| --- | --- |
| "Maxim sleep" | Enter sleep mode (audio monitoring only) |
| "Maxim wake up" | Return to previous active mode |
| "Maxim observe" | Switch to observe strategy |
| "Maxim explore" | Switch to explore strategy |
| "Maxim assist" | Switch to assist strategy |
| "Maxim reflect" | Switch to reflect strategy |
| "Maxim passive" / "active" / "singularity" | Switch operational mode |
| "Maxim shutdown" | Clean shutdown |

See the [Operating Modes](/concepts/operating-modes/#switching) page for the full list. Custom voice commands can be added in `~/.maxim/util/phrase_responses.json`.

## Keyboard Controls

Available in interactive mode (default):

| Key | Action |
| --- | --- |
| `c` | Center vision |
| `u` | Mark trainable |
| `0` | Label: no errors |
| `1`-`9` | Label: error code |
| `q` | Quit |

## Memory Management

### Clearing Memory

```sh
# Clear everything
maxim --clear-memory all

# Clear specific types
maxim --clear-memory focus,bounds    # Movement learning only
maxim --clear-memory nac,hippo       # Decision learning + episodes
maxim --clear-memory pain,fear       # Safety learning only
```

### Available Memory Types

| Type | What It Clears | Effect |
| --- | --- | --- |
| `focus` | FocusLearner gains | Resets movement calibration |
| `bounds` | Workspace limits | Relearns reachable space |
| `nac` | Causal links | Forgets action-outcome predictions |
| `scn` | Temporal patterns | Forgets time-of-day associations |
| `hippo` | Episodic memories | Complete amnesia |
| `pain` | Pain thresholds | Resets pain sensitivity |
| `fear` | Fear associations | Forgets learned dangers |
| `escalation` | Escalation thresholds | Resets when to ask for help |
| `threshold` | Adaptive thresholds | Resets all learned limits |
| `semantic` | Neural embeddings | Resets similarity cache |

Learned state lives under `~/.maxim/util/` — see the [directory layout](/configuration/#where-data-lives) in Configuration.

## Debugging

### Verbosity Levels

| Level | What You See |
| --- | --- |
| 0 | Errors only |
| 1 | Key events (mode changes, goals, tool calls) |
| 2 | Detailed processing (every detection, memory query, decision) |
| 3 (agentic only) | Full trace (LLM prompts, raw responses, bridge activity) |

### Inspecting Learned State

```python
# Python: inspect memory

from maxim.memory.hippocampus import Hippocampus

hippo = Hippocampus()
hippo.load(str(Path.home() / ".maxim" / "memory" / "hippocampus.json"))
print(f"Total memories: {len(hippo._memories)}")

for mem_id, mem in list(hippo._memories.items())[:5]:
    print(f"  {mem.action.tool_name} → {mem.outcome.success}")

# Python: inspect NAc learning

from maxim.decisions.nac import NAc

nac = NAc()
nac.load(str(Path.home() / ".maxim" / "util" / "nac_state.json"))
for sig, links in nac._links.items():
    for link in links:
        print(f"  {sig}: conf={link.confidence:.2f}, val={link.outcome_valence}")
```

### Hardware Diagnostics

```sh
maxim-diagnostics --host 192.168.1.100
```

Checks Zenoh connection, motor controller, video stream, and audio stream availability.

### Log Files

Session logs are written to `~/.maxim/logs/reachy_log_YYYY-MM-DD_HHMMSS.log` with timestamps, thread IDs, and structured event data.

### Getting Help

Maxim is open source. If you run into issues, check the [GitHub repository](https://github.com/dennys246/Maxim) for the latest documentation and issue tracker.
