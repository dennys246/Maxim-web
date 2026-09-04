# Maxim Sandbox — a hosted, ephemeral Console anyone can open from the landing page

**Status:** Shell plan, drafted 2026-09-02; revised the same day with the hosting, seeding, agent-select and Party Mode decisions; revised again after a six-track code audit of pymaxim 1.1.2 and maxim-pulse (§ The pymaxim tangent, § The maxim-pulse tangent); **2026-09-04: the five open questions decided** (§ Decisions 13–17) — Mac-mini-first topology, playable Adventure at launch, instance-level moderation with Oasis admission control, a $10/month ceiling, and send-session via a bucket the Oasis will later consume.
**Scope:** A gold "Sandbox" button under the hero on `pymaxim.bio` → a guide page with a live status widget → a short-lived, single-visitor Maxim Console running on our infrastructure. The visitor talks to the agent, watches or plays an Adventure, with the bundled local model or their own cloud-provider key. Nothing persists past the session unless they take it home.
**Target:** After the pulse sandbox build flavour and the launch-marked items in both tangents. Launch gated on the Phase 0 measurements.
**Reverses:** maxim-pulse `docs/plans/maxim_console.md` open questions #1 and #2 and `AGENTS.md` § "Localhost-only Console" ("a hosted console is an explicit non-goal"). Both documents get amended in the same change that ships the sandbox flavour; the engine's own posture (`maxim serve` binds 127.0.0.1, no auth) is **kept**, and the hosting boundary lives entirely in the broker.

---

## Why a hosted sandbox, not in-browser

Measured 2026-09-02 on engine 1.1.2:

- The engine is a threaded, timer-paced Python pipeline: 13 threads on a bare `pip install pymaxim`, `fcntl`/`select`/`subprocess`/`multiprocessing` on the sim path, turn cadence set by bridge poll timers. Pyodide has no threads. An in-browser port needs a synchronous step seam in pymaxim first — months, not weeks.
- Every demo-worthy path needs a language model. The "no LLM in the action path" cradle arcs still use a SmolLM-1.7B narrator, and with no model at all the substrate produced 0 actions in 6 turns. The only thing that would ever want a visitor's GPU is that model.
- The pulse Console already exists as thin presentation over `maxim serve`, with a `MockFacade`, an `EventClient` on `/ws`, and a `SetupWizard` cloud tab. A hosted sandbox is mostly plumbing around software that already runs.

So: run `maxim serve` per visitor in a throwaway machine, put an authenticating proxy in front, and serve the existing Console bundle. The visitor's machine does nothing but render.

## Front-gate (Principle 3)

**Does this need new mechanism, or ride existing infra?** Mostly rides.

| Need | Exists today | New |
|---|---|---|
| Backend API + event stream | `maxim serve`: `/api/{models,identity,diagnose,probe,setup/cloud,setup/mesh,recall,campaigns,run}` + `/ws` | — |
| UI | pulse `apps/console` over `HttpFacade` | a build flavour that takes `baseUrl` + a session token |
| Per-visitor isolation | `MAXIM_DATA_HOME`, one `_active_run` per process | one machine per session (the process is single-tenant by design) |
| Local model | `smollm-1.7b-instruct` Q4_K_M GGUF, 1.0 GB, auto-download path exists | bake it into the image, **plus an `llm.json` tiers override** (see P1) |
| Cloud-provider key | `POST /api/setup/cloud` stores key as a 0600 ref; `SpendControls` exists **only as a write field** on the wizard | a spend read-back verb, and two engine fixes before the wizard path works at all (P9, P10) |
| Auth, quotas, lifecycle | none (serve is `127.0.0.1`-only, no auth, no `/ws` origin check) | **the broker** — the one genuinely new component |
| Status on the landing site | none | a small island polling a public status endpoint |

**What stays out of the engine:** no `--host 0.0.0.0`, no auth middleware in `maxim serve`. The proxy sidecar shares the machine's network namespace and talks to `127.0.0.1:8765`. The engine's security posture is unchanged; the broker owns the edge. The engine **does** get a `MAXIM_CONSOLE_SANDBOX=1` mode that closes the endpoints a public visitor must never reach (P4).

## Architecture

```
pymaxim.bio (Astro, static, Cloudflare)              sandbox.pymaxim.bio (the new service)
┌──────────────────────────────────────┐            ┌─────────────────────────────────────────┐
│ /            hero + gold [Sandbox]   │            │ BROKER (small, stateless-ish)           │
│ /sandbox/    guide + <SandboxStatus> │ GET /status│  /status        public, cached 10 s     │
│              island (polls, launches)├───────────►│  /session       POST → allocate, token  │
│                                      │            │  /s/<id>/…      HTTP + WS proxy, token  │
└──────────────────────────────────────┘            │  /s/<id>/       serves Console bundle   │
                                                    └───────────┬─────────────────────────────┘
                                                                │ one Fly Machine per session
                                                    ┌───────────▼─────────────────────────────┐
                                                    │ SESSION MACHINE (ephemeral)             │
                                                    │  maxim serve  127.0.0.1:8765            │
                                                    │  MAXIM_DATA_HOME=/data (tmpfs)          │
                                                    │  CWD=/data/run  XDG_CONFIG_HOME=/data   │
                                                    │  smollm-1.7b GGUF baked in              │
                                                    │  egress: allowlist only                 │
                                                    │  killed at 20 min or 5 min idle         │
                                                    │  stop grace ≥ 120 s (see P6)            │
                                                    └─────────────────────────────────────────┘
```

**Topology, Phases 0–3: everything on the Mac mini.** The 48 GB Mac mini already runs the mesh leader (the leader proxy at `maxim.big-mac-mini.org`, `lanes.large.remote_url` for peers, `proxy.max_concurrent` / `proxy.rate_limit_rpm`, the `tunnel` module over cloudflared). The sandbox rides that: the model server stays native on macOS (Metal is not reachable from a Linux container), the broker runs as a launchd service, per-visitor containers run under OrbStack/Docker and reach the model through the proxy, and cloudflared fronts `sandbox.pymaxim.bio`. Each session container is a mesh PEER with its own lane key, minted by the broker at session start (per-peer keys on the proxy are a Phase 1 check — if the proxy only knows one key, that is the first thing to add). Fly Machines stay the later swap for stronger isolation; the broker's machine abstraction keeps that a configuration change. Cloud models are the comparison arm in Phase 0 and the fallback when the Mac mini is down.

