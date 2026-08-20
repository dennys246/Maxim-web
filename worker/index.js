/**
 * Edge entry point for pymaxim.bio.
 *
 * The site is a static Astro build; this Worker exists for one reason. The
 * legacy `docs.pymaxim.bio` hostname used to serve a full duplicate of the
 * marketing homepage while declaring `https://pymaxim.bio/` as its canonical
 * URL — a duplicate-content surface pointing at a canonical it does not itself
 * serve. Every request to that alias is now redirected, path-preserving, to the
 * canonical host.
 *
 * Requests on any other hostname fall through to the static assets untouched.
 */

const CANONICAL_HOST = 'pymaxim.bio';
const DOCS_ALIAS_HOSTS = new Set(['docs.pymaxim.bio', 'www.docs.pymaxim.bio']);

/** The alias was a docs hostname, so its bare root belongs at the docs entry point. */
const ALIAS_ROOT_TARGET = '/getting-started/';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (DOCS_ALIAS_HOSTS.has(url.hostname.toLowerCase())) {
			const target = new URL(url.toString());
			target.protocol = 'https:';
			target.hostname = CANONICAL_HOST;
			target.port = '';

			// Only the bare root is rewritten. Every other path is preserved
			// exactly, query string included, so deep links into the old docs
			// host keep resolving to their counterpart.
			if (target.pathname === '' || target.pathname === '/') {
				target.pathname = ALIAS_ROOT_TARGET;
			}

			// 308 rather than 301: it is permanent for caching purposes but
			// explicitly forbids rewriting the method, which 301 does not.
			// Cached for an hour so the mapping stays changeable.
			return new Response(null, {
				status: 308,
				headers: {
					Location: target.toString(),
					'Cache-Control': 'public, max-age=3600',
				},
			});
		}

		return env.ASSETS.fetch(request);
	},
};
