// The experiments manifest (src/data/experiments.json) and everything derived
// from it. Plain JS so astro.config.mjs, the build check and the pages share it.
//
// The manifest is hand-curated from the pymaxim lab notebook
// (docs/experiments/); `scripts/sync-experiments.mjs` lists notebook entries it
// is missing. Hand-authored fields are validated here; `repo_href`,
// `superseded_by`, `followed_by` and `retired` are computed, never stored.
import data from '../data/experiments.json' with { type: 'json' };

export const REPO_BASE = 'https://github.com/dennys246/Maxim/blob/main/docs/experiments/';
export const NOTEBOOK_URL = 'https://github.com/dennys246/Maxim/tree/main/docs/experiments';

/** Verdict vocabulary (pymaxim's 2026-09-13 status audit) → display label. */
export const STATUS = {
	earned: 'earned',
	partial: 'partial',
	null: 'null',
	poc: 'proof of concept',
	infra: 'infrastructure',
	diagnostic: 'diagnostic',
	reference: 'reference',
	exploratory: 'exploratory',
	prereg: 'pre-registered',
	stale: 'never run',
	superseded: 'superseded',
	withdrawn: 'withdrawn',
};

/** Statuses that mean "don't read this as a current finding". */
export const RETIRED = new Set(['superseded', 'withdrawn', 'stale']);

/** Statuses that are not results, so they never drive the "New" marker. */
const NOT_NEWS = new Set(['reference', 'infra', 'diagnostic', 'stale']);

export const SUMMARY_MAX = 200;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Newest first; undated entries last; ties broken by slug for a stable order. */
const byDateDesc = (a, b) =>
	(b.date ?? '').localeCompare(a.date ?? '') || a.slug.localeCompare(b.slug);

function derive(raw) {
	const experiments = raw.experiments.map((e) => ({
		...e,
		supersedes: e.supersedes ?? [],
		follows: e.follows ?? [],
		repo_href: REPO_BASE + e.file,
		label: STATUS[e.status] ?? e.status,
		retired: RETIRED.has(e.status),
		short: e.summary ?? e.finding ?? '',
		superseded_by: [],
		followed_by: [],
	}));
	const bySlug = new Map(experiments.map((e) => [e.slug, e]));
	for (const e of experiments) {
		for (const s of e.supersedes) bySlug.get(s)?.superseded_by.push(e.slug);
		for (const s of e.follows) bySlug.get(s)?.followed_by.push(e.slug);
	}
	experiments.sort(byDateDesc);
	const lines = raw.lines.map((l) => ({
		...l,
		experiments: experiments.filter((e) => e.line === l.slug),
	}));
	return { experiments, lines, bySlug };
}

/**
 * Structural checks on the hand-authored manifest. Returns a list of problems;
 * empty means valid. Anything that needs the built site (walkthrough anchors,
 * links into experiment pages) is checked after the build instead.
 */
export function validate(raw = data) {
	const errs = [];
	const err = (where, msg) => errs.push(`${where}: ${msg}`);
	const lineSlugs = new Set();
	for (const l of raw.lines ?? []) {
		if (!SLUG_RE.test(l.slug ?? '')) err(`line ${l.slug}`, 'slug must be kebab-case');
		if (lineSlugs.has(l.slug)) err(`line ${l.slug}`, 'duplicate line slug');
		lineSlugs.add(l.slug);
		for (const k of ['title', 'intro']) if (!l[k]) err(`line ${l.slug}`, `missing ${k}`);
	}
	const slugs = new Set();
	const files = new Set();
	const today = new Date().toISOString().slice(0, 10);
	for (const e of raw.experiments ?? []) {
		const w = `experiment ${e.slug ?? e.file ?? '?'}`;
		for (const k of ['slug', 'id', 'file', 'title', 'status', 'line']) if (!e[k]) err(w, `missing ${k}`);
		if (e.slug && !SLUG_RE.test(e.slug)) err(w, 'slug must be kebab-case');
		if (slugs.has(e.slug)) err(w, 'duplicate slug');
		slugs.add(e.slug);
		if (files.has(e.file)) err(w, `duplicate file ${e.file}`);
		files.add(e.file);
		if (e.file && !e.file.endsWith('.md')) err(w, 'file must be a notebook .md filename');
		if (e.status && !(e.status in STATUS)) err(w, `unknown status "${e.status}"`);
		if (e.line && !lineSlugs.has(e.line)) err(w, `unknown line "${e.line}"`);
		if (e.date != null && !DATE_RE.test(e.date)) err(w, `date "${e.date}" is not YYYY-MM-DD`);
		if (e.date && e.date > today) err(w, `date ${e.date} is in the future`);
		const finding = e.finding ?? '';
		if (e.summary != null) {
			if (e.summary.length > SUMMARY_MAX) err(w, `summary is ${e.summary.length} chars (max ${SUMMARY_MAX})`);
			if (/\n/.test(e.summary)) err(w, 'summary must be one line');
		} else if (finding.length > SUMMARY_MAX) {
			err(w, `finding is ${finding.length} chars — add a summary of at most ${SUMMARY_MAX}`);
		}
		if (e.headline && RETIRED.has(e.status)) err(w, `a ${e.status} entry cannot be a headline`);
		if (e.walkthrough != null && !/^\/[^\s]*\/(#\S+)?$/.test(e.walkthrough)) {
			err(w, `walkthrough "${e.walkthrough}" must be a site path ending in "/" (optionally #anchor)`);
		}
	}
	const all = new Map((raw.experiments ?? []).map((e) => [e.slug, e]));
	for (const e of raw.experiments ?? []) {
		const w = `experiment ${e.slug}`;
		for (const rel of ['supersedes', 'follows']) {
			for (const s of e[rel] ?? []) {
				if (!all.has(s)) err(w, `${rel} unknown slug "${s}"`);
				if (s === e.slug) err(w, `${rel} itself`);
			}
		}
		if (e.status === 'superseded') {
			const by = [...all.values()].some((o) => (o.supersedes ?? []).includes(e.slug));
			if (!by) err(w, 'status is superseded but no entry supersedes it');
		}
	}
	for (const l of raw.lines ?? []) {
		if (l.best == null) continue;
		const b = all.get(l.best);
		if (!b) err(`line ${l.slug}`, `best "${l.best}" is not an experiment`);
		else if (b.line !== l.slug) err(`line ${l.slug}`, `best "${l.best}" belongs to line "${b.line}"`);
		else if (RETIRED.has(b.status) || b.status === 'prereg') err(`line ${l.slug}`, `best "${l.best}" is ${b.status}`);
	}
	return errs;
}

export const manifest = derive(data);

/** Newest dated entry that is a result (not an audit, bench or tooling note). */
export const newestResult = manifest.experiments.find((e) => e.date && !NOT_NEWS.has(e.status));
