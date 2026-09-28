---
title: Installation
description: Requirements, pip installation, optional extras, and your first run of Maxim.
---

Maxim is a bio-inspired cognitive architecture. This page covers what you need to run it, how to install it, and how to launch it for the first time. Once installed, see [Configuration](/configuration/) to set up your instance and the [CLI Reference](/reference/cli/) for the full command surface.

## Requirements

- **Python 3.10+**
- **Hardware:** Reachy Mini robot (optional — runs in headless mode without one)
- **RAM:** 4GB minimum (8GB+ for larger LLMs)
- **GPU:** Optional. Metal (macOS) or CUDA (Linux) supported
- **Network:** Same LAN as Reachy Mini for device discovery (if using robot)

:::caution[Blackwell GPU Note]
RTX 50-series (Blackwell) GPUs have a known GStreamer/CUDA incompatibility. Maxim auto-detects this and falls back to CPU mode. You can force CPU mode manually with `CUDA_VISIBLE_DEVICES=""`.
:::

## Installation

1. **Install from PyPI**

   ```sh
   pip install pymaxim
   ```

   The package is called `pymaxim` on PyPI, but you import it as `maxim`.

2. **Add LLM support** (pick one or more)

   ```sh
   # Local LLM via llama.cpp
   pip install 'pymaxim[llm-llama]'

   # Claude (Anthropic)
   pip install 'pymaxim[llm-anthropic]'

   # OpenAI / GPT
   pip install 'pymaxim[llm-openai]'
   ```

3. **Pick a model** — no separate download step needed.

   **Local model** — Maxim auto-downloads the GGUF on first run and caches it in `~/.maxim/`:

   ```sh
   maxim --list-models              # see available models + download status
   maxim --llm mistral-7b           # auto-downloads on first use (~4GB for Mistral 7B Q4_K_M)
   ```

   In a non-interactive shell (CI, headless), the download prompt is skipped — set `MAXIM_AUTO_DOWNLOAD_MODELS=1` or pass `--auto-download`. If you ever need to fetch one by hand, the fallback is `python -m maxim.models.download --llm <profile>`.

   **Cloud model** — export a provider key and Maxim auto-enables cloud dispatch; no extra flags required:

   ```sh
   export ANTHROPIC_API_KEY="sk-ant-..."
   maxim --language-model claude-sonnet
   ```

**Developer install:** To work on Maxim itself, clone the repo and use `pip install -e '.[test]'` instead.

## Optional Extras

| Extra | Install Command | What It Enables |
| --- | --- | --- |
| TTS | `pip install 'pymaxim[tts]'` | Text-to-speech (Piper TTS) |
| Semantic | `pip install 'pymaxim[semantic]'` | Neural similarity (SentenceTransformer) |
| Torch LLM | `pip install 'pymaxim[llm-torch]'` | PyTorch transformers backend |
| YOLOv8 | `pip install 'pymaxim[yolo]'` | YOLOv8 vision engine via Ultralytics (AGPL-3.0). Default engine is RTMDet-m (Apache 2.0) |
| Reachy | `pip install 'pymaxim[reachy]'` | Reachy Mini robot support — see the [Reachy Mini guide](/guides/reachy-mini/) |
| Console | `pip install 'pymaxim[console]'` | The local Console backend, `maxim serve` — see the [CLI reference](/reference/cli/#console-server) |
| Sign | `pip install 'pymaxim[sign]'` | Signing and verifying substrate bundles — see [the Oasis](/guides/oasis/#signing-a-release) |

## First Run (No Robot)

Run `maxim` with no arguments to open the Rich interactive menu. Browse available campaigns, pick a recent session, or jump into a mode:

```sh
maxim
```

Or launch exploration mode directly:

```sh
maxim --mode exploration
```

From here, configure your instance with [`maxim config`](/configuration/) and explore the rest of the command surface in the [CLI Reference](/reference/cli/).

## Upgrading to 1.3.1

```sh
pip install --upgrade pymaxim
```

1.3.1 changes some behaviour on purpose. If you call the Python memory API, share
substrate, or run the agent from the CLI or `maxim.run()`, check these first:

- **Memory capture needs an `encoding=` argument.** `Hippocampus.capture()`,
  `capture_from_loop()` (and its async form) and `store()` now require a keyword-only
  `encoding=`, which records what the capture was measured with. A 1.3.0 call without
  it raises `TypeError`. If you measured nothing, say so:
  `encoding=EncodingSignals.unmeasured("api")`, with
  `from maxim.memory.encoding import EncodingSignals`. `capture_from_loop()` also needs
  `situation=`. See the [Hippocampus example](/systems/hippocampus/#capturing-a-memory).
- **Passive mode is now enforced.** The plain CLI agent and `maxim.run()` start in
  passive mode, as before, but passive now refuses the tools that act on the host
  (`bash`, `edit_file`, `git_commit`, `run_tests`, `execute_file` and others). Say or
  type "maxim active" to switch. See [operating modes](/concepts/operating-modes/#enforced-since-131).
- **Sharing substrate:**
  - `maxim hive pull` needs `--receiver-agent-id` for a release in the new format;
  - `hive pull` and `hive contribute` need `--api-key` for a remote or LAN Oasis (the
    local leader key is sent only to an Oasis on this machine);
  - `maxim substrate export --sign` needs `--license`, and a signing key you used
    before 1.3.1 needs `--release-sequence N` once;
  - `maxim oasis publish` needs `--queen-key`, and release ids are now digests of the
    signed payload, so re-pin any `--release <id>`;
  - a newly added Oasis refuses legacy v1 signatures unless you run
    `maxim hive trust <name> --accept-v1`.

  The [Oasis guide](/guides/oasis/) has the full, runnable flow.
- **`--session <id>`** on `maxim substrate` and `maxim hive pull` now finds a
  simulation's session under `~/.maxim/sim_reports/`, and, for `ingest` and `hive pull`,
  a `maxim.create.agent()` name under `~/.maxim/agents/`. An ID found in more than one
  place is refused.
- **`maxim.diagnose()`** runs the same checks as `maxim doctor`. On a machine configured
  as a peer, that includes real network probes.
- **Internet policy now takes effect.** An internet toggle you left off, or a
  hand-written `util/internet_policy.json`, now applies, and a policy file that cannot be
  read or has the wrong types fails closed. Web fetches the model chooses no longer go
  through `HTTP(S)_PROXY`, so they fail behind a mandatory proxy.
- **Config downgrade.** A `config.json` written by 1.3.1 carries a `memory` section that
  older builds refuse.

The engine's
[1.3.1 notes](https://github.com/dennys246/Maxim/blob/main/docs/announcements/release_1_3_1.md#upgrading)
have the complete list, including the sandbox, validation and removed internals.