**Origins.** The site stays static. The Console, its API and its WebSocket all live on one origin (`sandbox.pymaxim.bio/s/<id>/`). `HttpFacade` already derives the WebSocket URL from `baseUrl`, so a path-prefixed base works for both transports as long as it has no trailing slash. The only cross-origin calls from `pymaxim.bio` are the public status read and the launch request, CORS-allowed for `https://pymaxim.bio` only.

**Session lifecycle.**

1. Visitor clicks Launch on `/sandbox/`. Turnstile challenge → `POST /session` with the chosen seed.
2. Broker: capacity check → start a stopped machine from the pool → copy the seed into the agent slot → poll `/api/identity` inside it → mark `ready`. Reports each step: `queued · starting · loading model · ready`.
3. Page hands the visitor to `https://sandbox.pymaxim.bio/s/<id>/#t=<token>`. The Console build reads the fragment once, strips it from the URL, keeps the token in memory, and sends it as `Authorization: Bearer` on `/api/*` and as an auth frame before the subscribe frame on `/ws` (re-sent on every reconnect, which the kit already does for the subscribe frame).
4. Visitor plays. The idle timer resets on every proxied request or WS frame.
5. "End session", the cap, or idle → the broker sends `maxim serve` a graceful SIGTERM and waits for it to exit: uvicorn closes the sockets, runs the lifespan shutdown, and that shutdown now drains the run and stops the handle **inside** its `finally` (pymaxim D74), which is what persists a Talk-only session's substrate. The stop grace covers the handle's bounded waits. The in-band `POST /api/session/end` (P5) is a wire change and joins the 0.4.0 batch (P8b); until then SIGTERM is the mechanism. Then the machine is destroyed: tmpfs gone, key gone.

**What the visitor can do.** The Console's surfaces: **Talk** (interactive), **Adventure**, **Rest**, the Memory view, and a trimmed Diagnostics. Two honest corrections from the audit:

- **Adventure is playable at launch (decision 14).** Today `MaximHandle._run_sim` forces interactive mode OFF and the DM runtime's human-choice path is stdin-only, so the persistent Maxim picks every choice. P16 (an HTTP-backed prompt handler, a `dm_choice` meta-kind, `POST /api/choice`) moves into the 0.4.0 contract batch so the visitor chooses; when a visitor walks away mid-choice the agent chooses for them after a timeout, announced on the stream, so a campaign never hangs.
- **A free-text premise is narrated inside a memory-test arc.** `select_arc_for_goal` keyword-matches the premise; "a knight and an astronaut" matches nothing and falls back to the `memory_recall` arc, whose middle phase is deliberately unrelated interference. Until P17 adds a free-form story arc, the sandbox should launch **bundled campaigns** by default (arena, heist, server breach) and treat the premise box as experimental.

`mode="sim"` stays 501, as `maxim serve` already says.

## The three connection routes on the guide page

1. **Hosted sandbox (default).** A 14B–32B local model on the Mac mini through the mesh proxy (decision 13); a cheap cloud model on our key is the Phase 0 comparison arm and the fallback under the $10/month ceiling (decision 16). Free, capped, throwaway. The status widget is honest about capacity, queue, and "full for this month".
2. **Bring a cloud-provider key (optional, inside the sandbox).** The Console's existing SetupWizard cloud tab. Copy on the page and in the wizard: *the key is written only to this session's machine, is used only for this session's calls, and is destroyed with it; set a spend cap before you start.* A `SpendControls` read-back surface is mandatory-visible in the sandbox build (pulse item U8, engine item P11).
3. **Run it yourself.** `pip install 'pymaxim[console]' && maxim serve` and open `http://127.0.0.1:8765`. Later (Phase 5) the guide page can probe the visitor's own localhost from the browser; that needs a CORS allowance on `GET /api/identity` only (P13).

## Seeded agents: pick a Maxim, not an empty one

An empty Memory view on arrival is the worst first impression the sandbox can make. The launch step offers a **choice of agent home**, each one a real Maxim that has already lived something. Mechanics:

- The Console is hardwired to one agent slot, `agents/console_agent/`, and recall loads `hippocampus.json` and `nac.json` from that home's root. Seeding = the broker copying the chosen home into the slot before the machine is marked ready (or, once P7 lands, pointing `console.agent_id` at it). The canonical seed never mutates; the visitor's teaching dies with the session unless exported.
- Three seed families, in order of effort:
  1. **Experiment agents.** Exp 53's ten agents ship in the engine repo under `docs/experiments/data/53_agents/` (3.5 MB, SHA-256 manifest). Substrate only, NAc + EC, two causal links each, no hippocampus episodes. The Memory view shows the real learned link; a Talk answer about "your experience" is the sandbox model narrating over it. The page says exactly that.
  2. **Roy-primed infants.** The cradle curriculum (`scenarios/cradle/`) produces hippocampus + NAc at zero cost with the SmolLM narrator and shows cross-session substrate accumulating.
  3. **Character Maxims** (a knight, an astronaut). An Adventure campaign run offline against `agent_id="knight"` with a strong narrator, then the home directory copied. Hippocampus memories are structured goal / tool / outcome records, not diary prose, so the character's stories are the model narrating its substrate. **Their world state does not survive:** entity vitals, equipment swaps and campaign flags are per-run and in memory only; a replayed campaign starts from the YAML's initial values. "The knight remembers losing an arm" needs P18.
- **Prime seeds on the sandbox image itself.** EC state persists float vectors plus an `encoder_provenance` field, and the encoder is sentence-transformers when installed and a bag-of-words hash otherwise. The two produce different geometry tags at the same 384 dims, and EC silently skips nodes whose geometry differs, with one warning line. Nothing checks provenance at load (P12 adds that).
- **Priming offline with a strong narrator is an env-var trick today.** There is no `--narrator-model`; the one override that exists, `--aut-model`, moves the wrong side. P19 adds the narrator override and routes the narrator through the (currently inert) function tier table.
- **The picker lives on the guide page**, not inside the Console. Once P8 ships, the same seeds become switchable inside a session without a relaunch.

