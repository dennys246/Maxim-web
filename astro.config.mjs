// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import experimentsData from './src/data/experiments.json' with { type: 'json' };

// The newest experiment drives the sidebar note + the per-visitor "New" marker.
const newestExperiment = [...experimentsData.experiments]
	.filter((e) => e.date)
	.sort((a, b) => b.date.localeCompare(a.date))[0];

// https://astro.build/config
export default defineConfig({
	site: 'https://pymaxim.bio',
	integrations: [
		starlight({
			title: 'Maxim',
			description:
				'A bio-inspired cognitive architecture for AI agents — embodied sensation, homeostatic drives, and brain-modeled memory that learns across sessions without fine-tuning.',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/dennys246/Maxim' },
			],
			customCss: ['./src/styles/experiments.css'],
			head: [
				{
					tag: 'script',
					content: `(function(){try{var seen=localStorage.getItem('maxim:experimentsSeen');if(seen&&seen>=${JSON.stringify(newestExperiment.date)}){document.documentElement.setAttribute('data-exp-seen','');}}catch(e){}})();`,
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
							label: 'Guides',
							items: [
								{ label: 'Simulation', slug: 'guides/simulation' },
								{ label: 'Networking & mesh', slug: 'guides/networking' },
							],
						},
					],
				},
				{
					label: 'Core concepts',
					items: [
						{ label: 'Architecture', slug: 'concepts/architecture' },
						{ label: 'How the systems connect', slug: 'systems/overview' },
						{ label: 'Memory & consolidation', slug: 'memory/overview' },
						{ label: 'Operating modes', slug: 'concepts/operating-modes' },
						{ label: 'Communication & safety', slug: 'concepts/communication' },
					],
				},
				{
					label: 'Systems',
					items: [
						{ label: 'Hippocampus — episodic', slug: 'systems/hippocampus' },
						{ label: 'Entorhinal cortex — indexing', slug: 'systems/entorhinal-cortex' },
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
						{
							label: 'All original guides',
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
	],
});
