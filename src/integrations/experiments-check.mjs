// Fails the build when the experiments manifest is inconsistent.
//
// Registered as an Astro integration rather than a package script because
// Cloudflare Pages runs `astro build` directly — a pre-build npm script would
// never run there. Structural checks run at config time (so `pnpm dev` reports
// them too); link checks need the rendered pages, so they run after the build.
import { readFile } from 'node:fs/promises';
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

export default function experimentsCheck() {
	return {
		name: 'maxim:experiments-check',
		hooks: {
			'astro:config:setup': ({ logger }) => {
				const errs = validate();
				if (errs.length) {
					throw new Error(`experiments.json is invalid:\n  - ${errs.join('\n  - ')}`);
				}
				logger.info(`experiments manifest OK (${manifest.experiments.length} entries)`);
			},
			'astro:build:done': async ({ dir, logger }) => {
				const errs = [];
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
				logger.info('experiment walkthrough links OK');
			},
		},
	};
}
