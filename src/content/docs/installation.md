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

## Upgrading to 1.3.2

```sh
pip install --upgrade pymaxim
```

### Leaders first: the security fix

If any machine you run is a **leader** (it hosts a model for peers), do this before anything
else, **on that machine**, and then stop and start Maxim there. That includes a machine that
became a leader by default, which the Python API (`maxim.run`, `maxim.create.router`) also did
on any host with a GPU, Apple Silicon included ([advisory](https://github.com/dennys246/Maxim/security/advisories/GHSA-7qh4-mp34-88v9)):

0. On the leader itself, `pip install --upgrade pymaxim`.
1. Run `maxim doctor` on it. It now fails a leader that could not start, and shows whether
   remote admin is on.
2. If it was a leader only because no role was set, make that explicit:
   `maxim config set role leader`. The default role is now `solo`.
3. If it has no mesh key, create one with `maxim tunnel key rotate`, then give it to each peer
   with `maxim peer key set <key>`. If the key file is readable by others, fix it with
   `chmod 600 ~/.config/maxim/api_key`. A leader without a usable key exits with code 2 and names
   the path and the fix.
4. If you use `maxim peer update`, `install`, `restart` or `llm`, opt in on the leader:
   `maxim config set proxy.allow_remote_update true`. The old `MAXIM_ALLOW_REMOTE_UPDATE`
   variable is ignored now, because older leaders set it themselves.
5. Peers that called the leader at `http://<leader>:8100` directly must use `:8099`. The model
   server now listens on `127.0.0.1` only.

A machine that now stays `solo` by default, with a cloud API key in its environment and no
`llm.profile` set, may auto-select a cloud model.

**Do not upgrade a leader with `maxim peer update && maxim peer restart`.** A remote restart
reuses the old process's environment, and a leader that now refuses to start leaves you no
remote way back.

1.3.2 turns several silent losses into errors. If you use the Python memory API, load past
runs, keep an internet policy file, or give the agent host tools, check these first.

**Memory stores**

- **A store will not save over a file it never read.** `Hippocampus.save()`, `ATL.save()`,
  and the NAc, EC, SCN, AngularGyrus and cross-layer graph saves raise
  `StoreOverwriteRefused` (a `FileExistsError`, exported from `maxim`) when the file exists
  and this instance neither read nor created it. To keep the memories, open the store with
  `maxim.load.hippocampus(path)` (or `load.atl`, `load.nac`) and save it back with that path:
  `hippo.save(path)`. A store from `load.*` has no path of its own: a bare `save()` raises
  `ValueError` for Hippocampus and NAc, and silently does nothing for ATL, so always pass the
  path. To replace the file on purpose, pass `save(overwrite=True)` or call
  `allow_overwrite()` first.
- **`maxim.create.hippocampus` and `create.atl` refuse an existing store** when they are
  built, not at the first save. Use `maxim.load.*` to keep it, or `overwrite=True` to replace
  it. `maxim.create.agent(name)` raises `FileExistsError` if that agent already has state; use
  `maxim.load.agent(name)`.
- **Loading is stricter.** `Hippocampus.load()` and `ATL.load()` raise `FileNotFoundError` on a
  missing file (`load(missing_ok=True)` keeps the old behaviour), and `maxim.load.*` raises
  `MemoryCorruptionError` for an unreadable file. An unreadable file is kept as
  `<name>.corrupt-<UTC time>` before a store starts fresh.
- **`~` is expanded** in every store path, so `"~/..."` now means your home directory. Before,
  it wrote a directory literally named `~` and `load.hippocampus("~/...")` returned an empty
  store.
- **`export_memories()["memory_summaries"]`** items no longer carry `valence` (it was always 0).
  Read `outcome` instead: `success`, `failure` or `unknown`.

**Runs and data**

- **`maxim.load.session(id)`** resolves an exact id or a path first. A prefix that matches more
  than one run raises `maxim.RunDirAmbiguous`; before, it silently loaded the newest. An id
  that also names a directory in your working directory is refused as ambiguous, so pass a
  path to be exact.
- **The Python API follows `MAXIM_DATA_HOME`.** `maxim.run`, `maxim.observe` and `maxim.recall`
  default to the data home, not a literal `~/.maxim`. `maxim.run(learning=True)` keeps its agent
  in `<data home>/agents/api_agent/`; the first run moves the old files there once.
- **`--sim research`** writes under `<data home>/sim_reports/`, not `./data/sim_reports/` in
  the directory you ran it from.

**Configuration**

- **`maxim config set` pins a value** even when it equals the default, and `maxim config unset
  <field>` returns it to the default.
- **`maxim config set` refuses a file written by a newer Maxim.** `maxim config downgrade` keeps
  the settings this build knows and sets the rest aside in `config.preserved.json`; after
  upgrading again, `maxim config restore-preserved` offers them back, one field at a time.

**Internet**

The internet policy turns the internet **off**, and says why, when:

- `util/internet_policy.json` has a key this build does not know (a typo such as
  `block_domain` used to be ignored, which dropped the block list);
- `util/internet_access.json` is unreadable, or its `enabled` is not a real boolean;
- an entry is a wildcard (`*.example.com`; a domain already covers its subdomains), or a symbol
  or emoji domain that IDNA 2008 rejects (rewrite it in its `xn--` form).

A robots.txt that cannot be read (a 5xx, a 429, a timeout) now refuses the fetch instead of
allowing it; a missing one (a 4xx) still means no restrictions.

**Modes and host tools**

- **The agent can only lower its own capability.** Its `mode_switch` tool refuses any switch
  that gains capability, including passive → active, which 1.3.1 still allowed, and a mode
  request from the robot runtime must lower capability. The operator's grant is the new launch
  flag `--operational-mode passive|active|singularity`, which needs an explicit `--mode` and is
  refused with `--sim`, `--research`, `--benchmark` and `--foundry`. `singularity` is reachable
  only this way. See [operating modes](/concepts/operating-modes/#since-132-capability-goes-down-not-up).
- **Host tools get a clean environment.** `bash`, `execute_file`, `run_tests`, `git_diff` and
  `git_commit` no longer see your API keys, `MAXIM_*`, `SSH_AUTH_SOCK` or `GIT_*` variables, so
  SSH signing and git over SSH stop working from them, and they run inside the mode's allowed
  directories. `git_commit` is now opt-in, like `git_diff`: set `MAXIM_ALLOW_GIT_COMMIT=1`.

**Internals that moved.** `agent_loop`'s helpers moved to `maxim.runtime.loop_setup`,
`maxim.runtime.substrate_proposal` and `maxim.runtime.loop_gates`, with no re-export. A custom
tool registry must provide `tool_descriptions()`.

The engine's
[1.3.2 release notes](https://github.com/dennys246/Maxim/releases/tag/v1.3.2)
and [changelog](https://github.com/dennys246/Maxim/blob/main/CHANGELOG.md) have the complete
list, including entity file format 1.1, which 1.3.1 cannot read.

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
