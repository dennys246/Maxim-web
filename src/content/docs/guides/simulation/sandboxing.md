---
title: Safety and sandboxing
description: Where a simulated agent can and cannot reach — the sandbox backends, the filesystem policy, the fear gate, the pain-triggering files, and the Docker isolation table.
---

A simulation lets an agent act, so it needs somewhere to act that is not your machine. The layers below
stack; each is verified at 1.1.3.

## Sandbox backends

`--sandbox auto|docker|tmpdir` picks the backend. `auto`, the default, uses Docker if it is available and
otherwise falls back to a temp directory with a warning. Both are destroyed after the run.

- **tmpdir** creates a directory under the system temp location and relies on the filesystem policy and
  the fear-gated executor for containment. Minimal overhead; host-level isolation only.
- **docker** runs the agent under test inside a container as an unprivileged user, with OS-enforced
  process, filesystem and network isolation. `--sandbox-image` chooses the image (default
  `python:3.12-slim`); `--sandbox-network none|bridge|host` chooses connectivity, default `none`.

`--no-sim-env` skips populating the simulated filesystem so the sandbox starts empty.

## The layers

1. **Filesystem policy.** Every file tool is scoped to an allowed set of directories: the sandbox and the
   agent's workspace. Home, system files and project source are outside it.
2. **The fear-gated executor.** Every tool call passes through the fear agent's pattern matching and code
   review before it runs, independent of the default network, so it works in headless simulation too.
3. **Pain-triggering files.** The simulated filesystem is seeded with sensitive-looking files such as
   `/etc/shadow` and `.ssh/id_rsa`. Touching one fires a pain signal on the pain bus after the operation
   completes, so the agent sees the result and feels the consequence, and the hippocampus and NAc record
   it.
4. **Autonomy level.** The agent runs at `AUTONOMOUS`, so no confirmation prompt can deadlock a headless
   run; the fear gate still reviews every call. Sub-agents spawned by the orchestrator inherit the same
   sandbox and the same gate.

A confirmation prompt that would normally block on stdin is auto-approved in simulation by default. The
other response policies, auto-reject, delayed and ask-orchestrator, exist to test refusals, timeouts and
full confirmation flows.

## Docker isolation

Resource limits scale with the agent's autonomy level:

| Level | Memory | CPUs | Pids | Workspace |
|---|---|---|---|---|
| PLANNING | 256m | 0.5 | 32 | read-only |
| SUPERVISED | 512m | 1.0 | 64 | read-write |
| AUTONOMOUS | 1g | 2.0 | 128 | read-write |

Root-owned honeypot files return permission denied and fire pain, two layers of feedback; files under the
user's home are readable but still pain-triggering, so the agent learns through the NAc rather than being
blocked.

The image catalog covers realistic deployment targets: `python:3.12-slim` (default) and
`python:3.12-bookworm`; `ubuntu:22.04` and `ubuntu:24.04`; `debian:12-slim`; `rockylinux:9`,
`almalinux:9` and the Red Hat `ubi9/ubi-minimal`; `alpine:3.19`.

Containers get UUID-suffixed names, `--rm` auto-removal and an exit hook, so a simulation killed with
SIGKILL leaves no orphan container. Runaway commands are killed container-side with the `timeout`
coreutil.

## What this does not cover

The sandbox bounds what the **agent under test** can touch. It does not bound the orchestrator or the
narrator, which run in the host process with the host's LLM configuration; it does not limit how many
LLM calls a run makes; and the trace files a run writes under `sim_sandbox/` land in the data home
(`~/.maxim/` unless `$MAXIM_DATA_HOME` redirects it; through 1.1.3 they were `data/sim_sandbox/` relative
to your working directory), not inside the sandbox. If you are running untrusted scenarios on a shared machine,
`--sandbox docker` with `--sandbox-network none` is the setting to insist on.

## Related

- [Communication & safety](/concepts/communication/) for the fear circuit itself
- [Fear circuit](/systems/fear-circuit/) for what the review looks at
- [CLI and environment reference](/guides/simulation/cli/) for the sandbox flags
