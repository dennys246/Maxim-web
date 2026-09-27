#!/usr/bin/env node
// List pymaxim notebook entries that src/data/experiments.json is missing, and
// manifest entries whose notebook file no longer exists.
//
// A helper, not a generator. The notebook files have no frontmatter and state
// their status in at least four header styles, so a manifest parsed from them
// would be wrong in ways nobody would notice. The manifest stays hand-curated —
// its summaries, lines and headline flags are presentation, which belongs to
// this site — and this script only tells you what to add. For each missing
// file it prints a draft entry (title from the file's `#` line, date and status
// text from the notebook README's index row when there is one) to edit and
// paste in. It never writes the manifest.
//
// Usage:
//   node scripts/sync-experiments.mjs [--source <dir>] [--check]
//
//   --source  the notebook directory. Defaults to the engine checkout beside
//             this repo (../Maxim/docs/experiments). Point it at a checkout of
//             pymaxim's main, not a feature branch.
//   --check   exit 1 if anything is missing or dangling (for CI or a pre-push).
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => {
	const i = args.indexOf(name);
	return i === -1 ? undefined : args[i + 1];
};
const source = resolve(opt('--source') ?? join(here, '../../Maxim/docs/experiments'));
const check = args.includes('--check');

// Notebook files that are deliberately not experiments.
const UNINDEXED = new Set([
	'README.md', // the notebook itself
	'DESIGN_REVIEW.md', // method document
	'exp59_layered_cave_prereg.md', // idea capture, explicitly "NOT a pre-registration"
]);

if (!existsSync(source)) {
	console.error(`No notebook at ${source}. Pass --source <pymaxim>/docs/experiments.`);
	process.exit(2);
}

const manifest = JSON.parse(await readFile(join(here, '../src/data/experiments.json'), 'utf8'));
const indexed = new Set(manifest.experiments.map((e) => e.file));
const onDisk = (await readdir(source)).filter((f) => f.endsWith('.md'));
const readme = existsSync(join(source, 'README.md')) ? await readFile(join(source, 'README.md'), 'utf8') : '';

// README index rows look like: | [file.md](file.md) | date | status | decision |
function readmeRow(file) {
	const row = readme.split('\n').find((l) => l.startsWith(`| [${file}]`));
	if (!row) return {};
	const cells = row.split('|').map((c) => c.trim());
	return { date: cells[2], status: cells[3] };
}

const missing = onDisk.filter((f) => !indexed.has(f) && !UNINDEXED.has(f)).sort();
const dangling = [...indexed].filter((f) => !onDisk.includes(f)).sort();

for (const file of missing) {
	const text = await readFile(join(source, file), 'utf8');
	const title = (text.match(/^#\s+(.+)$/m)?.[1] ?? file).trim();
	const row = readmeRow(file);
	const draft = {
		slug: 'TODO',
		id: 'TODO',
		file,
		title,
		date: /^\d{4}-\d{2}-\d{2}/.test(row.date ?? '') ? row.date.slice(0, 10) : null,
		status: 'TODO — one of the STATUS keys in src/lib/experiments.mjs',
		line: 'TODO',
		headline: false,
		finding: row.status ? `TODO (README status: ${row.status})` : 'TODO',
	};
	console.log(`missing: ${file}\n${JSON.stringify(draft, null, 2)}\n`);
}
for (const file of dangling) console.log(`dangling: ${file} is in the manifest but not in ${source}`);

console.log(
	`${onDisk.length} notebook files · ${indexed.size} indexed · ${missing.length} missing · ` +
		`${dangling.length} dangling · ${UNINDEXED.size} deliberately unindexed`,
);
if (check && (missing.length || dangling.length)) process.exit(1);
