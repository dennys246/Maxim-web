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

3. **Pick a model.**

   **Local model** — Maxim downloads the GGUF and caches it in `~/.maxim/`, but since 1.3.3
   only with your consent, on every path:

   ```sh
   maxim --list-models              # see available models + download status
   maxim --llm mistral-7b           # at a terminal, asks before downloading (~4GB for Mistral 7B Q4_K_M)
   ```

   Anywhere it cannot ask (a notebook, CI, a headless box) nothing downloads until you grant it.
   `maxim config set llm.auto_download true` is a standing grant that every path reads;
   `--auto-download` or `MAXIM_AUTO_DOWNLOAD_MODELS=1` grants it for one run. An explicit
   `MAXIM_AUTO_DOWNLOAD_MODELS=0` overrides a config `true`. To fetch one yourself, call
   `maxim.download_model(name)` or run `python -m maxim.models.download --llm <profile>`.

   **Cloud model** — export a provider key and Maxim auto-enables cloud dispatch; no extra flags required:

   ```sh
   export ANTHROPIC_API_KEY="sk-ant-..."
   maxim --language-model claude-sonnet
   ```

**Developer install:** To work on Maxim itself, clone the repo and use `pip install -e '.[test]'` instead.

## Optional Extras

| Extra | Install Command | What It Enables |
| --- | --- | --- |
| TTS | `pip install 'pymaxim[tts]'` | Text-to-speech (Piper TTS; synthesis works since 1.3.3, not in 1.3.2) |
| Semantic | `pip install 'pymaxim[semantic]'` | Neural similarity (SentenceTransformer) |
| Torch LLM | `pip install 'pymaxim[llm-torch]'` | PyTorch transformers backend |
| YOLOv8 | `pip install 'pymaxim[yolo]'` | YOLOv8 vision engine via Ultralytics (AGPL-3.0). Default engine is RTMDet-m (Apache 2.0) |
| Reachy | `pip install 'pymaxim[reachy]'` | Reachy Mini robot support — see the [Reachy Mini guide](/guides/reachy-mini/) |
| Console | `pip install 'pymaxim[console]'` | The local Console backend, `maxim serve`, with its live stream (`/ws`) since 1.3.3 — see the [CLI reference](/reference/cli/#console-server) |
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

## Upgrading to 1.3.3

1.3.3 adds no new research claim about how agents behave, but it does change how the software
behaves, and some changes break existing setups on purpose. Do the security steps first.

### Security: every local model server has a key

Every `llama-cpp-server` that Maxim starts now requires a key, a solo machine's included
([#1314](https://github.com/dennys246/Maxim/issues/1314)). Through 1.3.2 only a leader's server
had one, so any other process or user on a shared machine could use a solo's model. A leader's
server still uses the mesh key. Every other server uses a key file,
`~/.config/maxim/llm_server_key` (owner-only, 0600; `%APPDATA%\maxim\llm_server_key` on
Windows), which Maxim creates the first time it starts one.

1. **Upgrade every maxim on the machine together.** Run `pip install --upgrade pymaxim` in every
   virtualenv, notebook kernel and service that runs Maxim, then restart each one. An older
   maxim reuses the new keyed server and gets a 401 on every call.
2. **Stop any model server an older maxim started.** It runs as `llama_cpp.server`, on port 8100
   by default; on macOS or Linux, `pkill -f llama_cpp.server` stops it. 1.3.3 refuses a server
   that answers without a key, so if you skip this step the next start fails and tells you; once
   the old server is gone, the next start spawns a keyed one. Nothing is stopped for you.
3. **Only if you set a lane URL yourself.** A lane is one of Maxim's model connections, by
   tier (`LARGE`, `MEDIUM`, `SMALL`; see [networking](/guides/networking/)). If you pointed one
   at a server on this machine with `MAXIM_LANE_<TIER>_REMOTE_URL`, Maxim attaches no key to it:
   set `MAXIM_LANE_<TIER>_REMOTE_API_KEY`. `maxim doctor` (its "Loopback lane auth" check)
   prints the command, naming the key file but never the key. If you never set a lane URL, skip
   this.
4. **In a container with a read-only home**, make `~/.config/maxim` writable, or Maxim cannot
   create the key file and refuses to start the server.

To replace the key, delete `llm_server_key`; the next start creates a new one.

The other security changes:

- **The agent can no longer change the operator's internet switch**
  ([#1345](https://github.com/dennys246/Maxim/issues/1345)). Its `internet_access_toggle` can
  only turn internet off, only for its own session, and never writes the setting to disk. Only
  the operator turns internet on, with `maxim.utils.set_internet_access(True)`. If an agent on
  1.3.2 or earlier turned internet off in your saved setting, the startup warning names it.
  Still open ([#1399](https://github.com/dennys246/Maxim/issues/1399)): after the agent turns
  internet off for its session, the prompt still lists the internet tools, and calling them is
  refused.
- **The file tools refuse to write git configuration**
  ([#957](https://github.com/dennys246/Maxim/issues/957)): anything under `.git`, a git
  directory under another name, and your user- and system-level git config
  (`~/.gitconfig` and the like). `.gitignore`, `.gitattributes` and `.github/` stay writable. A
  workflow that had the agent edit `.git/config` or `~/.gitconfig` breaks. This narrows a way
  to make git run code; it does not close it, because `bash` can still write there.
- **Sim reports no longer record an endpoint's credentials, path or query**
  ([#997](https://github.com/dennys246/Maxim/issues/997)). In `report.json`,
  `language_endpoint` and `aut_endpoint` keep `scheme://host[:port]` only, such as
  `http://127.0.0.1:8100` rather than `http://127.0.0.1:8100/v1`. If a script read `/v1` or
  another path part from those fields, take it from your own configuration instead.
- **An unusable leader key is a clear refusal**, never a traceback or a silent "no key"
  ([#1311](https://github.com/dennys246/Maxim/issues/1311)). `maxim oasis serve --insecure`
  with a key file that exists but cannot be used now exits 2; it used to serve without auth.

### Behaviour changes and what to do

- **`maxim --clear-memory` now reaches every agent in your data home**
  ([#1337](https://github.com/dennys246/Maxim/issues/1337)). It used to clear `./data` in the
  directory you ran it from. Now it works in `~/.maxim` (or `$MAXIM_DATA_HOME`), and an agent
  store you name (`hippo`, `nac` and the like; all types with no `TYPE`) is cleared in every
  agent's home there. **Check any script that passes
  `--clear-memory` before you upgrade.** It lists every path it will delete before asking. Off a
  terminal it refuses with exit 2 unless you pass `--yes`, and with `--yes` it deletes across
  all agents. Declining exits 1 (it used to exit 0). A `./data` that holds memory is named in a
  warning and left alone; pass `--home-dir` to clear it too. `sim_reports/` is never cleared.
- **An agent's saved reward and fear learning (the [NAc](/systems/nucleus-accumbens/)) no
  longer fades while it is switched off.** A saved agent resumes with its learning intact,
  however long it was off. So a learned fear, including one imported in a bundle, never fades:
  nothing in Maxim unlearns a fear yet. To restore the old offline decay from Python, build the
  NAc with `NACConfig(offline_wall_decay=True)`; there is no CLI or config switch for it.
  `NAc.load(apply_decay=...)` is deprecated and is removed in 1.5.0. `--resume-sim` still
  passes it internally, so the `DeprecationWarning` it raises there is expected; ignore it. A loaded `nac.json` now has its values clamped to range, with a warning
  ([#1102](https://github.com/dennys246/Maxim/issues/1102)).
- **A missing local model downloads only with consent, on every path**
  ([#1343](https://github.com/dennys246/Maxim/issues/1343)). A first `maxim.run()` in a
  notebook no longer downloads a model silently. Grant it once with
  `maxim config set llm.auto_download true`, or call `maxim.download_model(name)`.
  `llm.auto_download` in `config.json` is now a grant on every path, and an explicit
  `MAXIM_AUTO_DOWNLOAD_MODELS=0` overrides a config `true`.
- **A benchmark passes only strictly** ([#1310](https://github.com/dennys246/Maxim/issues/1310)).
  A model passes only when at least one scoring threshold was applied, every applied threshold
  held, every expectation was met and no run errored; otherwise `maxim --sim benchmark` exits 1.
  The shipped `cognitive_suite` cannot pass yet, for any model, and its runs now report FAIL
  instead of passing on empty inputs. See [benchmarks](/guides/benchmarks/#scoring-and-thresholds).
- **A refused tool call goes back to the model**
  ([#1413](https://github.com/dennys246/Maxim/issues/1413)). An LLM-driven run can make up to
  two extra model calls each time the model picks a tool it is not allowed, so action counts,
  cost and blocked counts are not comparable to 1.3.2. The model is also no longer offered
  `execute_file`, which was always refused; account for it when you compare prompts across
  versions.
- **One message in Console Talk is one observation**
  ([#1414](https://github.com/dennys246/Maxim/issues/1414)). It used to become a new memory
  every half second, so memory counts from Console sessions are not comparable to 1.3.2.
- **An agent id containing `:` is refused when the agent is named**, with
  `InvalidAgentIdError`, by `maxim.create.agent`, `maxim.load.agent` and the agent builders.
  On 1.3.2 such an agent's learning was filed under the wrong agent when it reloaded. To keep
  one, rename its directory under `~/.maxim/agents/` to a name without `:` and load it by the
  new name.
- **Python API.** `InternetAccessTool` no longer takes `set_internet_access_fn=`, and
  `maxim.utils.set_internet_access` defaults to `source="operator"`. NAc's credit methods raise
  `ValueError` on a NaN or infinite input.

### The Console

- **`pymaxim[console]` now installs `websockets`**, so `/ws` (the activity and thinking panels,
  live health, turn status) works from a clean install. In 1.3.2 `/ws` answered 404
  ([#1347](https://github.com/dennys246/Maxim/issues/1347)).
- **Piper speaks again** ([#1332](https://github.com/dennys246/Maxim/issues/1332)). In 1.3.2
  every synthesis failed on every installable piper version, so spoken-code pairing played
  nothing. **A correction:** the 1.3.2 notes said "verified Piper voice provisioning". That
  overclaimed: 1.3.2 verified the voice's files and that the voice loaded, not that it could
  speak, and it could not.
- **Talk, the Console's chat view, is offered only the tools it may use**
  ([#1412](https://github.com/dennys246/Maxim/issues/1412)), and a refused tool call goes back
  to the model instead of leaving the turn to time out
  ([#1413](https://github.com/dennys246/Maxim/issues/1413)).
- **Pairing arms only on a voice that has spoken**
  ([#1334](https://github.com/dennys246/Maxim/issues/1334)). A robot whose voice loads but
  cannot speak stays on the paste sign-in.
- **The wheel bundles the maxim-pulse Console v0.4.2** (commit `bcd0d1e`; 1.3.2 bundled v0.4.0).
  The Console's API contract is unchanged at 0.6.0; typed payloads (contract 0.7.0) are
  planned for 1.3.4.
- **A setup change made in the Console reaches the next talk without a restart**
  ([#1411](https://github.com/dennys246/Maxim/issues/1411)). A `maxim config set` from another
  process still needs one. `maxim serve` also no longer hangs up to 15 s on shutdown after a
  Console tab closes.

The engine's
[1.3.3 release notes](https://github.com/dennys246/Maxim/releases/tag/v1.3.3)
and [changelog](https://github.com/dennys246/Maxim/blob/v1.3.3/CHANGELOG.md) have the complete
list, with the guard behind each fix.

### Release integrity

1.3.3 is the first pymaxim release that CI publishes. A signed tag starts the release, which
requires a green nightly run on that exact commit, smoke-tests the exact wheel in a clean
environment, waits for the owner's approval, and publishes through PyPI trusted publishing,
with no stored token. The bundled
Console must be the pinned, newest maxim-pulse release, and the build refuses any other. Two
optional extras, `tts` and `console`, are tested nightly against their real libraries, at the
lowest versions they declare and at the latest, and a release waits for those runs. The other
extras are not tested this way yet.

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
