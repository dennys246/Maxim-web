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
--home-dir PATH              Run-artifact directory, relative to cwd (default: data)
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

Connect peers to a leader's GPU for distributed inference. See [Networking & mesh](/guides/networking/) for full details.

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

## Substrate Bundles

`maxim substrate` moves learned state — NAc reward biases and EC concept clusters,
never episodes — between installs as a zip bundle, optionally signed. Seven verbs:

```bash
maxim substrate export out.zip --session <id|dir> --contributor-id <id> [--domain <tag>] [--sign]
maxim substrate inspect out.zip                        # print the manifest, extract nothing
maxim substrate import out.zip --output-dir <dir>      # extract the bundle; does NOT merge it
maxim substrate ingest out.zip --session <id|dir> --receiver-body <ref> [--apply]
maxim substrate keygen --identity <id>                 # mint + print the signing public key
maxim substrate invalidate --session <id|dir> --modality <name> [--apply]
maxim substrate merge-nac policy.json [--into ~/.maxim/memory/nac.json] --source-id <id>
```

- **`ingest` is the cross-substrate merge, and it is new in 1.2.** It runs the
  receiver-side validation contract — contributor trust and provenance stamping,
  numeric bounds, count and confidence caps, strict geometry, an identity and content
  re-scrub, resource caps, declared-slices-only reads, and a digest-deduped journal —
  then merges through `substrate_merge`: the donor's clusters aligned onto the
  receiver's, the donor's biases re-keyed through that map, then folded, with a
  tighten-only clamp so an import can deepen a learned aversion but never raise it
  toward zero. It is a **dry run until `--apply`**, the receiver must be at rest, and
  the pair is backed up and journalled before any write. Add `--require-signed
  --trust-key <id>=<pubkey>` to refuse anything not signed by a key you name. This is
  the path the [Exp 56 transfer result](/research/evidence/#a-taught-want-transfers-between-independent-agents)
  ran through; the network wrapper around it is [the Oasis](/guides/oasis/).
- **`import` extracts and stops.** It writes the bundle's `nac.json` / `ec.json`
  slices to a directory and leaves what to do with them to you — use `ingest` to
  actually merge one. Hand-composing `ec_merge` + `nac_merge`, which this tool's own
  help text recommended before 2026-09-02, merges the two slices independently and
  discards the alignment, so the donor's biases land under clusters the receiver has
  no node for and the merged want reads out as 0.0 (D43). The library entry point
  behind `ingest` is `maxim.hivemind.substrate_merge`.
- **`merge-nac` is a same-substrate import.** It folds a trained policy file into a
  runtime `nac.json` on disk, for a policy trained in the *same* state space (the
  Reachy orient policies are the intended use). It is one-shot — re-running it
  double-counts observations — and it never touches a running bio-stack; the runtime
  picks the file up at next boot.

## Oasis & Hive (substrate exchange)

New in 1.2: the peer-to-peer half of substrate sharing. `maxim oasis` runs the server
side, `maxim hive` is the client. Full walkthrough on [the Oasis](/guides/oasis/).

```bash
maxim oasis serve [--root <dir>] [--port <n>] [--bind-host <addr>]
maxim oasis publish signed-bundle.zip     # add to the Queen-tier release store (refuses unsigned)
maxim oasis status                        # release / experimental tier counts

maxim hive add <name> <url> --queen-key <id>=<pubkey> [--domain <tag>]
maxim hive list | maxim hive remove <name>
maxim hive trust <name> [--allow-unsigned] [--inherent] [--trust-source <id>]
maxim hive pull --from <name> --session <id|dir> --receiver-body <ref> [--apply]
maxim hive contribute bundle.zip --to <name>
```

- **`pull` delegates to `substrate ingest`** rather than reimplementing it, so the
  signature check, the validation duties and the journal are the same ones above. It
  is a dry run until `--apply`, and it refuses a release whose signer is not a Queen
  key registered for that Oasis.
- **Trust defaults to Queen-only.** `hive trust --allow-unsigned` disables signature
  verification for that Oasis's release stream — it is the check itself, off, not a
  lower tier. Contradictory flags error rather than granting the looser setting.
- **`oasis serve` fails closed.** Binding a non-loopback interface without a bearer
  key is refused unless you pass `--insecure`.
- **Nothing promotes a contribution.** `hive contribute` writes into an experimental
  tier that no shipped verb promotes to Queen tier; that gate is
  [deliberately not shipped in 1.2](/guides/oasis/#what-isnt-shipped).

The registry lives at `~/.config/maxim/hive.json` (name → URL, Queen public keys,
subscribed domains). It holds no secrets: Queen keys are public verification anchors.

## Console server

`maxim serve` runs the local Console backend that the
[maxim-pulse](https://github.com/dennys246/maxim-pulse) app talks to. It needs the
`console` extra (`pip install 'pymaxim[console]'`); without it the command exits
naming that extra.

```bash
maxim serve [--port PORT] [--ui-dist PATH]   # 127.0.0.1 only; port from config console.port, default 8765
maxim serve --show-token                     # print the console token (creating it if absent) and exit
maxim serve --rotate-token                   # mint a NEW token, logging every device out, and exit
maxim serve --dump-openapi [PATH]            # write the OpenAPI schema and exit
```

- **Bearer auth, always on, fail-closed (since 1.1.4; console contract 0.5.0 since
  1.2.0).** At
  start the server prints a one-time sign-in URL of the form
  `http://127.0.0.1:8765/#token=…`; open it once and that browser is signed in.
  Every `/api/*` route, `/docs`, `/openapi.json` and `/ws` require the token;
  `GET /api/hello` is the one tokenless probe and answers
  `{"contract_version": "0.5.0", "auth": "bearer"}`. A token passed as a query
  parameter is refused. The token is an `mxc_`-prefixed secret in
  `~/.config/maxim/console_token`, re-read on every request, so `--rotate-token`
  takes effect without a restart.
- **API clients send it as a header.** `--show-token` prints the bare token, so:

  ```bash
  curl -s -H "Authorization: Bearer $(maxim serve --show-token)" \
    http://127.0.0.1:8765/api/identity
  ```

- **Sandbox mode is the exception.** With `MAXIM_CONSOLE_SANDBOX=1` authentication is
  the fronting proxy's job, and the engine instead closes `/api/probe` (the `url`
  form), `/api/setup/mesh` and `/api/diagnose`, refuses `/ws` upgrades whose Origin
  is not in `MAXIM_CONSOLE_ALLOWED_ORIGINS`, and caps run input at
  `MAXIM_CONSOLE_MAX_INPUT_CHARS`. A browser-relay guard (Host and Origin checks
  against loopback plus the allowed list) is on in every mode.
- **The bundled UI matches the server again, as of 1.2.1.** Through 1.2.0 the
  vendored Console bundle lagged the contract the server spoke — 0.3.0 against 0.4.0
  in the 1.1.4 wheel, then 0.4.0 against 0.5.0 in the 1.2.0 one — so `maxim serve`
  warned at start ("parts of the UI may not work") and the UI drew a banner on every
  screen. 1.2.1 vendors the maxim-pulse v0.3.0 bundle, which speaks 0.5.0: both the
  warning and the banner are gone. The API surface was never affected by the
  mismatch. `--ui-dist` still points the server at a bundle you built yourself.
- **Spoken-code device pairing (A9.1) is available, and hardware verification is
  owed.** A device with a speaker — a Reachy Mini is the case it was built for — can
  sign its owner in by *saying* a six-digit code aloud instead of handing over a URL:
  a tokenless request makes the device announce the code, and a second exchanges the
  code for the console token. The 1.2.1 pairing screen is the UI half; the library
  halves are `maxim.console.make_pairing_announcer` and
  `maxim.utils.audio.make_device_speak_sink`. Two properties are **not yet verified
  on a robot** and are tracked as
  [D87](https://github.com/dennys246/Maxim/blob/main/docs/bugs/README.md): whether the
  device's fixed-rate audio pipeline matches the speech synthesizer's 22050 Hz (a
  mismatch would play the digits at the wrong pitch and speed, which for a code read
  aloud is a functional failure, not a cosmetic one), and whether synthesis plus a
  digit-by-digit repeat fits inside the code's 120-second lifetime on hardware as slow
  as a Pi. Treat it as shipped and unverified on the device, not as validated there.
  The endpoints are refused entirely unless an embedder wires an announcer, and under
  sandbox mode.

## Common Recipes

### Full Agentic Mode with Mistral

```sh
maxim --mode live \
  --language-model mistral-7b \
  --autonomy supervised
```

### CPU-Only with Small Model

```sh
CUDA_VISIBLE_DEVICES="" maxim \
  --mode live \
  --language-model smollm-1.7b
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

See the [Operating Modes](/concepts/operating-modes/#switching-modes-at-runtime) page for the full list. Custom voice commands can be added in `~/.maxim/util/phrase_responses.json`.

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

`--log-level` (alias `--verbosity`) accepts only `0`, `1` or `2`; argparse rejects
anything else. For a full trace — LLM prompts, raw responses, bridge activity —
use `--trace`, `--debug`, or `--sim-debug` instead.

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
