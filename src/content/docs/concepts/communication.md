---
title: Communication & safety
description: How a Maxim agent talks to humans through a transport-only Communication Gateway, why inbound external data can never set critical internal fields, and how conversations become memory.
---

Maxim can reach a human outside the terminal — a text message, a phone call — and
take messages back. That external surface is deliberately kept thin. The part of
the [bio-inspired cognitive architecture](/concepts/architecture/) that moves bytes
in and out has *no* decision-making authority: it delivers what the agent asked it
to deliver, and it hands inbound messages to the agent as untrusted perception.
Everything that decides *whether* to act on a message happens in the cognitive
systems, behind hard boundaries.

This page covers the Communication Gateway, the channels it drives, how inbound data
is hardened, how conversations become memory, and where the messaging surface meets
the safety machinery documented elsewhere.

## The Communication Gateway

The gateway is a **pure transport layer**. The agent controls *when* and *what* to
communicate; the gateway merely delivers. Its design philosophy is stated bluntly in
the source docs:

> The gateway is a dumb pipe. The agent is the brain.

Two flows pass through it:

```
Outbound   Agent ──▶ send_message tool ──▶ Gateway ──▶ Channel ──▶ User
Inbound    User ──▶ Channel ──▶ Gateway ──▶ Percept on bus ──▶ Agent
```

Outbound, the agent proposes a `send_message` (or `call`) tool call — which, like
every side-effecting tool, is reviewed by the [fear circuit](/systems/fear-circuit/)
before it runs — and the gateway performs the delivery. Inbound, a channel receives
a message, the gateway wraps it as a percept, and drops it on the perception bus like
any other sensory input. The agent then decides what, if anything, to do about it.

Why make the transport layer deliberately "dumb"? Because the alternative is
dangerous. If inbound message content could reach into internal state — set a
priority, raise an override, change autonomy — then anyone who can send an SMS could
steer the agent. Keeping the gateway free of decision authority is what makes the
inbound hardening below *structural* rather than a matter of the agent choosing to be
careful.

## Channels

Be honest about what is shipped versus planned.

| Channel | Status | Notes |
|---|---|---|
| Twilio SMS | **Shipped** | Send/receive text via Twilio's REST API |
| Twilio voice | **Shipped** | Outbound voice calls via Twilio |
| Email (SMTP/IMAP) | Planned | Stubbed, not delivering |
| Slack / Discord webhooks | Planned | Stubbed, not delivering |
| WebSocket (web UIs) | Planned | Stubbed, not delivering |

The Twilio channel exposes `send(recipient, body)` for SMS and
`call(recipient, message)` for voice, and receives inbound traffic through a webhook
that calls `gateway.receive_inbound()`. Everything else in the table is a stub kept in
the code as a shape to fill in later — do not rely on it.

At the tool layer, this surfaces as:

- **`send_message`** — send an SMS via Twilio. Requires the `--comms` flag and Twilio
  credentials.
- **`call`** — place a voice call via Twilio. Requires the `--comms` flag and Twilio
  credentials.
- **`respond`** — print a text response in the console (always available; not a
  Twilio path).
- **`speak`** — speak text aloud via text-to-speech. Requires the `--tts` flag.

The full tool catalog lives in the [tools reference](/reference/tools/).

## Inbound data hardening

Every message arriving from an external channel is treated as **untrusted input**.
The gateway constructs the inbound `Percept` itself and fixes the fields that matter,
so external content is confined to the one field that is genuinely user data:

```
source        = "comms:twilio"   # set by the gateway, never by the sender
content       = text             # the ONLY field taken from external data
salience      = 0.9              # FIXED — not settable from outside
hard_override = None             # only ever set from the HARD_STOP_TRIGGERS whitelist
```

The critical rule: **external data can never set `salience`, `hard_override`,
`novelty`, or `interests`.** A sender controls `content` and nothing else. In
particular, `hard_override` accepts only a `str | None` value drawn from a hardcoded
`HARD_STOP_TRIGGERS` whitelist — an inbound message cannot inject an arbitrary
override trigger, cannot raise its own salience to jump the attention queue, and
cannot mark itself as novel or as a standing interest. Those are internal appraisals
the agent makes about perception, not properties perception is allowed to assert
about itself.

This is the whole reason the gateway is a dumb pipe. Because the transport layer has
no authority to write internal fields, there is no code path from "someone texted the
robot" to "the robot's critical state changed." The boundary is enforced at
construction, not by downstream vigilance.

