---
title: Reachy Mini
description: Set up a Reachy Mini with Maxim — SDK version matching, network and first connection, running an agent on the robot, vision and audio, and the failure modes that actually happen.
---

[Reachy Mini](https://huggingface.co/docs/reachy_mini) is a small desktop robot from Pollen Robotics / Hugging Face: a 6-DOF Stewart-platform head on a single body-yaw axis, two expressive antennas, one camera, a 4-mic array behind a dedicated voice processor, and a speaker. On the Wireless variant a Raspberry Pi inside the robot runs the `reachy-mini-daemon`; on the Lite variant the daemon runs on a host you attach.

Maxim is a bio-inspired cognitive architecture, and Reachy Mini is its reference embodiment — the robot the project started on. What that means concretely today:

- **Shipped and validated on hardware:** connecting, motion, reading the camera, reading the microphone-array direction-of-arrival, running the full agent loop against the robot, and a learned sound-orienting policy (see [What it learns](#what-it-learns)).
- **Not the whole story:** Maxim normally runs on your laptop or a leader machine and talks to the robot over the LAN. Running the whole substrate *on the Pi itself* is measured but not shipped — see [On-device footprint](#on-device-footprint).

Everything above `src/maxim/hardware/` is robot-agnostic. Reachy Mini is the in-tree implementation of the `RobotController` interface, not a hard dependency of the architecture.

## Hardware at a glance

| Subsystem | What it is |
| --- | --- |
| Head | 6-DOF Stewart platform, commanded as task-space 4×4 poses (not joint angles). Head-yaw travel is **~±15–18° in practice** — a workspace clamp, slightly asymmetric per unit |
| Body | 1 yaw rotation — the coarse turning axis |
| Antennas | 2, expressive only |
| Vision | Single forward-facing camera, no depth |
| Audio in | 4× PDM MEMS mics behind a **Seeed reSpeaker XVF3800 (XMOS)** voice processor |
| Audio out | Speaker |
| Compute (Wireless) | Raspberry Pi (aarch64, Debian), daemon venv at `/venvs/mini_daemon` |

Both Lite and Wireless carry the same 4-mic array.

## Prerequisites

### Install Maxim with the `reachy` extra

The package is `pymaxim`; it imports as `maxim`.

```bash
pip install 'pymaxim[reachy]'
```

That extra pins `reachy-mini[gstreamer]>=1.8.3,<2.0`. Add `vision` and `audio` if you want the perception stack, and `semantic` for neural embeddings:

```bash
pip install 'pymaxim[reachy,vision,audio,semantic]'
```

See [Installation](/installation/) for the rest of the extras.

### Version matching — do this first, and after any reflash

This is the single fact that explains most breakage on this platform. **Pollen removed zenoh in SDK v1.5.0.** Before that release, control rode zenoh on TCP :7447 with multicast discovery and no `host` kwarg. From 1.5.0 onward, control is a WebSocket at `ws://<host>:8000/ws/sdk` and you address the robot directly.

**Client and daemon must be on the same side of that pivot.** A pre-1.5 client scouts zenoh at a modern daemon forever; the reverse 404s the WebSocket upgrade. A robot reflash silently moves the daemon, so check both sides:

```bash
# Daemon version, from your laptop — no ssh needed
curl -s http://<robot>:8000/api/daemon/status

# Or over ssh, from the daemon's own venv
ssh pollen@reachy-mini.local \
  '/venvs/mini_daemon/bin/python -c "import reachy_mini; print(reachy_mini.__version__)"'

# Laptop SDK version
python -c "import reachy_mini; print(reachy_mini.__version__)"
```

Match the minor line. **Watch for stale virtualenvs** — a second environment carrying an old `reachy_mini` will silently resurrect the dead zenoh transport if you run scripts with the wrong interpreter.

### Network

**Use station mode: put the robot on your home Wi-Fi.** The robot's own access point has no internet uplink, so pip, Hugging Face downloads and any cloud LLM lane all fail while you are joined to it, and you end up flipping networks constantly.

From the hotspot (`ssh pollen@10.42.0.1`) or the dashboard at `http://10.42.0.1:8000`:

```bash
nmcli device wifi rescan && sleep 3
nmcli device wifi list | grep -i <your-ssid>
nmcli device wifi connect "<SSID>" password "<pw>"
```

Two things that look like failures but are not:

- **Your SSH session dies the instant it connects — that is success.** One radio; joining home Wi-Fi tears down the hotspot you were SSH'd over. Rejoin your own network and `ssh pollen@reachy-mini.local`.
- **`ping 10.42.0.1` now fails.** Correct: that address only exists on the robot's own hotspot. Stop using it as a health check.

Verify with `nmcli -t -f NAME,DEVICE connection show --active`, `ip -4 addr show wlan0`, and `ping -c2 8.8.8.8`. Then **reboot the robot once** — the daemon binds at startup and a network flip leaves stale state. Set a DHCP reservation on your router so the robot's IP is stable; `.local` names resolve unreliably from Python even when `curl` resolves them fine.

**macOS, one time:** grant your terminal **Local Network** permission (System Settings → Privacy & Security → Local Network). An ungranted process sees the entire LAN as dead — instant "No route to host" on plain unicast TCP — and it looks exactly like a dead robot.

## First connection

On current images the stock systemd unit already runs the daemon with `--wireless-version --no-wake-up-on-start`, binding `0.0.0.0:8000`. There is no manual daemon start. Ports:

```
laptop ──── TCP 8000 ──── FastAPI: REST /api/*, dashboard, WebSocket /ws/sdk   ← control
       └─── TCP 8443 ──── GStreamer WebRTC signaling                            ← media only
       └─── UDP 5353 ──── daemon's own mDNS responder (_reachy-mini._tcp.local.)
```

Control never touches 8443. There is **no authentication** on `/ws/sdk` or the REST API in 1.8.x — treat the robot's LAN as the trust boundary.

### Verify before you write code

```bash
# 1. Is the daemon there, and what version?
curl -s http://<robot>:8000/api/daemon/status | python3 -m json.tool

# 2. Does the SDK control channel accept a handshake?
python3 -c "import websockets.sync.client as w; c=w.connect('ws://<robot>:8000/ws/sdk'); print(c.recv(timeout=3)[:120])"

# 3. Does direction-of-arrival flow?
curl -s http://<robot>:8000/api/state/doa
```

Maxim ships a robot-specific diagnostic that wraps the same probes:

```bash
maxim-diagnostics --host <robot-ip>
```

`maxim doctor` is the *environment* health check (platform, models, peer/leader connectivity) — useful, but it is not the robot probe. Use both.

### A minimal motion test

```python
from reachy_mini import ReachyMini
from reachy_mini.utils import create_head_pose

mini = ReachyMini(
    host="<robot-ip>",          # pass the IP; .local from Python is unreliable
    port=8000,
    connection_mode="network",  # skip the localhost attempt
    timeout=10.0,
    media_backend="no_media",   # motion + DoA need no media stack at all
)
mini.enable_motors()            # REQUIRED — wake_up() does NOT enable torque
mini.wake_up()
mini.goto_target(head=create_head_pose(yaw=15, degrees=True), duration=0.6)
```

Three non-obvious things, in order of how much time they cost:

1. **`enable_motors()` is mandatory.** The daemon boots torque-off. From SDK 1.5 onward `wake_up()` only moves and plays a sound. Without `enable_motors()`, every `goto_target` is *silently accepted and ignored* while position reads keep working — which looks exactly like a software bug.
2. **`goto_target(body_yaw=0.0)` is the default.** Every head command also actively drives the body back to zero yaw. Pass `body_yaw=None` to leave the body alone, or command it deliberately.
3. **The head 4×4 pose is in the world frame, above `body_yaw` in the kinematic chain.** Commanding body yaw with `head=None` makes the daemon counter-rotate the Stewart platform to hold the head's absolute orientation — the head, and the mic array inside it, barely turn. This one faked a sensor pathology for a whole day (see [audio_localization.md](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/audio_localization.md)).

Expect ~±14–18° of measured yaw for ±20° commanded. That is the workspace clamp, not a fault. A *constant* few-degree offset means the dashboard calibration is due. Closed-loop code is immune to both.

## Running an agent on the robot

Maxim connects through `~/.maxim/robots.yaml`, which the registry splats as keyword arguments into the Reachy controller:

```yaml
robots:
  primary:
    type: reachy_mini
    primary: true
    config:
      robot_name: reachy_mini
      host: 192.168.1.42        # prefer the IP over mDNS
      connection_mode: network
      media_backend: default    # "no_media" for control-only work
      timeout: 30.0
      body: bodies/reachy_mini  # opt-in: wire the SEM body
```

Then:

```bash
maxim --mode agentic
maxim --robot-name my_reachy      # non-default mDNS name
maxim --timeout 60                # slow network
```

### Embodiment / SEM body

`config.body` (or the `--embodiment` flag) loads a **SEM component** — Sensor / Entity / Modulator — as the agent's body. Maxim ships `bodies/reachy_mini`, which models head pose, body yaw, antennas, camera and microphone health, battery, motor temperature and pose confidence as sensors, with `look_at`, `nod`, `antenna_alert` and lifecycle modulators. Loading it auto-generates affordance tools and wires the pain cascade through NAc; omit it and the runtime runs bodiless.

```bash
maxim --mode agentic --embodiment bodies/reachy_mini
```

You can inspect the template without a robot:

```python
from maxim.embodiment.component_registry import ComponentRegistry

registry = ComponentRegistry()
reachy = registry.instantiate("bodies/reachy_mini", name="my_reachy")
print(reachy.sensors.keys())
```

### Headless vs robot mode

Maxim runs fine with no robot attached. The agent loop, LLM, planning, memory and coding tools all work; robot-specific tools return stub responses.

```bash
maxim --mode agentic --language-model mistral-7b   # no robot needed
```

For structured testing without hardware, prefer [Simulation](/guides/simulation/) — the full cognitive pipeline with percepts from a REPL or YAML instead of sensors. See [Operating Modes](/concepts/operating-modes/) for what each `--mode` value actually does.

## Vision and audio

### Vision

Frames from the head camera run through detection → pose estimation → IoU tracking → salience → attention. The default engine is RTMDet-m + RTMPose-m (Apache 2.0); YOLOv8 is optional and AGPL-3.0.

```bash
python -m maxim.models.download --vision   # fetch the ONNX models first
maxim --segmentation-model rtm             # or: yolo, needs the [yolo] extra
```

Limits worth stating plainly: one forward-facing camera, no rear or side vision, **no depth** (2D boxes only), and frame rate that tracks your hardware — CPU-only inference is noticeably slower.

### Audio: transcription

Transcription is faster-whisper with VAD gating, configured in `~/.maxim/util/whisper.json`:

```json
{
  "model": "distil-large-v3",
  "device": "auto",
  "compute_type": "int8",
  "language": "en",
  "vad_filter": true,
  "vad_threshold": 0.25
}
```

`distil-large-v3` is the recommended starting point; drop to `small` or `base` on limited hardware. Wake words are **"Maxim"** and **"Reachy"** (`"Maxim sleep"`, `"Maxim observe"`, `"Maxim shutdown"`, and `"center"` in agentic mode); custom phrases go in `~/.maxim/util/phrase_responses.json`. Toggle with `--audio true|false` and `--audio_len`.

### Audio: direction of arrival, and its hard limits

The 4 mics feed the XVF3800, which computes direction-of-arrival **on-chip**. Maxim consumes that angle rather than computing its own. Read it over the network:

```bash
curl -s http://<robot>:8000/api/state/doa
# {"angle": 1.57, "speech_detected": false}    0 = left, π/2 = front, π = right
```

Maxim normalizes it to `azimuth = (doa − π/2)/(π/2)` so left = −1, front = 0, right = +1, and gates updates on `speech_detected`.

The limits are geometry and silicon, not software:

| | Reachy Mini | Why |
| --- | --- | --- |
| Azimuth (left ↔ right) | Yes, 180° | On-chip DoA |
| Elevation (up ↕ down) | **No** | Linear, coplanar mic array — no vertical baseline |
| Front/back disambiguation | **No** | Cone of confusion on a linear array |
| Custom 4-mic TDOA/ITD | **No** | The XVF3800 exposes only a 2-channel, 16 kHz, already-beamformed stream. This is a chip-level USB-interface limit — dropping to ALSA or PortAudio does not bypass it |

Bench characterization (2026-07-16, after the head-frame bug above was fixed) found the chip itself is a good sensor: gain 0.57 az/rad, R² = 0.9982 over ±80°, monotonic throughout, ~0.23 s convergence after a 0.9 rad turn, hysteresis 0.015. The speech gate fires between 23% and 100% of samples (median 50%), so median-of-*k* plus gating is still required. What we *cannot* see is the chip's angular resolution or its algorithm — localization here is opaque and not ours to tune.

One trap: `mini.media.get_DoA()` reads the mic array over **local USB** in SDK ≥ 1.5, so it works onboard only. From a laptop it logs `ERROR: No Reachy Mini Audio USB device found!` — harmless noise. Use the REST endpoint.

## Optional: video streaming over the network

For pushing the robot's camera to consumers on another network, Maxim publishes over RTSP through **MediaMTX** — a single binary with no configuration needed for basic use. Maxim auto-starts it when a protocol needs RTSP streaming, so putting `mediamtx` on your `PATH` is usually the whole setup; port 8554 must be reachable from the consumer. MediaMTX can also live on a cloud relay or on the consumer's host when the two sides cannot reach each other directly.

Full topology, systemd unit, firewall table and troubleshooting: [`docs/mediaMTX.md`](https://github.com/dennys246/Maxim/blob/main/docs/mediaMTX.md).

## What it learns

Because the XVF3800 does the localizing, **Maxim is not learning to localize.** It learns the *sensorimotor orient policy*: which way to turn, how far, until azimuth error reaches zero — credited by drive-pain reduction through NAc. That is the honest, defensible embodied-learning claim on this platform.

The loop is small on purpose:

```
GET /api/state/doa ──► normalize ──► "audio" substrate modality ──► centeredness drive ──► orient affordance
   (on-chip DoA)      az ∈ [-1,1]      (frozen-centroid EC node)      (set-point: front=0)    (yaw command)
                                                                            │
                                                                       drive pain ──► NAc learns the policy
```

Credit is **relief** — error reduction per step — not raw pain; an earlier simulation study showed pain alone cannot drive action selection. On hardware, direction learning went from chance to 100% correct within about ten trials, with a visible one-trial correction: an exploratory wrong turn on trial 2 made the error worse, and on the very next visit to that state the greedy choice had already flipped. Reloading the persisted substrate in a later session started at 100% correct on trial 0, and two independently trained substrates merged into a working combined policy. The learned policy is eight numbers with provenance and zero personal data.

Stated limits, from the same work: it needs per-robot calibration (sign, gain, settle timing); it depends on the microphones physically rotating with the sensing frame; and policies do not transfer across robots with different gains. Magnitude learning is more fragile than direction learning — direction is sign-based and survives a proportional gain error, magnitude is threshold-based and does not.

Full write-up: [Sound Orientation](https://www.dennyschaedig.com/maxim/sound-orientation). For where NAc sits in the stack, see [Architecture](/concepts/architecture/), [Systems Overview](/systems/overview/) and [Memory](/memory/overview/).

## On-device footprint

Running the substrate *on the robot's own Pi* is an open engineering question, not a shipped path. Measured on a dev box, the bio-systems are essentially free (~1.5 MB); the whole footprint is the sentence-embedding runtime — ~488 MB with torch, ~441 MB with onnxruntime, ~70 MB with the bag-of-words fallback. A 7× smaller torch model saves almost nothing and ONNX saves only ~10%: the neural-inference *runtime*, not the model, is the floor. The clean answer is to place the encoder on a leader machine rather than shrink it. On-Pi measurement procedure: [`fit_runbook.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/fit_runbook.md).

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Network connection attempt failed…" — **instantly**, default host | `reachy-mini.local` did not resolve *from Python* (getaddrinfo/IPv6-first quirk — `curl` can succeed while Python fails) | Set `host:` to the IP; add a DHCP reservation |
| Same error — **instantly**, explicit IP | WebSocket handshake refused: daemon HTTP is up but its robot backend has not started, or macOS blocked the TCP connect | `curl /api/daemon/status`; `journalctl -u reachy-mini-daemon -n 50`; check Local Network permission |
| Same error — after **5–10 s** | Handshake fine, but no state stream — motor bring-up problem on the daemon | Restart the daemon or power-cycle; read `journalctl` |
| SDK hangs on "Waiting for connection with the server…" | That message is the **pre-1.5 zenoh client** — you are on opposite sides of the transport pivot, usually after a reflash or from a stale venv | Match versions; check for a second interpreter carrying an old `reachy_mini` |
| Ping, `nc`, `curl` — everything dead | macOS **Local Network permission** not granted to your terminal. A browser can reach the robot fine while your shell cannot | System Settings → Privacy & Security → Local Network. Check this *before* diagnosing the robot |
| Connected, reads work, **robot does not move** | Torque is off. `wake_up()` does not enable it; `goto_target` is silently ignored while reads keep working | `mini.enable_motors()` before any motion |
| Head undershoots (±20° commanded, ±14–18° measured) | Stewart-platform yaw clamp; a constant bias means calibration is due | Normal. Use body yaw as the coarse axis; write closed-loop policies |
| GStreamer wall of errors, `No such element: appsink`, hang on connect | The pip GStreamer bundle and a homebrew GStreamer loaded into one process | For control/DoA: `media_backend="no_media"`. For camera work: remove one of the two GStreamer stacks |
| `ERROR: No Reachy Mini Audio USB device found!` | `mini.media.get_DoA()` probing *your laptop's* USB bus | Harmless. Use `GET /api/state/doa` |
| `/state/doa` returns 404 | All daemon API routes are under `/api` | Use `/api/state/doa`; browse `http://<robot>:8000/docs` for the live surface |
| `nmcli … key-mgmt: property is missing` | SSID not in the scan cache (common for 5 GHz right after boot) | Rescan; if it persists, add the connection with `wifi-sec.key-mgmt wpa-psk` explicitly (`sae` for WPA3-only) |
| `ssh` dies mid `nmcli connection up` | Success — one radio, the hotspot tore down | Rejoin home Wi-Fi, ssh the new address |
| `/venvs/apps_venv/bin/activate: No such file` | Gone on current images | The daemon venv is `/venvs/mini_daemon` |
| Whisper segfaults | ctranslate2 compute-type issue | `MAXIM_WHISPER_COMPUTE_TYPE=float32 maxim` |

**Advice to ignore on modern daemons (≥ 1.5):** probing `:7447`, `ssh -L 7447` tunnels, `--via-tunnel`, `--no-localhost-only`, `localhost_only=False`, and zenoh multicast discovery debugging. There is no zenoh listener — nothing on 7447 is the *expected* state, not a symptom. (Some older pages in the repo, including `docs/user/robot-setup.md`, still describe zenoh discovery and zenoh-era diagnostics; the `docs/embodiment/reachy_mini/` set is the current source of truth.)

## Going deeper

Repo documentation this guide draws on:

- [`docs/embodiment/reachy_mini/README.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/README.md) — platform overview and the transport-pivot table
- [`docs/embodiment/reachy_mini/getting_started.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/getting_started.md) — network setup, version matching, first connect, the Step-1 smoke test
- [`docs/embodiment/reachy_mini/troubleshooting.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/troubleshooting.md) — the full symptom-indexed decision tree
- [`docs/embodiment/reachy_mini/engineering.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/engineering.md) — REST/WebSocket surface, motion semantics, media backends
- [`docs/embodiment/reachy_mini/audio_localization.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/audio_localization.md) — mic-array physics, XVF3800 limits, measured DoA characterization
- [`docs/embodiment/reachy_mini/fit_runbook.md`](https://github.com/dennys246/Maxim/blob/main/docs/embodiment/reachy_mini/fit_runbook.md) — on-Pi memory footprint
- [`docs/mediaMTX.md`](https://github.com/dennys246/Maxim/blob/main/docs/mediaMTX.md) — RTSP relay setup
- [`docs/user/robot-setup.md`](https://github.com/dennys246/Maxim/blob/main/docs/user/robot-setup.md) — adding a robot that is not a Reachy Mini

On this site: [Installation](/installation/) · [Configuration](/configuration/) · [CLI Reference](/reference/cli/) · [Architecture](/concepts/architecture/) · [Operating Modes](/concepts/operating-modes/) · [Memory](/memory/overview/) · [Systems Overview](/systems/overview/) · [Simulation](/guides/simulation/)
