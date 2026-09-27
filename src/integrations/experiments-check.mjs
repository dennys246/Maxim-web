// Fails the build when the experiments manifest is inconsistent.
//
// Registered as an Astro integration rather than a package script because
// Cloudflare Pages runs `astro build` directly — a pre-build npm script would
// never run there. Structural checks run at config time (so `pnpm dev` reports
// them too); link checks need the rendered pages, so they run after the build.
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { manifest, validate } from '../lib/experiments.mjs';

async function anchorExists(outDir, href) {
	const [path, frag] = href.split('#');
	let html;
	try {
		html = await readFile(new URL(`.${path}index.html`, outDir), 'utf8');
	} catch {
		return `page ${path} was not built`;
	}
	if (!frag) return null;
	const ids = [frag, encodeURIComponent(frag)];
	return ids.some((id) => html.includes(`id="${id}"`)) ? null : `no #${frag} on ${path}`;
}

async function* walk(dir) {
	for (const d of await readdir(dir, { withFileTypes: true })) {
		const url = new URL(d.name + (d.isDirectory() ? '/' : ''), dir);
		if (d.isDirectory()) yield* walk(url);
		else if (d.name.endsWith('.html')) yield url;
	}
}

export default function experimentsCheck() {
	return {
		name: 'maxim:experiments-check',
		hooks: {
			'astro:config:setup': async ({ config, logger }) => {
				const errs = validate();
				// An experiment page lives at /research/experiments/<slug>/ and a
				// src/pages route beats Starlight's catch-all, so a slug equal to a
				// docs page there would silently replace that page.
				const docsDir = new URL('src/content/docs/research/experiments/', config.root);
				const docPages = (await readdir(docsDir)).map((f) => f.replace(/\.mdx?$/, ''));
				for (const e of manifest.experiments) {
					if (docPages.includes(e.slug)) errs.push(`experiment ${e.slug}: slug collides with a docs page`);
				}
				if (errs.length) {
					throw new Error(`experiments.json is invalid:\n  - ${errs.join('\n  - ')}`);
				}
				logger.info(`experiments manifest OK (${manifest.experiments.length} entries)`);
			},
			'astro:build:done': async ({ dir, logger }) => {
				const errs = [];
				// Every on-site link under /research/experiments/ must land on a built
				// page — an experiment page or a walkthrough. Catches a renamed slug.
				const seen = new Map();
				for await (const file of walk(dir)) {
					const html = await readFile(file, 'utf8');
					for (const [, page] of html.matchAll(/href="\/research\/experiments\/([^/"#]+)\//g)) {
						if (!seen.has(page)) seen.set(page, fileURLToPath(file));
					}
				}
				for (const [page, from] of seen) {
					try {
						await readFile(new URL(`research/experiments/${page}/index.html`, dir));
					} catch {
						errs.push(`${from} links to /research/experiments/${page}/, which was not built`);
					}
				}
				// Each research line is a heading on the index, and experiment pages link
				// to it by its heading id; the heading text must match the line title.
				for (const l of manifest.lines) {
					const problem = await anchorExists(dir, `/research/experiments/#${l.anchor}`);
					if (problem) errs.push(`line ${l.slug}: index heading "${l.title}" — ${problem}`);
					const walk = l.walkthrough && (await anchorExists(dir, l.walkthrough));
					if (walk) errs.push(`line ${l.slug}: walkthrough ${l.walkthrough} — ${walk}`);
				}
				for (const e of manifest.experiments) {
					if (!e.walkthrough) continue;
					const problem = await anchorExists(dir, e.walkthrough);
					if (problem) errs.push(`${e.slug}: walkthrough ${e.walkthrough} — ${problem}`);
				}
				if (errs.length) {
					throw new Error(
						`experiment links are broken in ${fileURLToPath(dir)}:\n  - ${errs.join('\n  - ')}`,
					);
				}
				logger.info('experiment links OK');
			},
		},
	};
}