**Say what this is and isn't.** This hardening protects the *structured* fields of a
percept — priorities, overrides, autonomy-adjacent flags. It does not make inbound
text harmless as *content*: a message is still natural language the agent will read
and reason over, and prompt-injection-style manipulation through content is a
different problem, mitigated by the layered review in the
[fear circuit](/systems/fear-circuit/) and by keeping autonomy appropriate to the
risk, not by the gateway. Treat the field hardening as one independent layer among
[several](https://github.com/dennys246/Maxim/blob/main/docs/user/safety.md).

## Conversation memory

Messaging is not stateless. Exchanges are tracked per channel and participant, and
archived into the memory substrate so the agent can learn from how conversations go.

- A `ConversationManager` accumulates messages **per channel / participant**.
- When a conversation **expires**, `_archive(conversation)` publishes a summary
  percept back onto the bus.
- The [Hippocampus](/systems/hippocampus/) captures that summary as an **episodic
  memory** — a recallable record of the exchange.
- The [NAc](/systems/nucleus-accumbens/) records conversation events (for
  conversations of **3 or more messages**), so outcomes of talking can feed causal
  learning.
- During session consolidation, a `SemanticPromoter` promotes recurring patterns into
  concepts in the [Anterior Temporal Lobe](/systems/anterior-temporal-lobe/) — the
  semantic knowledge base — so durable facts about a contact or a recurring topic
  survive as generalized knowledge rather than a pile of individual transcripts.

```
conversation expires
        │  ConversationManager._archive(conversation)
        ▼
  summary Percept ──▶ Hippocampus   (episodic memory of the exchange)
                 └──▶ NAc           (conversation events, 3+ messages)
                          │  session consolidation
                          ▼
                 SemanticPromoter ──▶ ATL concepts (durable, generalized)
```

One honesty note from the source: there is **no separate `CommunicationBridge`** in
the 1.0 release. Archival flows through the `ConversationManager` directly — the
promotion path is real, but it is not a distinct bridging subsystem.

## Safety around messaging

The messaging surface leans on safety machinery that is documented in full elsewhere.
The summaries below exist only so you know these controls apply to communication too;
follow the links for the actual mechanisms.

### Preemption and execution reversal

An in-flight action — including sending a message or placing a call — can be
interrupted. The preemption circuit offers three tiers: **HARD_STOP** (unconditional
halt), **REDIRECT** (suspend the current goal for a higher-priority one), and
**HOLD** (pause goal proposals while the loop keeps cycling). Before each tool runs,
an `ExecutionTracker` captures a pre-execution snapshot (`goal_description`,
`tool_name`, `tool_params`, and robot state) so an interrupted action can be reversed,
logged, or resumed. Note the honest limit that applies squarely to messaging: a
committed side effect like a sent SMS cannot be physically undone — only the
*decision* is reversed. The full mechanism, including the `ReversalType` distinction,
lives in the [fear circuit](/systems/fear-circuit/).

### Mode-based containment

What a channel or tool is allowed to touch is bounded by the current autonomy level.
In **planning** mode the agent proposes but does not execute without approval; in
**supervised** mode it acts within pre-approved bounds; in **autonomous** mode it acts
freely within policy — and dangerous patterns are still gated regardless of level.
Communication tools sit under these same permission bounds, so raising or lowering
autonomy changes what the agent may send or whom it may contact without asking. The
canonical levels, the permission tables, and the containment model are documented in
[Operating modes](/concepts/operating-modes/).

## A note on the hosted service

The Twilio SMS and voice channel is backed by a **real hosted service** — messages and
calls travel through Twilio's infrastructure and, where the project provides a hosted
endpoint for inbound webhooks, through that. Because a live service handles real
phone numbers and real message content, it carries a privacy policy and terms of
service; those documents exist precisely because the service is real, not as
boilerplate. This page does not reproduce that legal text — if you enable `--comms`
and route real traffic, read the applicable privacy policy and terms for how message
data is handled. The self-hosted, terminal-only parts of Maxim do not involve this
service at all.

## Going deeper

- [Safety Guide](https://github.com/dennys246/Maxim/blob/main/docs/user/safety.md) —
  the ten independent safety layers, and how to configure or reset each.
- [Tools Reference](https://github.com/dennys246/Maxim/blob/main/docs/user/tools.md) —
  `send_message`, `call`, `respond`, `speak`, and the rest of the catalog.
- [Fear circuit](/systems/fear-circuit/) — preemption tiers, execution snapshots, and
  reversal in full.
- [Operating modes](/concepts/operating-modes/) — autonomy levels and the permission
  bounds that contain every tool, communication included.
