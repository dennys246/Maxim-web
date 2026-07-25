---
title: Configuration
description: Maxim's data directory layout, config files, the maxim config command, precedence chain, and environment variables.
---

This page covers where Maxim keeps its configuration and data, and how to change settings. If you haven't installed Maxim yet, start with [Installation](/installation/). For runtime flags and commands, see the [CLI Reference](/reference/cli/).

## Configuration Files

All configuration lives in `~/.maxim/` (override with `$MAXIM_DATA_HOME`):

| File | Purpose |
| --- | --- |
| `llm.json` | LLM model selection, quantization, per-mode response sizing |
| `robots.yaml` | Robot connection settings (type, name, timeout) |
| `phrase_responses.json` | Voice command mappings ("Maxim sleep" → sleep mode) |
| `key_responses.json` | Keyboard shortcut bindings |
| `whisper.json` | Audio transcription settings (model size, compute type) |

## Where Data Lives

```
~/.maxim/
├── util/               # Learned state (JSON)
│   ├── hippocampus.json
│   ├── nac_state.json
│   ├── scn_state.json
│   ├── focus_learner.json
│   ├── learned_bounds.json
│   ├── fear_learning.json
│   └── ...
├── videos/             # Recorded video (MP4)
├── audio/              # Recorded audio (WAV)
├── transcript/         # Transcriptions (JSONL)
├── training/           # Motor training samples (JSONL)
├── plans/checkpoints/  # Goal tree snapshots
├── models/             # ML models
│   ├── LLM/            # GGUF language models
│   ├── MotorCortex/    # Vision-to-motor model
│   └── YOLO/           # Vision models (RTMDet-m + RTMPose-m default; YOLOv8 optional)
├── sandbox/            # Safe space for generated files
└── logs/               # Session logs
```

See [Memory Management](/reference/cli/#memory-management) for clearing learned state selectively.

## `maxim config` (canonical 1.0 path)

**New in 1.0:** the canonical way to persist Maxim's runtime preferences is the `maxim config` verb family writing to `~/.config/maxim/config.json`. The pre-1.0 environment variables below still work as per-session overrides (precedence chain: **CLI args > env vars > config.json > defaults**), but are no longer the recommended primary surface.

`maxim doctor` shows a "Resolved Config" section with every absorbed field's value + source marker — the single answer to "what does this instance think it's configured as?"

```sh
# maxim config — quick start

maxim config set role leader                       # leader / peer / solo
maxim config set llm.profile qwen2.5-32b-instruct  # default model
maxim config set llm.n_ctx 16384                   # context window
maxim config set llm.auto_download true            # download GGUFs on first run
maxim config set auto_spawn.llm_server true        # spawn llama-cpp-server
maxim config set auto_spawn.tunnel true            # spawn cloudflared

maxim config get                                   # all fields + sources
maxim config get llm.profile                       # one field
maxim config edit                                  # opens $EDITOR
maxim config path                                  # print the file path
maxim doctor                                       # "Resolved Config" section
```

## Environment Variables (per-session overrides)

```sh
# Core settings

MAXIM_LLM_ENABLED=1                   # Enable LLM inference
MAXIM_LLM_PROFILE=smollm-1.7b-instruct  # Model profile
MAXIM_LLM_QUANTIZATION=Q4_K_M         # Quantization level
MAXIM_PROMPT_PROFILE=standard          # Prompt optimization tier
MAXIM_ROBOT_NAME=reachy_mini           # Robot identifier

# GPU control

CUDA_VISIBLE_DEVICES=""                # Force CPU-only
MAXIM_LLM_N_GPU_LAYERS=0              # CPU inference
MAXIM_LLM_N_GPU_LAYERS=-1             # All layers on GPU

# Display and audio

MAXIM_DISABLE_IMSHOW=1                 # Disable OpenCV windows
MAXIM_WHISPER_COMPUTE_TYPE=float32     # Whisper precision fallback

# Headless / adaptive runtime

MAXIM_ROBOT_TIMEOUT=5                  # Reduce robot connect timeout (default 30s)
MAXIM_PROVENANCE_VERBOSITY=1           # 0=off, 1=compact, 2=verbose
MAXIM_PROVENANCE_PERSIST=1             # 0=disable, 1=enable persistence

# Networking & diagnostics

MAXIM_ROLE=leader                      # leader / peer / solo (legacy `client` term coerces to `peer` with WARN)
MAXIM_HEARTBEAT=1                      # System health heartbeat (GPU/CPU/RAM)
MAXIM_LANE_TRACE=1                     # Per-request LLM trace + heartbeat
MAXIM_PROXY_MAX_CONCURRENT=4           # Max in-flight proxy requests
MAXIM_PROXY_RATE_LIMIT_RPM=0           # Per-peer rate limit (0=unlimited)

# Routing & downloads (peer/leader flexibility)

MAXIM_LLM_N_CTX=4096                   # Override auto-computed llama.cpp n_ctx (P4c)
MAXIM_AUTO_DOWNLOAD_MODELS=1           # Skip the download prompt (P5) — same as --auto-download
MAXIM_DATA_BUDGET_GB=50                # Optional soft cap on ~/.maxim disk usage
MAXIM_SKIP_REMOTE_PROBE=1              # Bypass the P6 remote-URL probe (CI escape hatch)
MAXIM_REMOTE_PROBE_CACHE_TTL_S=60      # Probe-cache freshness window (clamped 0-600)
```

## Prompt Profiles

Three tiers of cognitive effort, matched to your hardware:

| Profile | Max Depth | LLM Calls | Parallelism | Best For |
| --- | --- | --- | --- | --- |
| minimal | 2 levels | 8 max | None | CPU-only, low RAM, Raspberry Pi |
| standard | 5 levels | 20 max | 4 workers | Laptop with GPU or fast CPU |
| rich | 7 levels | 50 max | 8 workers | Desktop with dedicated GPU |

Select a profile per session with `--prompt-profile` or persistently via `MAXIM_PROMPT_PROFILE` — see the [CLI Reference](/reference/cli/) for the full option list.