## Multiple Maxims: what exists, what the sandbox can show

Checked at 1.1.2:

- **Independent agents exist.** `AgentFactory` gives each agent its own Hippocampus, NAc, ATL, memory hub and tool registry; the isolation tests cover cross-agent percept leakage.
- **A shared round exists, library-only.** `maxim.create.pool()` returns an `AgentPool` with `run_round`, `broadcast_percept`, a `LocalMessageBus` and per-agent memory export. No CLI mode drives it, the pool's message handler only logs, and its NPC dialogue path calls a router method that does not exist (`LLMRouter.generate`), so every NPC line today is the persona-echo stub.
- **Two Maxims interacting is shipped** only as the simulation agent: a second Maxim orchestrating the agent under test. Research tooling, not a shared world.
- **Party Mode is parsed, not implemented.** `party_mode: true` is stored on `CampaignDef`; the DM runtime never reads it (bugs ledger D50, open). NPCs are scripted component-library entities with no bio-stack. The deferred `agent_backed_entities.md` plan (600–900 LOC) carries far more than a knight-and-astronaut scene needs; P20 scopes the minimal subclass instead.
- **The Console is one agent, fixed.** The event envelope already carries `agent_id` and a nickname, so the UI can label several agents once the backend emits them.

So: **agent select** is a small pymaxim seam (P8), Phase 4. **Maxims in one environment** is Party Mode (P20), Phase 6, gated on it landing in pymaxim first.

## Repo-by-repo changes

### maxim-web (this repo)

- **Landing:** a `Sandbox` link in the hero `nav.links`, styled as the one warm accent on the page (gold, soft glow via `box-shadow`, no animation under `prefers-reduced-motion`, AA contrast in both themes). Static `<a href="/sandbox/">`. No island on the landing.
- **`/sandbox/` page** (Starlight, under Getting Started): what it is, what it is not (no persistence, capped, shared capacity, Adventure is watched), the three routes, the seed picker, and the one React island `SandboxStatus.tsx`: polls `/status` every 10 s while visible; Launch → `POST /session` → live step list → hand-off link; plain "down / full, try later" state with the run-it-yourself fallback; reads correctly with JS off.
- **Worker:** none. Keeping `worker/index.js` a redirect-only shim preserves "presentation and content only".
- Copy per AGENTS.md "honest voice": the bundled model is small; nothing survives unless exported; Adventure is watched; seeds are labelled with origin.

### maxim-sandbox (new repo)

