---
title: The Oasis — sharing substrate
description: How one agent's learned substrate reaches another — bundles and signed releases, the exchange endpoints, the oasis and hive CLIs, and the trust defaults that decide what a receiver will admit.
---

Two Maxim agents can share what they have learned. Not their episodes and not their
prompts — their **substrate**: the NAc reward biases that say what is worth doing,
and the EC concept clusters those biases are keyed on. One agent exports that as a
bundle, signed or not; another validates it, aligns it onto its own cluster space, and
folds it in. The Oasis is the peer-to-peer exchange that moves those bundles between
machines, and it shipped end to end in 1.2.

This is a different axis from [networking and mesh](/guides/networking/). That guide
is about sharing *inference* — many agents borrowing one GPU. This one is about
sharing *learning*, and the two are independent: an Oasis is not a model host, and a
leader is not obliged to serve substrate.

**Why this matters is measured, not assumed.** A taught want transferring into an
independent agent and changing its first-contact behaviour is the earned 1.2 claim —
[Exp 56](/research/evidence/#a-taught-want-transfers-between-independent-agents), on
a live Minecraft world at n = 50 per arm, with an unsigned bundle through the shipped
export and ingest path. Pooling several partial learners is the
partial one: faster per participant, at a
[total-experience cost](/research/evidence/#pooling-partial-learners--faster-per-participant-at-a-total-experience-cost).
Read both before deciding what an Oasis buys you.

## The shape of it

| Piece | What it does |
| --- | --- |
| **Bundle** | A zip of NAc + EC slices with a manifest. Signed, it is a **release** (below) |
| **Oasis** | A server holding two tiers: signed **releases**, and received **experimental** contributions |
| **Hive registry** | A client-side list of Oases you trust, at `~/.config/maxim/hive.json` |
| **Ingest** | The receiver-side validation and merge — ten duties, then the aligned fold |

The trust model is deliberately asymmetric. Publishing to the release tier requires
a signature; pulling from it verifies that signature against keys **you** registered;
and contributing to an Oasis puts a bundle in a holding tier that nothing promotes
out of. A receiver decides what it admits, and the default answer is *very little*.

## Signing a release

Signature support is an optional extra, because the base compose and ingest paths
never require it:

```bash
pip install 'pymaxim[sign]'

maxim substrate keygen --signer-id alice       # mint + print the public key to share
maxim substrate export release.zip --session <id> --contributor-id alice \
  --sign --license CDLA-Permissive-2.0
```

Since 1.3.1 a signed export is a **release** in format v2: a detached signature over
every file in it, a signed index of its entries (`maxim substrate inspect --entries`
prints them), its signer, its place in the signing key's sequence, and the license it is
published under — which is why `--license` is required. The sequence comes from a
per-host counter for each key. A key you signed with before 1.3.1 is unknown to that
counter, so its first 1.3.1 release needs `--release-sequence N` once. Keep a Queen key
apart from your development key with `--key-file`.

Verification covers every file's raw bytes, so a tampered byte, the wrong key, an
untrusted signer, or an unknown algorithm is refused outright rather than admitted with
clamps. Private keys are written `0600` from creation. Unsigned bundles still ingest
when nobody asked for a signature — that is the experimental tier's normal case, and
the path both sharing experiments ran through.

**The format is frozen.** Both shapes — a signed release and an unsigned bundle — are
public format 1: every 1.x release reads them as published, and changing either needs a
recorded decision
([what is and is not promised](https://github.com/dennys246/Maxim/blob/main/docs/plans/public_format_freeze.md)).
Unsigned bundles stay readable by 1.3.0.

## Ingesting one

`maxim substrate ingest` is the receiver-side path, and it is a **dry run by
default**:

```bash
maxim substrate ingest release.zip \
  --session <receiver-id> --trust alice --receiver-body <body_ref> \
  --receiver-agent-id <your-agent-id> \
  --require-signed --trust-key alice=<pubkey>

# the same command with --apply actually writes
```

`--trust` names the contributors you admit, and anyone else's bundle is refused.
`--receiver-agent-id` re-keys the donor's rows to your own agent; a release is refused
without it. `--session` takes a simulation's session ID, a `maxim.create.agent()` name,
or a path. The receiver must be at rest, and the pair is backed up and journalled before
anything is written. Behind the verb is the validation contract: contributor trust
and provenance stamping, numeric bounds with NaN and infinity refused at parse time,
count and confidence caps, strict geometry that refuses unstamped foreign nodes, a
receiver-side re-run of the identity quarantine and content scrub, resource caps read
from the archive's central directory, declared-slices-only reads, and a journal that
dedupes by digest so a replay is an explicit choice. The merge itself aligns the
donor's clusters onto the receiver's before folding, and a bias the receiver already
holds negative can deepen but is never raised toward zero by an import.

**What a receiver remembers (1.3.1).** A verified ingest journals the signer's key, its
sequence and the digest of what it admitted. A `--require-signed` ingest then refuses a
second, different payload claiming the same key and sequence — equivocation — and a
legacy v1 bundle from a key whose v2 release it already admitted — a downgrade. Every
ingest, signed or not, also recognises a re-zipped or padded copy of a bundle it already
merged. The journal is per receiver session and records only verified admissions, so a
release first taken without verification seeds neither rule.

**What merging keeps (1.3.1).** Ingest used to pair causal links by outcome alone, so a
receiver's own links that differed only in context overwrote one another on every
ingest, even from a donor that brought nothing: one real store went from 607 links to
443 ([#913](https://github.com/dennys246/Maxim/issues/913)). Links now pair on outcome
and context, so every receiver link survives. When several donor situations align onto
one of yours, they fold together — mean want, the most aversive fear — instead of the
last one winning, and a donor's decay-exempt marker can no longer attach to a bias you
learned yourself ([#914](https://github.com/dennys246/Maxim/issues/914)).

**What an export leaves out.** The export scrub is an allowlist at every level, so a field
the scrub does not name never ships; a signed release carries no local agent id; and an
unsigned export ships only your own learning, not material you ingested from others.

Since 1.3 a bundle can also carry a learned situation **fear** — the negative valence an
agent booked against a situation that hurt it. It travels under its own rules: clamped
and allowlisted on export, bounded on ingest, and multiplied by **0.75** on the way in,
because a fear received second-hand is real but weaker than one the agent felt. A fear
whose world node did not survive the merge is dropped rather than left dangling, and the
ingest report says which. This is the path the
[shared-fear result](/research/evidence/#a-survival-fear-transfers-between-agents) ran
through. Pair 1.3 exporters with 1.3 receivers.

This is the path Exp 56 ran through, with an unsigned bundle. It is worth being precise about what that
bought: a bias key whose representation is missing is **dropped and reported**, not
silently landed, which is exactly what the experiment's falsifier arm measured.

## Running an Oasis

```bash
maxim oasis serve                                         # start the exchange endpoints
maxim oasis publish release.zip --queen-key alice=<pubkey>   # verify, then add to the release tier
maxim oasis status                                        # tier counts
```

`publish` refuses anything that is not a verified v2 release signed by a `--queen-key`,
and anything that contradicts a release it already holds. A release's id is the digest
of its signed payload, so an id from before 1.3.1 changes; re-pin any
`hive pull --release <id>`.

`oasis serve` injects a store into the existing leader proxy and exposes three
authenticated routes on it — list releases, download a bundle by id, submit a
contribution. They reuse the proxy's bearer auth, per-IP rate limiting and
concurrency admission; without a store injected they answer an authenticated 404, so
a plain leader gains no new surface. Serving on a non-loopback interface without a
bearer key is refused unless you pass `--insecure`, which you should not.

## Subscribing to one

```bash
maxim hive add friends https://oasis.example --queen-key alice=<pubkey> --domain orient
maxim hive list
maxim hive pull --from friends --session <receiver-id> --receiver-body <body_ref> \
  --receiver-agent-id <your-agent-id> --api-key <key>
# the same command with --apply actually writes
maxim hive contribute bundle.zip --to friends --api-key <key>
```

`hive pull` fetches signed releases, in sequence order, and then **delegates to
`substrate ingest`** — the verification, the ten duties and the journal are reused
rather than reimplemented — and it is a dry run until `--apply`. A release whose signer
is not a Queen key you registered for that Oasis is refused before anything is
unpacked. `--api-key` is the Oasis's bearer key: since 1.3.1 your local leader key is
sent only to an Oasis on this machine, so a remote or LAN Oasis needs its own.

This flow was run on the 1.3.1 wheel against an Oasis on the same machine: a signed export,
`publish`, then `pull`, which verified the release and reported the received fear
discounted ×0.75. Without `--receiver-agent-id` the pull is refused.

## What a receiver trusts by default

Default trust is **Queen-only**. A pull refuses a release that is not signed by a
registered Queen key for that Oasis, and it refuses the decay-exempt *inherent*
bias class — the safety-floor biases that never decay and never prune — outright.
Both refusals are opt-outs, per Oasis, and both are deliberate:

```bash
maxim hive trust friends --inherent            # admit the decay-exempt class
maxim hive trust friends --trust-source alice  # allow-list contributor ids
maxim hive trust friends --allow-unsigned      # DISABLES signature verification
maxim hive trust friends --accept-v1           # admit legacy v1-signed releases
```

An Oasis added since 1.3.1 refuses legacy v1 signatures by default; one added before
keeps accepting them.

`--allow-unsigned` turns signature checking off for that Oasis's release stream. It
is not a subscription to a lower tier; it is the check itself, off. Contradictory
flags error rather than quietly granting the looser setting, and a malformed policy
fails loudly instead of degrading to permissive.

## What isn't shipped

- **Queen-tier promotion.** An Oasis accepts contributions into the experimental
  tier and never promotes them. The gauntlet battery that would score a bundle for
  promotion does not exist yet, so the blocker is
  [recorded](https://github.com/dennys246/Maxim/blob/main/docs/plans/archive/hivemind_p2p_scope.md)
  rather than shipping a gate that cannot gate. In practice `maxim hive contribute`
  is write-only in 1.2: your bundle lands, tagged with its provenance, and a human
  decides what happens next.
- **Discovery.** The registry is static and operator-maintained. There is no
  directory of Oases and no automatic peering.
- **Generalization across worlds.** A shared want is keyed on an exact cluster, so
  it fires where it was taught and not at a materially different layout. That is a
  [pre-registered null](/research/evidence/#where-it-didnt-hold-up), not a bug. Exp 62,
  earned the day after 1.3.0 shipped, is consistent with it: an agent's own fear carried to a
  second pool because that pool reads as the same situation in a different place, and it
  misses in roughly the last 5% of each in-game day, where the clock's wrap makes the
  situation read differently
  ([Exp 62](/research/evidence/#a-learned-fear-carries-to-a-second-pool-the-same-situation-a-different-place)).
  Generalization across a changed situation is the working direction of the 1.4 roadmap
  rather than a result.
- **How far a shared fear reaches.** Since 1.3 a learned fear has been measured
  moving between agents: a receiver that never felt the pain left the water on its
  first loop-live submersion
  ([Exp 61](/research/evidence/#a-survival-fear-transfers-between-agents)). That is
  one pool, one world layout, substrate-primary. A *received* fear's reach to a
  different pool, its extinction, scaling to more donors, and hive-side promotion of a
  shared fear are all untested. (Exp 62 measured an agent's *own* fear crossing pools, with
  no sharing involved; it says nothing about a fear that arrived in a bundle.)
