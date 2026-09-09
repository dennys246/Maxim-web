// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import experimentsData from './src/data/experiments.json' with { type: 'json' };

/**
 * Wrap every Markdown table in a horizontally scrollable, focusable container.
 *
 * Reference tables here are wide enough to overflow a phone viewport. Without a
 * wrapper the page itself scrolls sideways; with an unfocusable wrapper the
 * overflow is unreachable by keyboard (axe `scrollable-region-focusable`, and
 * WCAG 2.1.1). `tabindex="0"` makes the scroll container a tab stop so arrow
 * keys can pan it. Deliberately no `role="region"` — that would add an unnamed
 * landmark per table and trip `landmark-unique` instead.
 *
 * Build-time rather than client-side so keyboard access does not depend on JS.
 */
function rehypeScrollableTables() {
	const walk = (node) => {
		if (!node || !Array.isArray(node.children)) return;
		node.children = node.children.map((child) => {
			walk(child);
			if (child.type === 'element' && child.tagName === 'table') {
				return {
					type: 'element',
					tagName: 'div',
					properties: { className: ['table-wrap'], tabIndex: 0 },
					children: [child],
				};
			}
			return child;
		});
	};
	return (tree) => walk(tree);
}

// The newest experiment drives the sidebar note + the per-visitor "New" marker.
const newestExperiment = [...experimentsData.experiments]
	.filter((e) => e.date)
	.sort((a, b) => b.date.localeCompare(a.date))[0];

