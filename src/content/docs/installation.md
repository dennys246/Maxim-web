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
