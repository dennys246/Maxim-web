---
title: The Oasis — sharing substrate
description: How one agent's learned substrate reaches another — signed bundles, the exchange endpoints, the oasis and hive CLIs, and the trust defaults that decide what a receiver will admit.
---

Two Maxim agents can share what they have learned. Not their episodes and not their
prompts — their **substrate**: the NAc reward biases that say what is worth doing,
and the EC concept clusters those biases are keyed on. One agent exports that as a
signed bundle; another validates it, aligns it onto its own cluster space, and folds
it in. The Oasis is the peer-to-peer exchange that moves those bundles between
machines, and it shipped end to end in 1.2.

This is a different axis from [networking and mesh](/guides/networking/). That guide
is about sharing *inference* — many agents borrowing one GPU. This one is about
sharing *learning*, and the two are independent: an Oasis is not a model host, and a
leader is not obliged to serve substrate.

**Why this matters is measured, not assumed.** A taught want transferring into an
independent agent and changing its first-contact behaviour is the earned 1.2 claim —
[Exp 56](/research/evidence/#a-taught-want-transfers-between-independent-agents), on
a live Minecraft world at n = 50 per arm. Pooling several partial learners is the
partial one: faster per participant, at a
[total-experience cost](/research/evidence/#pooling-partial-learners--faster-per-participant-at-a-total-experience-cost).
Read both before deciding what an Oasis buys you.

## The shape of it

| Piece | What it does |
| --- | --- |
| **Bundle** | A zip of NAc + EC slices with a manifest, optionally `ed25519`-signed |
| **Oasis** | A server holding two tiers: signed **releases**, and received **experimental** contributions |
| **Hive registry** | A client-side list of Oases you trust, at `~/.config/maxim/hive.json` |
| **Ingest** | The receiver-side validation and merge — ten duties, then the aligned fold |

The trust model is deliberately asymmetric. Publishing to the release tier requires
a signature; pulling from it verifies that signature against keys **you** registered;
and contributing to an Oasis puts a bundle in a holding tier that nothing promotes
out of. A receiver decides what it admits, and the default answer is *very little*.

## Signing a bundle

Signature support is an optional extra, because the base compose and ingest paths
never require it:

```bash
pip install 'pymaxim[sign]'

maxim substrate keygen --identity alice        # mint + print the public key to share
maxim substrate export out.zip --session <id> --contributor-id alice --sign
```

Verification covers the manifest and the raw slice bytes, so a tampered byte, the
wrong key, an untrusted signer, or an unknown algorithm is refused outright rather
than admitted with clamps. Private keys are written `0600` from creation. Unsigned
bundles still ingest when nobody asked for a signature — that is the experimental
tier's normal case.

## Ingesting one

`maxim substrate ingest` is the receiver-side path, and it is a **dry run by
default**:

```bash
maxim substrate ingest bundle.zip \
  --session <receiver-id> --receiver-body <body_ref> \
  --require-signed --trust-key alice=<pubkey>

maxim substrate ingest bundle.zip --session <receiver-id> \
  --receiver-body <body_ref> --apply          # actually write
```

The receiver must be at rest, and the pair is backed up and journalled before
anything is written. Behind the verb is the validation contract: contributor trust
and provenance stamping, numeric bounds with NaN and infinity refused at parse time,
count and confidence caps, strict geometry that refuses unstamped foreign nodes, a
receiver-side re-run of the identity quarantine and content scrub, resource caps read
from the archive's central directory, declared-slices-only reads, and a journal that
dedupes by digest so a replay is an explicit choice. The merge itself aligns the
donor's clusters onto the receiver's before folding, and a bias the receiver already
holds negative can deepen but is never raised toward zero by an import.

This is the path Exp 56 ran through. It is worth being precise about what that
bought: a bias key whose representation is missing is **dropped and reported**, not
silently landed, which is exactly what the experiment's falsifier arm measured.

## Running an Oasis

```bash
maxim oasis serve                       # start the exchange endpoints
maxim oasis publish signed-bundle.zip   # add a signed bundle to the release tier
maxim oasis status                      # tier counts
```

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
maxim hive pull --from friends --session <receiver-id> --receiver-body <body_ref>
maxim hive pull --from friends --session <receiver-id> --receiver-body <body_ref> --apply
maxim hive contribute bundle.zip --to friends
```

`hive pull` fetches signed releases and then **delegates to `substrate ingest`** —
the verification, the ten duties and the journal are reused rather than
reimplemented — and it is a dry run until `--apply`. A release whose signer is not a
Queen key you registered for that Oasis is refused before anything is unpacked.

## What a receiver trusts by default

Default trust is **Queen-only**. A pull refuses a release that is not signed by a
registered Queen key for that Oasis, and it refuses the decay-exempt *inherent*
bias class — the safety-floor biases that never decay and never prune — outright.
Both refusals are opt-outs, per Oasis, and both are deliberate:

```bash
maxim hive trust friends --inherent            # admit the decay-exempt class
maxim hive trust friends --trust-source alice  # allow-list contributor ids
maxim hive trust friends --allow-unsigned      # DISABLES signature verification
```

`--allow-unsigned` turns signature checking off for that Oasis's release stream. It
is not a subscription to a lower tier; it is the check itself, off. Contradictory
flags error rather than quietly granting the looser setting, and a malformed policy
fails loudly instead of degrading to permissive.

## What isn't shipped

- **Queen-tier promotion.** An Oasis accepts contributions into the experimental
  tier and never promotes them. The gauntlet battery that would score a bundle for
  promotion does not exist yet, so the blocker is
  [recorded](https://github.com/dennys246/Maxim/blob/main/docs/plans/hivemind_p2p_scope.md)
  rather than shipping a gate that cannot gate. In practice `maxim hive contribute`
  is write-only in 1.2: your bundle lands, tagged with its provenance, and a human
  decides what happens next.
- **Discovery.** The registry is static and operator-maintained. There is no
  directory of Oases and no automatic peering.
- **Generalization across worlds.** A shared want is keyed on an exact cluster, so
  it fires where it was taught and not at a materially different layout. That is a
  [pre-registered null](/research/evidence/#where-it-didnt-hold-up), not a bug, and
  the readout that would change it is 1.3 work.
- **Aversion transfer.** Only positive credit has been measured moving between
  agents. The tighten-only clamp that would protect a learned aversion is shipped
  and exercised, but negative-valence transfer is its own future experiment.
