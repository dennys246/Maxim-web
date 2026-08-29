# maxim-web

The **public front door** for Maxim: the landing page (`pymaxim.bio`) + the docs
(`docs.pymaxim.bio`). A static site — **Astro + Starlight**, deployed on **Cloudflare Pages**.

## Where this sits in the ecosystem

| Repo | Concern |
|---|---|
| **pymaxim** | the engine — the Python framework + the Console backend (`maxim serve`) |
| **maxim-pulse** | the product — the React Console app + the Reachy shell |
| **maxim-web** (this) | the front door — landing + docs, *about* all of the above, owned by none |

The site is **presentation/content only.** It links to the code and the app; it does not
reimplement them, and it does not need to duplicate pymaxim's deep technical docs (those can
stay code-adjacent in `pymaxim/docs` — see "Docs source" below).

## Stack

- **Astro** (content-first, fast static output) + **Starlight** (the docs theme).
- Markdown/MDX content. React components can be dropped in where interactivity is wanted
  (consistent with maxim-pulse's stack), but default to static.
- Build → `dist/` → **Cloudflare Pages** (custom domains `pymaxim.bio` + `docs.pymaxim.bio`).

## Structure

```
maxim-web/
├─ astro.config.mjs        # site: https://pymaxim.bio; starlight integration + nav
├─ package.json
├─ pnpm-workspace.yaml     # pnpm allowBuilds for esbuild/sharp
├─ src/
│  ├─ pages/index.astro    # the landing (hero + links) at the apex
│  ├─ components/          # ExperimentsIndex.astro, ComponentCatalog.tsx (the one React island)
│  ├─ data/                # experiments.json, components.json — generated, never hand-edited
│  └─ content/docs/        # Starlight docs
├─ scripts/build-components.mjs  # regenerates src/data/components.json from the engine registry
├─ public/                 # favicon.svg, og.png placeholder, static assets
├─ LICENSE                 # Apache-2.0 (copy from pymaxim); optional CC-BY-4.0 for docs content
└─ README.md
```

### Regenerating the component catalog

`src/data/components.json` drives `/reference/components/` and the counts on
`/embodiment/component-library/`. It is generated from the engine registry
(`src/maxim/_data/components/**/*.yaml`) so the component count is derived, never typed.
Generate it from the **published wheel** the site documents, not from a moving `main`:

```bash
python -m venv /tmp/pymaxim && /tmp/pymaxim/bin/pip install pymaxim==<version>
pnpm build:components -- \
  --source "$(/tmp/pymaxim/bin/python -c 'import maxim,pathlib;print(pathlib.Path(maxim.__file__).parent/"_data"/"components")')" \
  --label "pymaxim <version> (PyPI wheel)"
```

The output is deterministic (no timestamps); a regenerate with no registry change is a no-op
diff. A normal run **always overwrites `src/data/components.json`**, whatever `--source`
pointed at — add `--dry-run` to inspect a registry (say, engine `main`) without publishing it.

## Domains

- `pymaxim.bio` → the landing (`src/pages/index.astro`).
- `docs.pymaxim.bio` → the Starlight docs (`src/content/docs/`).
- Both served by one Cloudflare Pages project (or two — a Pages project can host both with a
  base-path split, or run docs as a Starlight sub-site; decide when wiring Pages).

## Docs source (a decision to defer — don't block the bare version on it)

- **Simplest:** maxim-web owns all docs (homepage + everything).
- **Code-adjacent:** deep API/architecture reference stays in `pymaxim/docs` (updates with
  code); maxim-web is the landing + curated narrative guides that link into it.

For the **bare** first version: ship **homepage + a getting-started page** and link out to the
existing guides. Migrate/curate the real guides as a follow-up once the shell is live.

## Homepage hero (seed copy — refine, don't overclaim; the project values honesty)

- **Name:** Maxim
- **Tagline:** *A bio-inspired LLM harness that carries experience-grounded memory, causal
  links, drives, and valence across sessions — without fine-tuning model weights.*
- **Install:** `pip install pymaxim`
- **Primary links:** GitHub (`github.com/dennys246/Maxim`) · PyPI (`pypi.org/project/pymaxim`)
  · Docs (`pymaxim.bio/getting-started/`) · (later) the Reachy app on Hugging Face.
- **Voice:** honest and specific over hype. Maxim's differentiator is *cross-session learning
  without fine-tuning* + embodiment — say that plainly; don't inflate it.
- **Scope discipline:** the substrate augments the LLM's context in the default path; it does
  not generally override the model's priors. Claims on the site are bounded by the pymaxim
  repo's experiment, defect, limits, and graduation ledgers — those win over anything here.

## Deploy (Cloudflare Workers Builds)

New Cloudflare Git projects route through **Workers Builds** (the Pages creation flow is
being retired for new connections). This repo ships a `wrangler.jsonc` that deploys the
static `dist/` as Worker assets. No Astro adapter is needed; there is a small Worker
script (`worker/index.js`) whose only job is the `docs.pymaxim.bio` redirect below.

1. `pnpm build` → `dist/`.
2. Cloudflare → Workers & Pages → create a Worker from this repo. Build command
   `pnpm build`, deploy command `npx wrangler deploy` (config in `wrangler.jsonc`).
3. After the first deploy: Worker → Settings → Domains & Routes → Add → Custom domain →
   `pymaxim.bio`, then again for `docs.pymaxim.bio`. Cloudflare creates the DNS records.
4. If the build errors on Node version, set `NODE_VERSION=22` as a build environment
   variable (the repo has no `.nvmrc`/`engines` pin).

One Worker serves both domains. `pymaxim.bio` is canonical and serves the site;
`docs.pymaxim.bio` is a legacy alias that now **308-redirects path-preservingly** to the
canonical host, with `/` landing on `/getting-started/`. Previously both domains served
the same `dist/` from the landing page, which meant the alias published a duplicate
homepage declaring a canonical URL it did not itself serve.

The redirect lives in `worker/index.js` and depends on `"run_worker_first": true` in
`wrangler.jsonc` — without it the asset server answers before the Worker ever sees the
`Host` header, and the alias silently keeps serving duplicates.

## Standards

See [AGENTS.md](AGENTS.md). In short: content-first, static, fast, accessible; link to the
code/app rather than duplicating; ship bare then grow; no secrets in the repo.
