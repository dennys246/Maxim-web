---
title: Networking & mesh
description: Run one machine as the model host (leader) and point other machines or a headless robot at it over a Cloudflare Tunnel — roles, tunnel setup, admission control, cloud fallback, and troubleshooting.
---

Maxim is a bio-inspired cognitive architecture. Most of the time it runs on one machine and serves its own inference. But the interesting model — the one that shipped and the one that matters for a robot — is **distributed**: one machine with a GPU hosts the model, and everything else borrows it over the network.

This guide covers the shipped path: standing up a **leader**, exposing it through a Cloudflare Tunnel, pointing a **peer** at it, and diagnosing the failures you will actually hit. It assumes you have Maxim installed (`pip install pymaxim`; imports as `maxim`) — see [Installation](/installation/) if not.

## Why distributed inference

A capable local model wants a real GPU and a lot of memory. A laptop, or a Reachy Mini's onboard Pi, has neither. Rather than run a weak model everywhere, you run **one** strong model on the machine that can host it and let the rest of your fleet call into it:

- Offload heavy reasoning from a laptop or a robot to a home server with a GPU.
- Keep one hot model resident on that server and attach several Maxim instances to it.
- Fall back to a cloud provider (Anthropic, OpenAI) when the leader is offline.

What's shipped today is a clean single-leader / many-peer topology: peers forward their **large** lane to the leader over HTTPS, the leader serves it from GPU, and the bytes come back. What's *not* here yet is automatic peer discovery and per-request "smartest available backend" routing — those are described honestly under [What's planned](#whats-planned).

## The roles

Every Maxim instance resolves to exactly one of three roles at startup:

| Role | What it does | Runs |
| --- | --- | --- |
| **Leader** | Hosts the model for the mesh. Binds `0.0.0.0` so peers can reach it. | `llama-cpp-server` + LeaderProxy + `cloudflared` + its own agent loop |
| **Peer** | Borrows a leader's model. Its large lane points at the leader's URL. | agent loop only (large lane is remote) |
| **Solo** | Standalone, no networking. The default. | `llama-cpp-server` + agent loop, bound to loopback |

A leader still runs its own agent loop — hosting the model doesn't stop it being a full Maxim instance. Both the leader's own CLI and every peer share the one model copy in VRAM.

### How the role is detected

Role is decided by a **seven-rank priority order** (first match wins). You rarely set it by hand — presence of a tunnel config or a peer config is usually enough:

1. `MAXIM_ROLE=leader|peer|solo` environment variable
2. `~/.config/maxim/config.json::role` (the canonical persistent setting, via `maxim config set role`)
3. `~/.config/maxim/mesh.yml` exists → **peer**
4. `~/.cloudflared/config.{yml,yaml}` or `/etc/cloudflared/config.{yml,yaml}` exists → **leader**
5. `~/.config/maxim/peer.yml` exists → **peer**
6. `--llm <local-profile>` flag with no other signal → **solo**
7. Default fallback → **leader**

Note that cloudflared detection (rank 4) sits **above** `peer.yml` (rank 5) on purpose: a stale `peer.yml` left over from when a box was a peer will not silently override a machine that is now a real leader. To force a role regardless, set `MAXIM_ROLE` before starting the daemon. `maxim doctor` reports a `role_divergence` warning when env and config disagree.

## Set up a tunnel (the core how-to)

The transport is deliberately boring: plain HTTPS speaking the OpenAI-compatible `/v1` API, carried by a Cloudflare Tunnel. Cloudflare is a dumb HTTP proxy — it does not authenticate; the **Bearer key does**. Here is the full path.

### Topology

```
   peer (laptop / robot)                    leader (GPU host)
  ┌─────────────────┐                      ┌──────────────────────────────┐
  │  agent loop     │                      │  LeaderProxy  :8099           │
  │  large lane ────┼──── HTTPS ──►  ┌──────┤  (Bearer auth, logging,       │
  └─────────────────┘         │      │      │   admission control)          │
         ▲                    │      │      │         │ forwards            │
         │             Cloudflare    │      │         ▼                     │
         └──────────── Tunnel ───────┘      │  llama-cpp-server  :8100      │
                    (cloudflared)           │         (GPU)                 │
                                            └──────────────────────────────┘
```

Requests enter at the LeaderProxy on **port 8099**, which authenticates and logs them, then forwards to `llama-cpp-server` on **port 8100**. The tunnel must point at 8099, never 8100 — routing the tunnel straight at 8100 bypasses auth entirely.

### 1. On the leader: provision the tunnel

You need `cloudflared` installed (a system package, not pip) and a domain on Cloudflare's nameservers. Then run the guided setup once:

```bash
maxim tunnel setup      # login → create tunnel → DNS route → write config.yml
maxim tunnel status     # show what's configured
```

The guided flow authenticates in your browser, creates a named tunnel (default `maxim-llm`), routes a hostname you provide, and writes `~/.cloudflared/config.yml` with the local port defaulting to **8099** (the LeaderProxy). The resulting config looks like:

```yaml
tunnel: <tunnel-id>
credentials-file: ~/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: maxim.yourdomain.com
    service: http://localhost:8099    # LeaderProxy — NOT 8100
  - service: http_status:404
```

`maxim tunnel setup` also generates a **256-bit API key** and wires it into the spawned `llama-cpp-server` via `--api_key`, so peers must present a valid Bearer token or get `401`. Manage it with:

```bash
maxim tunnel key show       # print the full key (for secure sharing)
maxim tunnel key export      # copy-paste export snippets for every shell
maxim tunnel key rotate      # generate a new key (invalidates existing peers)
```

### 2. On the leader: start serving

```bash
maxim                    # auto-detects leader (cloudflared config present),
                         # binds 0.0.0.0, auto-spawns llama-cpp-server + cloudflared
```

With `~/.cloudflared/config.yml` present, Maxim promotes itself to leader, binds the spawned server to `0.0.0.0`, and — if no `cloudflared` daemon is already running — launches one as a managed subprocess. Opt out of the tunnel auto-spawn with `MAXIM_AUTO_SPAWN_TUNNEL=0`. To keep the tunnel up independently of Maxim, install it as a service: `sudo cloudflared service install`.

The model itself **auto-downloads on first run** — the first launch with a given profile prompts to fetch the GGUF (set `MAXIM_AUTO_DOWNLOAD_MODELS=1` to skip the prompt). Bundled profiles run up to `llama-3.1-70b`; register anything else with `maxim model add`. See [LLM setup](https://github.com/dennys246/Maxim/blob/main/docs/user/llm-setup.md) for model choice and hardware tiers.

### 3. Verify the leader is healthy *before* touching the peer

From any machine — including the peer you're about to configure:

```bash
curl -sI https://maxim.yourdomain.com/v1/models
```

Expect `HTTP/2 200` with a JSON body listing the model. Anything else means the peer can't succeed yet — stop and fix the leader first (see [Troubleshooting](#troubleshooting)).

### 4. On the peer: connect

Three commands, in order:

```bash
maxim peer connect https://maxim.yourdomain.com   # step 1: pair
# paste the API key at the hidden prompt
```

`peer connect` normalizes the URL (appends `/v1` if missing), prompts for the key, runs a four-step connectivity test (DNS → TLS → `GET /v1/models` → a real chat completion), and **only saves the config if the test passes**. It writes `config.json::lanes.large.*` (canonical in 1.x) and `~/.config/maxim/peer.yml` (deprecated compat, mode `0600`). Copy **only** the value after `=` from the leader's key export — no `export`, no variable name, no quotes.

```bash
maxim peer test https://maxim.yourdomain.com/v1   # step 2: re-verify anytime
maxim                                             # step 3: run — large lane is now remote
```

To watch a request cross the tunnel, start with lane tracing:

```bash
MAXIM_LANE_TRACE=1 maxim
# [lane:large] POST /v1/chat/completions -> remote (23ms RTT, 142ms total)
```

Per-session overrides don't need `peer connect` — env vars win over the saved config:

```bash
MAXIM_LANE_LARGE_REMOTE_URL=https://maxim.yourdomain.com/v1 maxim
```

Passing a local profile with `--llm mistral-7b` on a configured peer runs that model **locally** for the session instead of forwarding to the leader — a one-shot override without editing files.

### 5. Confirm the whole path with `maxim doctor`

```bash
maxim doctor                                          # full local report
maxim doctor --as peer https://maxim.yourdomain.com/v1  # end-to-end peer check
maxim doctor --json                                   # machine-readable, for CI
```

`doctor` checks tunnel status, LeaderProxy reachability, auth validity, key hygiene (age, file permissions, that a bogus key is *rejected*), inference coherence (sends a fixed prompt and verifies the answer), and system resources. In peer mode it runs DNS, reachability, auth, model availability, and round-trip latency probes.

## Admission control & metrics

The LeaderProxy is more than a passthrough — it protects the single GPU behind it and gives you observability.

**Concurrency semaphore.** `MAXIM_PROXY_MAX_CONCURRENT` (default `4`) caps in-flight requests to the backend. Excess requests get `429 Too Many Requests` with an `X-Maxim-Queue-Depth` header. The peer-side router treats `429` as a signal to back off and retry, so this is transparent to the agent.

**Per-peer rate limiting.** `MAXIM_PROXY_RATE_LIMIT_RPM` (default `0`, meaning disabled) caps requests-per-minute per API key. Over the limit returns `429` with a `Retry-After` header.

**Per-request headers.** Every proxied response carries `X-Maxim-Proxy: true`, an `X-Maxim-Request-ID` (UUID4), and `X-Maxim-Latency-Ms` — the request ID lets you correlate a single call across the peer and leader logs.

**Lane metrics.** Maxim routes through three capability lanes — **large** (14B+, GPU), **medium** (7B, CPU/GPU), **small** (~1.7B, CPU) — and tracks p50/p99 latency, failure rate, and token throughput per lane. Read them from the proxy:

```bash
curl -s -H "Authorization: Bearer $MAXIM_API_KEY" \
  https://maxim.yourdomain.com/v1/debug/metrics | python -m json.tool
```

Companion debug endpoints (all Bearer-gated or localhost-only) include `/v1/debug/status`, `/v1/debug/heartbeat`, `/v1/debug/vram`, `/v1/debug/last-requests`, and `/v1/debug/version`. A local heartbeat thread (enable with `MAXIM_HEARTBEAT=1`, sampled every 10s) prints a one-line hardware + runtime summary: `[heartbeat] gpu=72% vram=5.1/8.0GB cpu=2.4 ram=61% disk=42GB loop=+0.8s lanes=3/0/1`.

Expect roughly **65–94 ms** of added latency per short completion over the tunnel (Cloudflare hop plus inference); on a LAN it's ~5–20 ms. That's fine for planning and review lanes but tight for real-time motor control — keep a **local** backend on any lane driving actuators. See the [Reachy Mini guide](/guides/reachy-mini/) for the robot side of that tradeoff.

## Cloud fallback

Cloud lanes let a peer keep working when the leader is down, and let a solo machine punch above its local model. They are gated so you never spend money by accident:

| Env var | Default | Effect |
| --- | --- | --- |
| `MAXIM_MAX_CLOUD_LANES` | `0` | Hard cap on lanes targeting a cloud endpoint. **Must be raised to use Claude/OpenAI.** |
| `MAXIM_CLOUD_SESSION_BUDGET` | `5.0` | Per-session USD ceiling — a hard reject once hit. |

Self-hosted endpoints (localhost or a private IP) are **not** counted as cloud, so your leader never consumes a cloud lane. A public tunnel hostname *is* treated as cloud: `peer connect` auto-detects `is_cloud: true` for public URLs and raises `MAXIM_MAX_CLOUD_LANES` to `1` on startup so the peer→leader path works out of the box.

For genuine cloud fallback, set an API key and let auto-detect do the wiring. If you export a provider key with no other LLM config on a solo machine, Maxim **auto-enables cloud dispatch** at startup (priority order Anthropic → OpenAI → Google → Groq → Together → Fireworks → Mistral → DeepSeek; first key found wins the profile):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
maxim                              # cloud dispatch auto-configured
```

To pin Claude on the large lane explicitly:

```bash
maxim config set lanes.large.remote_url https://api.anthropic.com/v1
maxim config set lanes.large.remote_model claude-sonnet-4-6
export ANTHROPIC_API_KEY=sk-ant-...
export MAXIM_MAX_CLOUD_LANES=1
maxim
```

All cloud calls are budgeted and audit-logged to `~/.maxim/util/cost_state.json`. Full cost-limit behavior is in [LLM setup](https://github.com/dennys246/Maxim/blob/main/docs/user/llm-setup.md).

## Troubleshooting

Work top-down: is the leader healthy, is the tunnel up, does auth pass, is the peer's lane actually remote. `curl -v -H "Authorization: Bearer <key>" https://<hostname>/v1/models` and reading the `server:` header is the fastest bisection — a `server: cloudflare`-only response means the edge is answering (the request never reached your box); a backend header (`uvicorn`, `llama-cpp-server`) means your server responded.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `URL has no host` from `peer test` | Missing `https://`, or you pasted an angle-bracketed placeholder literally (zsh reads `<`/`>` as redirection) | Prepend `https://`; type the real hostname |
| `DNS failed` | Hostname doesn't resolve, or an A record points at the origin instead of a tunnel CNAME | `dig <hostname>`; on the leader, `cloudflared tunnel route dns <tunnel-name> <hostname>` |
| `SSL: CERTIFICATE_VERIFY_FAILED` | You're reaching a different server than intended (wrong host, parked domain, expired cert) | Re-verify the hostname with `maxim tunnel status`; don't disable TLS verification |
| `HTTP 401` | Bearer key rejected | Re-export the key from the leader; paste only the value after `=`. If uncertain, `maxim tunnel key rotate` and re-share |
| `HTTP 403` (but `curl` returns 200) | Cloudflare WAF / Bot Fight Mode, or an Access application on the hostname | Disable Bot Fight Mode or add a WAF skip for the tunnel host; remove any Zero Trust Access app on the hostname |
| `HTTP 502` | Tunnel edge reached, origin didn't answer — leader down, or `cloudflared` pointing at the wrong local port | Confirm `maxim` is running on the leader; check `config.yml` has `service: http://localhost:8099`, then restart cloudflared |
| `HTTP 521 / 522` | Origin down or timing out | Start (or restart) the leader process |
| Inference works but leader GPU idles (`nvidia-smi` at 0%) | `llama-cpp-python` built without CUDA, or spawned with `n_gpu_layers=0` | Rebuild with `CMAKE_ARGS="-DGGML_CUDA=on" pip install --force-reinstall --no-cache-dir llama-cpp-python`, then `export MAXIM_AUTO_SPAWN_N_GPU_LAYERS=-1` |
| Peer "works" but never hits the leader | Lane fell back to local (peer config loaded after lane init), or a stale probe cache | Start with `MAXIM_LANE_TRACE=1` and confirm `backend=remote`; `peer connect`/`forget` clears the probe cache at `~/.maxim/util/last_probe_status.json` |
| Requests hit the cloud API instead of the peer leader | Cloud provider outranks the local/peer provider in routing | Ensure the peer endpoint is `local`-class and ranks above cloud in your routing config |
| Server accepts *any* key | Tunnel is bypassing the LeaderProxy | Route the tunnel through port 8099, not 8100 |

For a deeper bisection ladder, see the repo troubleshooting docs linked below.

## What's planned

These are **not shipped** — they describe where the mesh is going, not what it does today:

- **mDNS / zero-config discovery.** Auto-peering via a `_maxim-llm._tcp` service record so peers find a leader on the LAN without a hand-configured URL, falling back to explicit config on blocked networks.
- **An InferenceRouter for per-request backend selection.** Today a peer's large lane is statically wired to one leader. The planned router picks the best backend *per request* — local GPU vs. peer leader vs. cloud — from live lane metrics, cost constraints, and model compatibility.
- **Operator-visibility surface.** Cluster-key rotation as a first-class verb and a fuller admin/trace API are partly landed and partly still specified; treat the routing design doc as the target contract, not a description of today's code.

> **Already shipped, despite older write-ups calling them future work:** remote peer management (`maxim peer update`, `maxim peer restart`, `maxim peer llm <model>` for a hot model swap), multi-node mesh config (`mesh.yml` with `maxim peer add-node` / `drain` / `resume`), and cloud-provider integration all exist on `main`. If a page mixes these into a roadmap, prefer the repo docs.

## Going deeper

- **[Peer setup walkthrough](https://github.com/dennys246/Maxim/blob/main/docs/user/peer-setup.md)** — the canonical peer→leader remote-inference guide, including mesh management and failure-mode debugging.
- **[LLM setup](https://github.com/dennys246/Maxim/blob/main/docs/user/llm-setup.md)** — model profiles, tunnel provisioning, cloud backends, and cost limits.
- **[LLM routing architecture](https://github.com/dennys246/Maxim/blob/main/docs/architecture/llm_routing.md)** — the deep, code-adjacent spec for how a request flows through the eight routing layers (marked Present vs Target; cross-check against source before relying on any claim).
- **Mesh troubleshooting** — [mesh debug runbook](https://github.com/dennys246/Maxim/blob/main/docs/troubleshooting/mesh_debug.md) (routing-layer symptoms) and [peer↔leader connectivity](https://github.com/dennys246/Maxim/blob/main/docs/troubleshooting/peer_leader_connectivity.md) (network-layer diagnosis).
- Related on this site: [Operating modes](/concepts/operating-modes/) · [Architecture](/concepts/architecture/) · [Configuration](/configuration/) · [CLI reference](/reference/cli/) · [Systems overview](/systems/overview/) · [Reachy Mini](/guides/reachy-mini/).
