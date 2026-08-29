#!/usr/bin/env node
// Generate src/data/components.json from the pymaxim component registry.
//
// The registry is the directory tree `src/maxim/_data/components/**/*.yaml` in
// the engine (or the same tree inside an installed wheel: `maxim/_data/components`).
// Every number on the Components pages is derived from this file, never typed
// by hand — the 72 / 73 / 81 disagreement between the old hand-maintained
// catalogs is exactly what this script exists to end.
//
// Counting rule (mirrors ComponentRegistry._scan_all in the engine): a YAML
// file is a component iff it carries a top-level `component:` header. The
// `archetypes/*.yaml` scaffolds have no such header and are skipped, just as
// the runtime registry skips them. Files are counted once per ref
// (`<category>/<name>`); category comes from the header, falling back to the
// directory name.
//
// Usage:
//   node scripts/build-components.mjs --source <dir> --label "<what the dir is>"
//
//   --source  path to the components directory. Defaults to the engine checkout
//             beside this repo (../Maxim/src/maxim/_data/components).
//   --label   free-text provenance shown on the page, e.g.
//             "pymaxim 1.1.0 (PyPI wheel)". Prefer the published wheel the site
//             documents over a moving `main` checkout.
//   --dry-run print the tally and write nothing. Use this to inspect a registry
//             you are not publishing — a normal run always overwrites
//             src/data/components.json, whatever --source pointed at.
//
// The output is deterministic for a given source tree (no timestamps), so a
// regenerate with no registry change produces no diff.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

// Same set as ComponentRegistry.query()'s _GENRE_TAGS in the engine.
const GENRE_TAGS = ['fantasy', 'cyberpunk', 'scifi', 'modern', 'devops', 'horror', 'historical'];

function arg(name, fallback) {
	const i = process.argv.indexOf(name);
	return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const source = resolve(arg('--source', join(repoRoot, '..', 'Maxim', 'src', 'maxim', '_data', 'components')));
const label = arg('--label', 'engine checkout (src/maxim/_data/components)');
const dryRun = process.argv.includes('--dry-run');
const outPath = join(repoRoot, 'src', 'data', 'components.json');

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir).sort()) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...walk(p));
		else if (name.endsWith('.yaml')) out.push(p);
	}
	return out;
}

const keys = (obj) => (obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj) : []);
const list = (v) => (Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)]);

const components = [];
const skipped = [];

for (const file of walk(source)) {
	const rel = relative(source, file);
	let doc;
	try {
		doc = parseYaml(readFileSync(file, 'utf8'));
	} catch (e) {
		throw new Error(`${rel}: ${e.message}`);
	}
	const header = doc && typeof doc === 'object' ? doc.component : null;
	if (!header || typeof header !== 'object') {
		skipped.push(rel);
		continue;
	}
	const dirCategory = rel.includes('/') ? rel.split('/')[0] : 'misc';
	const category = header.category || dirCategory;
	const name = header.name || rel.replace(/^.*\//, '').replace(/\.yaml$/, '');
	const tags = list(header.tags);
	const genres = [...new Set([...tags.filter((t) => GENRE_TAGS.includes(t)), ...list(header.genre)])];

	const entity = doc.entity && typeof doc.entity === 'object' ? doc.entity : {};
	const sensors = [...keys(entity.sensors)];
	const affordances = [];
	const latent = [];
	for (const mod of Object.values(entity.modulators ?? {})) {
		if (!mod || typeof mod !== 'object') continue;
		affordances.push(...keys(mod.affordances));
		latent.push(...keys(mod.latent_affordances));
		// Modulators may carry their own sub-sensors (e.g. a limb's integrity).
		sensors.push(...keys(mod.sensors));
	}
	const failureModes = list(entity.failure_modes).length
		? (entity.failure_modes ?? []).map((fm) => (fm && typeof fm === 'object' ? String(fm.name ?? '') : String(fm))).filter(Boolean)
		: [];

	components.push({
		ref: `${category}/${name}`,
		name,
		category,
		genres: genres.length ? genres : ['neutral'],
		tags,
		synonyms: list(header.synonyms),
		description: typeof header.description === 'string' ? header.description.trim() : '',
		archetype: header.archetype ? String(header.archetype) : '',
		extends: header.extends ? String(header.extends) : '',
		entity_type: entity.entity_type ? String(entity.entity_type) : '',
		sensors: [...new Set(sensors)],
		affordances: [...new Set(affordances)],
		latent_affordances: [...new Set(latent)],
		failure_modes: [...new Set(failureModes)],
		file: rel,
	});
}

components.sort((a, b) => a.ref.localeCompare(b.ref));

const refs = new Set();
for (const c of components) {
	if (refs.has(c.ref)) throw new Error(`duplicate ref ${c.ref}`);
	refs.add(c.ref);
}

const tally = (getter) => {
	const m = new Map();
	for (const c of components) for (const k of getter(c)) m.set(k, (m.get(k) ?? 0) + 1);
	return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
};

const data = {
	source_label: label,
	registry_path: 'src/maxim/_data/components/**/*.yaml',
	count: components.length,
	categories: tally((c) => [c.category]),
	genres: tally((c) => c.genres),
	skipped_no_header: skipped,
	components,
};

if (!dryRun) {
	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, JSON.stringify(data, null, '\t') + '\n');
}
console.log(
	`${components.length} components from ${source} (${skipped.length} files without a component: header skipped)\n` +
		data.categories.map((c) => `  ${c.name}: ${c.count}`).join('\n') +
		`\n${dryRun ? '(--dry-run: nothing written)' : `→ ${relative(repoRoot, outPath)}`}`,
);