// https://astro.build/config
export default defineConfig({
	site: 'https://pymaxim.bio',
	markdown: {
		rehypePlugins: [rehypeScrollableTables],
	},
	integrations: [
		starlight({
			title: 'Maxim',
			description:
				'A bio-inspired LLM harness that carries experience-grounded memory, causal links, drives, and valence across sessions — without fine-tuning model weights.',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/dennys246/Maxim' },
			],
			customCss: ['./src/styles/experiments.css', './src/styles/components.css'],
			head: [
				// Default social-share image for all docs pages (Starlight emits the rest of
				// the OG/Twitter tags but no image). Absolute URLs required by scrapers.
				{ tag: 'meta', attrs: { property: 'og:image', content: 'https://pymaxim.bio/og.png' } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{
					tag: 'meta',
					attrs: {
						property: 'og:image:alt',
						content: 'Maxim — bio-inspired cognitive architecture for AI agents',
					},
				},
				{ tag: 'meta', attrs: { name: 'twitter:image', content: 'https://pymaxim.bio/og.png' } },
				{
					tag: 'script',
					content: `(function(){try{var seen=localStorage.getItem('maxim:experimentsSeen');if(seen&&seen>=${JSON.stringify(newestExperiment.date)}){document.documentElement.setAttribute('data-exp-seen','');}}catch(e){}})();`,
				},
				{
					// Starlight makes overflowing code blocks keyboard-scrollable at
					// runtime by setting role="region" + tabindex on <pre>. That is the
					// right call for keyboard access, but several unnamed regions on one
					// page are indistinguishable to a screen-reader user browsing
					// landmarks (axe `landmark-unique`). Name each one after its language
					// and position. Done at runtime because the role is added at runtime;
					// labelling the <pre> at build time would put aria-label on an element
					// with no role, which is its own violation.
					tag: 'script',
					content: `(function(){function label(){var all=document.getElementsByTagName('pre');for(var i=0;i<all.length;i++){var e=all[i];if(e.getAttribute('role')!=='region')continue;if(e.getAttribute('aria-label'))continue;var l=e.getAttribute('data-language')||'code';e.setAttribute('aria-label',l+' code block '+(i+1));}}function start(){label();try{new MutationObserver(label).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['role']});}catch(e){}}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',start);}else{start();}})();`,
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'What is Maxim?', slug: 'getting-started' },
						{ label: 'Installation', slug: 'installation' },
						{ label: 'Configuration', slug: 'configuration' },
						{
							label: 'Core concepts',
							items: [
								{ label: 'Architecture', slug: 'concepts/architecture' },
								{ label: 'Prompt system', slug: 'concepts/prompt-system' },
								{ label: 'How the systems connect', slug: 'systems/overview' },
								{ label: 'Memory & consolidation', slug: 'memory/overview' },
								{ label: 'Operating modes', slug: 'concepts/operating-modes' },
								{ label: 'Communication & safety', slug: 'concepts/communication' },
							],
						},
					],
				},
				{
					label: 'Guides',
					items: [
						{
							label: 'Simulation',
							items: [
								{ label: 'Overview', slug: 'guides/simulation' },
								{ label: 'Interactive sessions', slug: 'guides/simulation/interactive' },
								{ label: 'Generative campaigns', slug: 'guides/simulation/generative' },
								{ label: 'The simulation agent', slug: 'guides/simulation/orchestrator' },
								{ label: 'YAML scenarios', slug: 'guides/simulation/scenarios' },
								{ label: 'Fixtures, curricula & Roy', slug: 'guides/simulation/curricula' },
								{ label: 'What a run produces', slug: 'guides/simulation/outputs' },
								{ label: 'Safety & sandboxing', slug: 'guides/simulation/sandboxing' },
								{ label: 'CLI & environment reference', slug: 'guides/simulation/cli' },
							],
						},
						{ label: 'DM campaigns', slug: 'guides/dm-campaigns' },
						{ label: 'Benchmarks', slug: 'guides/benchmarks' },
						{ label: 'Networking & mesh', slug: 'guides/networking' },
						{ label: 'The Oasis — sharing substrate', slug: 'guides/oasis' },
					],
				},
				{
					label: 'Systems',
					items: [
						{ label: 'Hippocampus — episodic', slug: 'systems/hippocampus' },
						{ label: 'Entorhinal cortex — indexing', slug: 'systems/entorhinal-cortex' },
						{ label: 'Concept decomposition — text to nodes', slug: 'systems/concept-decomposition' },
						{ label: 'Anterior temporal lobe — semantic', slug: 'systems/anterior-temporal-lobe' },
						{ label: 'Nucleus accumbens — reward', slug: 'systems/nucleus-accumbens' },
						{ label: 'Suprachiasmatic nucleus — time', slug: 'systems/suprachiasmatic-nucleus' },
						{ label: 'Angular gyrus — math', slug: 'systems/angular-gyrus' },
						{ label: 'Cerebellum — motor learning', slug: 'systems/cerebellum' },
						{ label: 'Fear circuit — safety', slug: 'systems/fear-circuit' },
					],
				},
				{
					label: 'Embodying Maxim',
					items: [
						{ label: 'Quickstart', slug: 'embodiment/quickstart' },
						{ label: 'Overview', slug: 'embodiment/overview' },
						{ label: 'The SEM protocol', slug: 'embodiment/sem-protocol' },
						{ label: 'Component library', slug: 'embodiment/component-library' },
						{ label: 'Asset Foundry', slug: 'embodiment/asset-foundry' },
						{ label: 'Imagination', slug: 'embodiment/imagination' },
						{ label: 'Reachy Mini (robot)', slug: 'guides/reachy-mini' },
					],
				},
				{
					label: 'Research',
					items: [
						{ label: 'Evidence', slug: 'research/evidence' },
						{ label: 'Measurement limits', slug: 'research/limits', badge: { text: 'New', variant: 'success' } },
						{
							label: 'Experiments',
							items: [
								{
									label: 'All experiments',
									slug: 'research/experiments',
									attrs: { 'data-experiments-link': '' },
									badge: { text: 'New', variant: 'success' },
								},
								{ label: 'The Roy harness', slug: 'research/experiments/roy-harness' },
								{
									label: 'Substrate-primary evidence',
									slug: 'research/experiments/substrate-primary-evidence',
								},
								{ label: 'Cross-session learning', slug: 'research/experiments/cross-session-learning' },
							],
						},
						{
							label: 'Behaviors',
							items: [
								{ label: 'Overview', slug: 'research/behaviors/overview' },
								{ label: 'Vision (shipped)', slug: 'research/behaviors/vision' },
								{ label: 'Audio (planned)', slug: 'research/behaviors/audio' },
							],
						},
						{ label: 'The Cradle', slug: 'research/cradle' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'CLI', slug: 'reference/cli' },
						{ label: 'Tools', slug: 'reference/tools' },
						{ label: 'Components', slug: 'reference/components' },
					],
				},
				{
					label: 'More',
					items: [
						{ label: 'About the developer', slug: 'about' },
						{
							label: 'Design essays (dennyschaedig.com)',
							link: 'https://www.dennyschaedig.com/maxim',
							attrs: { target: '_blank', rel: 'noopener' },
						},
						{
							label: 'Docs in pymaxim repo',
							link: 'https://github.com/dennys246/Maxim/tree/main/docs',
							attrs: { target: '_blank', rel: 'noopener' },
						},
					],
				},
			],
		}),
		react(),
	],
});