- **Broker**: one small Node service. `GET /status` (capacity, queue, month-to-date spend vs the `MONTHLY_BUDGET_USD` ceiling), `POST /session` (Turnstile, per-IP rate limit, capacity gate, budget gate, seed choice; mints the session bearer AND the session's mesh lane key), `GET /session/<id>`, `DELETE /session/<id>` (graceful SIGTERM, then teardown), `POST /session/<id>/share` (decision 17: on explicit click, packages the P14 agent-home bundle + the transcript + a manifest into a private R2 bucket — the intake queue the authority Oasis consumes later), `POST /session/<id>/report` (decision 15), and the `/s/<id>/*` HTTP + WebSocket proxy with bearer check. Returns 403 for `/api/setup/mesh`, `/api/setup/cloud` (when our-key mode is on), `/api/probe` and `/api/diagnose` regardless of what the engine does, so the guard is belt and braces with P4.
- **Image**: `pymaxim[console,llm-llama]` pinned, installed **as a wheel, not editable** (so `_git_identity()` short-circuits and no branch name leaks); the SmolLM GGUF pre-placed at `$MAXIM_DATA_HOME/models/LLM/`; the pulse sandbox bundle at `--ui-dist`; non-root, read-only root FS; and the exact environment below.
- **Container environment (all existing knobs, zero engine code):**

  ```
  MAXIM_DATA_HOME=/data              XDG_CONFIG_HOME=/data/config   TMPDIR=/data/tmp   HOME=/data
  HF_HOME=/data/hf                   # pre-populated; otherwise the encoder dials huggingface.co
  cwd=/data/run                      # NOT /data itself — write_file's allowed_dirs would then cover campaigns/
  MAXIM_DISABLE_PEER_CONFIG=1        MAXIM_SKIP_REMOTE_PROBE=1      MAXIM_AUTO_SPAWN_LLM_SERVER=0
  MAXIM_AUTO_DOWNLOAD_MODELS unset   MAXIM_LLM_CONFIG=/etc/maxim/llm.json
  MAXIM_LLM_MAX_SESSION_COST=<small> MAXIM_LLM_MAX_COST_PER_REQUEST=<small>
  MAXIM_LLM_REDACTION_POLICY=standard   # without it cloud dispatch is silently OFF
  MAXIM_DISABLE_IMAGINATION=1 (or P15's per-turn cap)
  never set: MAXIM_ALLOW_BASH, MAXIM_ALLOW_EXECUTE_FILE, TWILIO_*, MAXIM_LANE_*_REMOTE_API_KEY (use *_REF + a 0600 file)
  ```
  and `/etc/maxim/llm.json` carrying `"tiers": {"large": {"model_profile": "smollm-1.7b-instruct", "device": "cpu", "n_gpu_layers": 0}}`. **Without that override a CPU-only machine detects only the `small` tier, `build_primary_router` returns `None`, and both Talk and Adventure raise.** This is the single most likely "it worked on my Mac" failure, since a Metal GPU passes the `large` gate locally.
- **Egress allowlist**: the cloud-provider host(s) only. `huggingface.co` is not needed once `HF_HOME` is pre-populated and auto-download is off. No engine call site phones home; there is no telemetry endpoint.
- **Host**: Fly Machines, one per session, a small pool kept stopped with the model on the root FS. Stop grace ≥ 120 s (P6). Not a shared VPS with Docker.
- **Ops**: one log line per lifecycle event, no transcript logging by default, public status JSON.

### maxim-pulse: see § The maxim-pulse tangent

### pymaxim: see § The pymaxim tangent

## The pymaxim tangent

Everything the sandbox needs or wants from the engine, grouped, smallest first within each group. **launch** = blocks Phase 3. Sizes are from the audit; file references are at 1.1.2.

**Status 2026-09-03.** P1, P2, P3, P4, P4b, P4c, P4d, P6, P7 and the `finally` half of P5 landed in pymaxim as [PR #606](https://github.com/dennys246/Maxim/pull/606) (`feat/sandbox-launch-blockers`; bugs ledger D69–D74, D75 pending; no wire change, OpenAPI snapshot byte-identical; two-lens review round plus a fold-delta pass folded before opening). The review moved the three sandbox knobs to `console.sandbox` / `console.allowed_origins` / `console.max_input_chars` config keys, made `build_executor(permissions=)` a required keyword, and taught the filesystem tools to resolve relative paths against their containment root. P5's endpoint moved into the P8b contract batch. Two things the audit missed and that PR notes as still CWD-relative: the agent loop's `state_<run_id>.json` (D15) and the CLI scenario path's `--home-dir` default; both are harmless with CWD=/data/run.

### A. Filesystem and process hygiene (all launch)

| # | Change | Where | Size |
|---|---|---|---|
| P1 | Honour `MAXIM_DATA_HOME` in the remaining hardcodes: `utils/last_run.py:37`, the cost-state default in `models/language/cloud_dispatch.py:185` (which also defeats per-visitor cost isolation). | pymaxim | tiny |
| P2 | Route the orchestrator's CWD-relative writes (`./data/agents/…/runtime`, `./data/sim_sandbox`, `sim_agent_*.jsonl`, `orchestrator.py:522-537`) through `utils.paths.resolve_user_state`, as `interactive.py:357` already does. Without it every Adventure crashes on a read-only root. | simulation/orchestrator.py | small |
| P3 | Give `MaximHandle` an explicit workspace root: pass `allowed_dirs_override=[agent_data(id)/"workspace"]` to `build_tool_registry` (`handle.py:167`; the parameter exists at `bootstrap.py:113`). Fixes the `CWD/.maxim_workspace` mkdir that fires on the first Talk request **and** the CWD-scoped tool exposure `handle.py:386-393` already flags. | console/handle.py | small |

### B. Sandbox mode and the public attack surface (launch)

| # | Change | Where | Size |
|---|---|---|---|
| P4 | `MAXIM_CONSOLE_SANDBOX=1`, read once in `build_app`, behind a shared `Depends`: 403 on `POST /api/probe` (full SSRF: arbitrary URL + auth header, latency echoed back), `POST /api/setup/mesh` (repoints the LLM lane at a visitor-controlled URL, permanently), `GET /api/diagnose` (see P4b), and origin-check `/ws` upgrades against the served host. Cap `RunRequest.input` with `Field(max_length=…)`. | console/server.py, schemas.py | small |
| P4b | Redact secrets in `/api/diagnose` regardless of mode: `_format_doctor_value` prints resolved config verbatim, and `lanes.*.remote_api_key_ref` from env "legitimately holds an inline key", so a key set via `MAXIM_LANE_LARGE_REMOTE_API_KEY` is echoed to any caller; the divergence branch also prints it in `fix`. Also drop the secret path from `SetupResult.detail`. | doctor/checks.py, console/server.py | tiny |
| P4c | **Tool allowlist done correctly.** `AgentPermissions.tool_allow/tool_deny` and its enforcement point in `Executor` (`executor.py:145-179`, alias-proof) already exist but are never armed: `build_executor` is called without `permissions=`. Add `tools.allow`/`tools.deny` to `MaximConfig` + `_FIELD_TO_ENV`, thread `permissions` through `AgentConfig` into `build_executor`, build it in `MaximHandle.__init__`. Covers Talk **and** Adventure because both dispatch through the same inner Executor. Add a `kind:<kind>` selector so generated SEM affordance tools (`sem-modulator-derived`) can be allowed by kind. Delete the dead `_tool_whitelist` write in `agent_factory.py:964-976` and its false docstring. | config_loader, agent_factory, handle, permissions | small (~50 LOC + tests) |
| P4d | Fix the `ALWAYS_ALLOWED_TOOLS` bypass: `autonomy.py:565-567` returns before `check_constraints`, so `search_code` and `git_diff` execute from Talk despite being in the handle's forbidden set. `git_diff` builds argv from model strings with no `allowed_dirs` (`--output=` writes outside containment). Move the check after constraints; add `search_code, git_diff, glob` to the pin test at `test_console_talk.py:191`; gate `run_tests` (unguarded `subprocess.run(command.split())`) and `git_*` like `bash`, and add them to `fear_gate._classify_action`'s shell set. | agents/autonomy.py, tools/, runtime/fear_gate.py | tiny |

**Default sandbox allowlist** (deliberately drops `read_file` and `glob` from today's Talk set; an anonymous visitor has nothing legitimate to read on the machine): `respond, speak, say, think, examine, choose, memory_recall, predict_outcome, causal_links, pain_history, temporal_patterns, energy_status, concept_query, similarity_search, system_stats, sense, sense_presence, sense_tools, display_mode, set_scene, kind:sem-modulator-derived`.

### C. Session lifecycle and export (P5, P6 launch; rest Phase 4)

| # | Change | Where | Size |
|---|---|---|---|
| P5 | `POST /api/session/end` (or `mode="stop"`) that calls `MaximHandle.stop()`, nulls the handle, and returns the flushed paths. Today `stop()` is reachable only from the uvicorn lifespan, and **a Talk-only session writes almost nothing to disk until the loop stops** (`max_steps=0`; NAc/EC/SCN/ATL persist only in `on_session_end`). `mode=rest` is not a substitute: it saves hippocampus only. Also move the handle drain/stop inside the lifespan `finally` (`server.py:1009-1029`) so an exception through `yield` cannot skip consolidation. | console/server.py, handle.py | small |
| P6 | Make `stop()`'s waits configurable (`campaign_wait_s`, `join_s`); worst case today is ~110 s (60 s campaign wait + 20 s talk join + full replay consolidation). The broker uses short waits on `/session/end` and the machine's stop grace covers the long ones. | console/handle.py | tiny |
| P7 | `console.agent_id` on `ConsoleConfigSection` + `"console.agent_id": "MAXIM_CONSOLE_AGENT_ID"` in `_FIELD_TO_ENV` (additive-optional is sanctioned, no format bump). Resolve it **lazily in `_get_handle`**, not in `run_serve`, and make the `get_recall` fallback (`server.py:359`) read the same value or the Exec B1 bug returns. Validate at serve start (reject `sim_aut`, non-`[A-Za-z0-9_-]`). | config_loader, console/server.py | tiny |
| P8 | **Agent select seam.** `maxim.list_agents()` in `load.py` (dirs under `agents/` containing `hippocampus.json` or `nac.json`; the raw listing on the dev box is 15 junk homes out of 18 because `agent_data()` mkdirs on read). `GET /api/agents`; `POST /api/agents/select` with **exactly** `_post_run_rest`'s guards (409 on live run, 409 on in-flight talk), then `old.stop()` → `MaximHandle(agent_id=…)`. Note `maxim.load.agent()` is the wrong primitive: it returns a `create_agent` skeleton with no bio-stack or executor; the handle needs `create_full_agent`. Emit an `agent` meta-kind, re-broadcast the identity frame, and carry `agent_id` in `_EventHub.set_run`. Add `agent_id` and `data_home` to `IdentityResponse`. | load.py, console/server.py, schemas.py | medium |
| P8b | Contract ceremony, once: bump `CONSOLE_CONTRACT_VERSION` 0.3.0 → 0.4.0 (`ui_bundle.py:63`), regenerate `openapi.json` (`maxim serve --dump-openapi`) and `contract_surface.json` (content-fingerprinted; additive fields do not escape), declare new seams in `_SEAM_DECLARATIONS`. **Batch every wire change in this tangent (P5's endpoint, P8, P11, P14, P16) into this one bump — it is now the launch batch.** | console/ | small, but coordinated with pulse |

### D. Budgets and the cloud path (P9, P10 launch if any cloud key is ever used)

| # | Change | Where | Size |
|---|---|---|---|
| P9 | **The wizard's cloud path is broken end-to-end today.** (a) `apply_cloud_setup` never writes a redaction policy, and `LLMRouter._validate_cloud_config` returns "redaction missing" without one, so every cloud provider is skipped and the visitor's pasted key silently does nothing. (b) `monthly_budget_usd` lands in `cloud.session_budget_usd`, which only `_maybe_inject_cloud_fallback` / `_inject_placement_tail` consume, and both early-return on the wizard's single-entry placement; the effective cap is the `$5.00` default. Fix: write `redaction.policy` in `apply_cloud_setup`, and map `cloud.session_budget_usd → MAXIM_LLM_MAX_SESSION_COST` and `cloud.enabled → MAXIM_LLM_CLOUD_ENABLED` in `_apply_lane_config_to_env`, with a regression test that a wizard-written config yields `_cloud_allowed == True` and the intended cap. Rename the UI field: it is per-session, not monthly. | config_writer.py, lane_backends.py | small (~40 LOC) |
| P10 | **Per-session token cap (was T4).** Build it in `LLMRouter._complete_text` / `_complete_text_locked` next to the existing `_session_cost` check: `max_session_tokens` on `RoutingPolicy` + `MAXIM_LLM_MAX_SESSION_TOKENS`; **count Path A too** (the llama.cpp backend takes the prompt-formatting path and yields no usage dict, so today the bundled narrator produces zero token and zero cost accounting and the $ ceiling is inert for it); pre-dispatch reservation (`used + prompt + max_tokens > limit` rejects); wire `reset_session_cost()` (currently uncalled) from the handle at talk-loop teardown. Do **not** extend `llm_call_registry._InFlightCall` (shape-frozen) or build on `lane_metrics` (only the leader proxy writes it). | models/language/router.py, types.py, cloud_dispatch.py | small (~150 LOC) |
| P11 | Spend read-back for the UI: a `spend` section on `/api/diagnose` (`DiagnoseSection.extra` is the sanctioned escape hatch) or `GET /api/spend` → `{session_usd, session_tokens, cap_usd, cap_tokens}`. Surface `session_tokens` in `report.py` beside `cost_usd`. | console/server.py | small |
| P15 | Imagination per-turn cap: give `process_percept` the `max_designs` budget `process_manifest` already has (default 1–2). One adversarial percept naming eight novel entities is eight 1000-token design calls today. | imagination/trigger.py | tiny |
| P15b | Fail-loud model pin: `MAXIM_REQUIRE_LOCAL_PROFILE=<name>` checked at the top of `_ensure_lane_profiles_available`; today a missing GGUF silently degrades the lane and surfaces as a generic config error. | runtime/lane_backends.py | tiny |

**Call budget per Adventure turn** (all on one serialized router): floor 3 calls (narrator decide 200 + generate 500 + agent 1024 tokens), typical 4–6, worst 9–11 (three deliberation cycles, two tool follow-ups, two imagination designs, one fear code review). Talk: 1–3. At Sonnet-class prices a 5-call turn is roughly $0.075 and a 20-turn adventure $1.50; the default $5 session ceiling is ~65 turns, far too loose for a public sandbox. Verify current pricing before setting the cap.

### E. Export: "take your agent home" (Phase 4)

The audit's headline: **T6 is about 30 % shipped, and the shipped part was built for the opposite purpose.** `maxim substrate export/import/inspect` exists (`hivemind/bundle.py`), with a ZIP + manifest + migration seam, ZIP-slip-safe extract, and an `encoder_provenance` field that is better than the plan proposed (measured dims + recorded stamps + path redaction). But the bundle is deliberately lossy for sharing with strangers: it carries only `nac.json` + EC `substrate_nodes`, scrubs NAc unconditionally (drops `goal_reward_bias` and `priors`, blanks memory links, truncates tool vocabularies), never includes hippocampus by construction, reads `aut_*.json` from a sim-report dir (and its bare `--session <id>` resolves against the empty `~/.maxim/sessions/`, not `sim_reports/`), and its extracted `ec.json` is not `EC.load`-able. The manifest has no pymaxim version, git hash or agent id.

| # | Change | Where | Size |
|---|---|---|---|
| P12 | A sibling `kind: "agent_home"` bundle, same ZIP/manifest/migration machinery, **no scrub**, verbatim agent-home JSONs. Manifest adds `pymaxim_version` (from `get_version_info()`), nullable `git_hash`, `agent_id`, per-file `sha256`, and `encoder_provenance` lifted from the home's own `ec.json`. A load-time `assert_encoder_compatible(manifest, live_encoder)` modelled on `assert_bundle_body_compatible`, comparing `encoding_geometry_tag`; absence = unverifiable, not compatible. | hivemind/agent_bundle.py (new) | small (~330 LOC with tests) |
| P12b | `maxim agent import <bundle> [--as <name>] [--force]`: refuse a non-empty target, temp-dir + `os.replace`, and when `--as` differs from the manifest id, rekey NAc's agent-id-keyed surfaces (`reward_bias`, `cluster_reward_bias`, `event_outcome_welford`, `percept_valences`) via a thin `rekey_agent_id_only` sibling of `merge.rekey_nac_state`. Otherwise every bias lookup silently misses. Run `check_nac_ec_pairing` and print its warning. | hivemind/cli.py, merge.py | small (~380 LOC with tests) |
| P12c | Hippocampus/ATL scrubber for the export: redact absolute paths (reuse `_ABS_PATH_PATTERN`), drop `responses/` and `workspace/` by default, refuse-with-count on key-shaped strings. The dev box's `console_agent` home holds 87 absolute host paths and verbatim transcripts; a sandbox export must not ship the host's filesystem or another visitor's text. | hivemind/agent_bundle.py | small |
| P12d | Fix `_expand_session_dir` to try `sim_reports()/id` first and correct `docs/user/substrate-sharing.md:49,65`. Independent of the sandbox; currently a documented path that never resolves. | hivemind/cli.py, docs | tiny |
| P14 | `GET /api/export` (or a job) that produces the P12 bundle after P5 has flushed. | console/server.py | small |

### F. Adventure, seeds and Party Mode (Phase 4–6)

| # | Change | Where | Size |
|---|---|---|---|
| P13 | Optional CORS allowance on `GET /api/identity` only, for the guide page's local-Maxim probe. | console/server.py | tiny |
| P16 | **Console interactivity for Adventure — LAUNCH, in the 0.4.0 batch (decision 14).** An HTTP-backed `PromptHandler` + a `dm_choice` meta-kind in `_META_KINDS` + `POST /api/choice`, so `handle._run_sim` can pass a handler instead of forcing interactive OFF; a choice timeout after which the agent picks and the stream says so; and `/api/stop` for a running adventure (today a 100-turn campaign runs to completion or until the machine dies). | console/, simulation/dm_runtime.py | medium (~150 LOC) |
| P17 | A free-form story arc (or a narrator-authored arc) so a premise is not narrated inside the `memory_recall` interference harness. Prerequisite for the premise box reading as an adventure. | simulation/arcs.py | small |
| P18 | Entity-state snapshot/restore keyed to the agent home: persist `SceneState.snapshot()` + flags to `agents/<id>/world/<campaign>.json` at campaign end, restore in `init_entities`. `Entity.save/load` already exist with no callers. This is the missing half of "character Maxim". | simulation/dm_runtime.py, campaign_runner.py | small (~90 LOC) |
| P19 | `narrator_model` on `start_simulation_mode` + `--narrator-model`, mirroring the existing `aut_model` second-router mechanism; pass `function="narrative_generation"` / `"choice_classification"` from the narrator and DM so the inert `DEFAULT_FUNCTIONS` tiers finally route. Makes "prime offline with a strong narrator, replay on SmolLM" a supported operation. | simulation/orchestrator.py, narrator.py, cli_parser.py | small (~40 LOC) |
| P20a | Two NPC defects that must be fixed before any party work: `AgentPool._generate_npc_response` calls `llm_router.generate(...)`, which does not exist on `LLMRouter` (swallowed at DEBUG; every NPC says `*persona*`); `dialogue_hints` live on the encounter, so all active NPCs speak the same line; flag iteration over a `set` makes hint choice nondeterministic. Also close bugs-ledger D50 with a load-time warning on `party_mode: true`. | runtime/agent_pool.py, dm_runtime.py, dm_schema.py | small (~75 LOC) |
| P20 | **`PartyDMRuntime(DMRuntime)`**, subclass not fork: message→percept feedback in the pool (per-agent inbox drained into the next round; `speak` → bus broadcast), per-NPC persistence via `create_full_agent(with_bio_stack=True, auto_load=True)` under campaign-scoped ids, encounter loop NPC round → PC stimulus → PC choice → broadcast outcome, per-NPC hints, wiring on `campaign.party_mode` in `run_dm_campaign`, and `rollup["npc_memories"]` so the already-shipped `CampaignResult.npc_memories` stops being empty. Ship gate: `scenarios/campaigns/party_v1.yaml` (knight + astronaut, 3 encounters). Risks: wall-clock is additive on one serialized router; nickname registration is global; NPCs must not share the AUT's tool registry. | simulation/party_dm_runtime.py (new) | medium (~370 LOC + tests) |

Sequencing inside F: P16 first (launch batch), then P20a → P19 → P20 → P18.

Not on the list, on purpose: `--host`, auth middleware, general CORS, a sim surface on the console.

## The maxim-pulse tangent

The kit is closer than the plan assumed on transport and further on chrome. Nothing here adds business logic; every new surface binds to a verb above.

| # | Change | Where | Size | Phase |
|---|---|---|---|---|
| U1 | `base` is unset in both vite configs, so assets resolve to `/assets/…` and 404 under `/s/<id>/`. Set `base: process.env.MAXIM_UI_BASE ?? '/'`. | apps/console/vite.config.ts | tiny | 1 |
| U2 | `HttpFacadeOptions` has no `token`; `request()` sends **no headers on GET**. Add `token`, build a real headers object, and strip a trailing `/` from `baseUrl` in the constructor (no normalisation today; `…/s/abc/` yields `//api/run` and `//ws`). | facade/http.ts | tiny | 1 |
| U3 | Sandbox entry: `apps/console/sandbox.html` + `src/sandbox.tsx` (Vite multi-input), composing a different `App`: no Settings drawer, no leader-URL field, Guides → `pymaxim.bio/sandbox/`, lean panel set as the Reachy shell already does (`CORE_PANELS.filter`). Read the fragment token once and `history.replaceState` it away before mount. | apps/console | small | 1 |
| U4 | **Auth frame on `/ws`.** `SubscribeFrame` is generated from the engine contract, so either the engine adds `token` (fold into P8b) or the kit sends a separate auth frame in `onopen` before subscribe. The subscribe frame is already re-sent on every reconnect (tested), so the token survives reconnect the same way. | facade/events.ts | tiny | 1 |
| U5 | **Do not ship without this.** `WsEventSource` reconnects forever (500 ms → 8 s cap), `onerror = null`, and exposes no state, so an expired session is a blank page silently retrying. Add a `status` observable (`connecting/open/backoff/refused`), give-up on an auth close code, a `useConnection()` hook, and a disconnected/expired banner. Feed `EventHub.identity` (the first `/ws` frame, currently unread by anything) into it. | facade/events.ts, eventClient.tsx | small | 2 |
| U6 | Contract hard gate: `BackendChip` only warns on `contract_version` drift, and `IdentityProvider` defaults **unknown seams to live**. A pinned image behind a stale CDN bundle gets a tooltip and then silent 422s. Add a blocking `<ContractGate>`, fold `BackendChip` onto `useIdentity()` (identity is fetched twice on mount today), and flip the unknown-seam default to not-live under the sandbox flag. | components/, facade/identity.tsx | small | 2 |
| U7 | Read-only while booting: the image reports `talk/adventure` seams `live: false` with a detail during model load; the kit honours it (rides U6). | kit | small | 2 |
| U8 | `SpendControls` **does not exist**; the only spend surface is a write-once number input in the wizard, and no verb reads spend back. Build it against P11. | components/SpendControls.tsx (new) | small | 4 |
| U9 | `SessionChip` (time left, End session) against P5 and a `session` meta-kind or `GET /api/session`; do not compute the deadline client-side from the token. | components/SessionChip.tsx (new) | small | 3 |
| U10 | Seed/agent picker inside the Console against P8, modelled on `AdventureLauncher` (list-from-server + free text). Adds `agent` to `RunRequest` → contract bump (P8b). | components/AgentPicker.tsx (new) | small | 4 |
| U11 | Disclosure surface ("pre-seeded; the words are the model's"), a dismissible first-run panel plus a persistent footnote. Static copy, no verb. | components/ | tiny | 3 |
| U12 | "Export my agent" button + download against P14. | components/ | tiny | 4 |
| U13 | `PanelDock` persists layout to a single `localStorage` key; every session on `sandbox.pymaxim.bio` shares one origin, so one visitor's rail layout leaks into the next on the same browser. Namespace by session id (storage is already injectable). | components/PanelDock.tsx | tiny | 1 |
| U14 | Packaging: `pack-dist.mjs` parses **no** argv and `TARGETS` is hardcoded, so `--flavour sandbox` is silently ignored today. Add a third target + a filter, add the artifact to the CI asset grep, and confirm whether pymaxim's `check_ui_contract` validates the `target` field before naming it. Extend the Reachy ESLint boundary and size budget to the sandbox dist (no react-flow in a public bundle). | scripts/, eslint.config.js | small | 4 |
| U15 | Amend `AGENTS.md` § "Localhost-only Console" and `maxim_console.md` open q #1–#2 in the same PR as U3; "explicit non-goal" cannot stay on `main` beside a shipped sandbox flavour. | docs | tiny | 1 |
| U16 | Choice surface for a playable Adventure: render the `dm_choice` meta-kind as buttons plus a free-text field, POST the pick to `/api/choice`, show the countdown to the agent choosing for an idle visitor. Binds to P16. | components/ChoicePrompt.tsx (new) | small | 3 |
| U17 | "Send this session" and "Report this session" buttons: explicit click, a sentence stating exactly what is packaged (agent home + transcript), bound to the broker's share/report endpoints. | components/ | tiny | 3 |

## Sequencing and gates

| Phase | Deliverable | Gate to pass |
|---|---|---|
| 0 Measure | A session container on the Mac mini, its large lane pointed at the mesh proxy, arena or heist for 10 turns: (a) the local 14B–32B model alone, (b) the same with 5 sessions running concurrently, (c) a cheap cloud model as the comparison arm. | p50 turn latency ≤ 8 s alone AND under 5-way contention; container start to `ready` ≤ 45 s; cost per 20-min cloud session known and the ceiling arithmetic done. If contention fails: raise `proxy.max_concurrent`, drop model size, or lower the concurrency cap — in that order. |
| 1 Broker + one machine | `POST /session` → machine → proxied Console works end to end; token enforced; P4/P4b/P4c/P4d in the image; U1–U4, U13, U15 in the bundle; teardown on idle via P5. | Two parallel sessions cannot see each other; `search_code`, `git_diff`, `/api/probe`, `/api/setup/mesh`, `/api/diagnose` all refused from a session; a killed machine leaves nothing behind. |
| 2 Site | Gold button, `/sandbox/` page, status island, behind a flag. U5–U7 in the bundle. | a11y pass; reads correctly with JS off; an expired session shows a banner, not a blank page. |
| 3 Console flavour | Sandbox bundle in the image; the 0.4.0 launch batch (P5 endpoint, P8, P11, P14, P16 + P8b); U9 SessionChip, U11 disclosure, U16 choice surface, U17 share/report; hand-off flow. Turn on the button. | A first-time visitor reaches a running Talk or a PLAYED Adventure in under 90 s without reading docs; an idle visitor's campaign advances by itself. |
| 4 Seeds, agent select, BYO key, export | Seed picker (experiment agents, Roy-primed infant, one character Maxim); P7/P8/P8b + U10; P9/P10/P11 + U8; P12–P14 + U12. | Every seed primed on the sandbox image; a pasted key actually dispatches (P9 test); the key never appears in broker logs; export restores into a local `maxim serve` under a different name. |
| 5 Hardening + extras | Rate limits tuned from traffic; P13 + the localhost probe; P15/P15b; performance-CPU tier if Phase 0 said so; P16 if visitors ask to play rather than watch. | 30 days without an abuse incident or a bill surprise. |
| 6 Party | P20a → P19 → P20 → P18 land in pymaxim; `party_v1.yaml` becomes a seed-and-scene option. | Party Mode shipped and documented in pymaxim first; the sandbox only exposes it. |

## Honest accounting

- **Cost:** bounded by `max concurrent × machine price` plus, in our-key mode, `max concurrent × per-session cap`. Start at 5 concurrent, 20-min sessions, and a cap that makes a bad session cost cents.
- **What the visitor sees:** a 1.7B model, an Adventure they watch rather than play, and a premise box that today lands in a memory-test harness. The page says all three. The point is the memory and drive panels; a visitor who wants a good narrator brings a key.
- **Privacy:** we host other people's API keys for up to 20 minutes, on a machine whose engine echoes env-sourced keys through `/api/diagnose` until P4b lands. Machine-only storage, tmpfs, no logging, destroyed on teardown, `/api/diagnose` closed, and the page says so before the paste box.
- **What learning survives:** nothing unless exported, and export needs P5 first or a Talk-only session exports pre-session state.
- **Abuse:** Turnstile, per-IP and global caps, egress allowlist, allowlisted tools with the bypass fixed, `/ws` origin-checked, input length capped, imagination capped, no `/api/stop` yet (P16) so a runaway adventure is bounded by the turn cap and the machine cap only.
- **Ops burden:** one more service, one more image, and a contract bump coordinated across two repos. The status widget degrades to "run it yourself", so an outage is a missing feature, not a broken site.

## Decisions (resolved)

1. Hosted sandbox is in scope. Localhost Console stays the product; the sandbox is a front-door demo of it. `AGENTS.md` and `maxim_console.md` get amended to say so (U15).
2. Isolation unit is the machine, not the process. `maxim serve` stays single-tenant and `127.0.0.1`-only; it gains a sandbox mode (P4) that closes public-unsafe endpoints, not an auth layer.
3. Auth is a per-session bearer minted by the broker, sent as a header on HTTP and an auth frame on `/ws`. No accounts.
4. The site stays static and logic-free; the broker is a separate repo.
5. **Host: Fly Machines**, one per session, a small stopped pool with the model on the root FS. Modal is request-shaped and GPU-first, neither of which we want by default.
6. **No GPU tier at launch.** If Phase 0 fails the latency gate: smaller model, then Fly performance CPUs, GPU last.
7. **Seeded agents instead of a warm-up seed**, picked on the guide page, primed on the sandbox image, labelled with origin and with "the words are the sandbox model's".
8. **Export:** a new `agent_home` bundle kind beside the existing substrate bundle, never the substrate bundle itself (it is lossy by design). The agent-home layout is stable enough across a minor version; the manifest carries version, hashes and encoder provenance so a future loader warns rather than loads garbage.
9. **Agent select** is a pymaxim seam (P8), Phase 4. **Party Mode** is a pymaxim project (P20), Phase 6. Launch is single-agent Talk plus watched Adventure on bundled campaigns.
10. **One contract bump** (0.3.0 → 0.4.0) carries every wire change in this plan; nothing trickles.
11. Bundled model is `smollm-1.7b-instruct` with the `llm.json` tiers override, unless Phase 0 says otherwise.
12. Tool policy is an **allowlist** armed through the existing `AgentPermissions` path, not a longer denylist.
13. **Narrator: a 14B–32B local model on the Mac mini through the mesh proxy is the primary** (2026-09-04). Each session is a mesh peer with its own lane key; the cloud arm is measured alongside in Phase 0 and is the fallback under the monthly ceiling. Phases 0–3 run entirely on the Mac mini (model native, broker as launchd, per-visitor containers, cloudflared); Fly Machines remain a later isolation swap.
14. **Adventure is playable at launch.** P16 joins the 0.4.0 launch batch; an idle visitor's choice times out to the agent, announced on the stream.
15. **Moderation is instance-level for OUTPUT; the Oasis moderates ADMISSION.** Instance: the sandbox bounds, the provider's safety behaviour in cloud mode, and a report button. Pain and reward at the Oasis/Hivemind level shape how a contribution is trusted, discounted or refused (`trusted_sources`, `validate_link`, provenance, the contributor-count floor) — that is membership, not a filter on a live session's text, which it cannot be.
16. **Monthly ceiling: $10**, a broker config value the operator can change; the broker refuses new sessions past it and the status widget says so.
17. **Send-session rides the Oasis intake, built as a bucket first.** On explicit click the broker writes the P14 agent-home bundle + transcript + manifest to a private R2 bucket; the authority Oasis (1.2 software, not yet built) consumes from that bucket later. Episodes enter an Oasis as private contributions and are never re-broadcast (`maxim_hivemind.md` § What's shareable).

## Open questions

1. **Per-peer lane keys on the leader proxy.** Decision 13 assumes the broker can mint a lane key per session; if the proxy knows only one key, a leaked key from one container serves every visitor. Check in Phase 1; if absent, add per-peer keys before any public session.
2. **Which local model.** Phase 0 picks among the 14B–32B profiles by the contention gate, not by benchmark prose.
3. **Choice timeout length** for an idle visitor (decision 14): long enough to read a scene, short enough that a queue of watchers is not held by one absent player.
4. **Oasis intake format.** The bucket manifest is the seam; when the 1.2 Oasis software is designed, it consumes exactly that. Route through `substrate_merge` only, `strict_geometry=True`, the contributor-count floor before publication, and keep a raw-substrate arm for the headline claim (`maxim_hivemind.md` § Confound discipline).

## References

- pulse `docs/plans/maxim_console.md` (three-layer stack, open questions #1 and #2); pulse `AGENTS.md` § Localhost-only Console
- pulse `packages/kit/src/facade/{http.ts,events.ts,eventClient.tsx,identity.tsx,contractVersion.ts}`; `scripts/{pack-dist,stamp-dist}.mjs`
- pymaxim `src/maxim/console/{server.py,handle.py,schemas.py,ui_bundle.py}`; `runtime/{config_loader,bootstrap,executor,agent_factory,lane_backends,lane_models,agent_pool}.py`; `agents/{autonomy,permissions}.py`; `models/language/{router,cloud_dispatch,types}.py`; `doctor/checks.py`; `simulation/{orchestrator,dm_runtime,generative_runner,arcs,narrator}.py`; `hivemind/{bundle,cli,merge}.py`; `load.py`; `utils/paths.py`
- pymaxim `docs/bugs/README.md` D50 (party_mode parsed, ignored); `docs/plans/deferred/agent_backed_entities.md`; `docs/plans/maxim_hivemind.md`; `docs/user/{dm-campaigns,substrate-sharing,hivemind_bundle_format}.md`
