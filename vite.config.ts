import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// A deploy that serves the site from a subpath (GitHub Pages does) can pass it
// in via PAGES_BASE. A local build leaves base empty, so asset URLs stay
// relative and the site runs from any path. Trailing slashes are stripped
// because SvelteKit requires paths.base to start but not end with '/'.
const base = ((process.env.PAGES_BASE ?? '') as string).replace(/\/+$/, '') as '' | `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// The results feed is a plain JSON API on a CORS-enabled origin, so the
			// browser can talk to it directly. No server needed: this builds to
			// static HTML/CSS/JS that can be hosted anywhere.
			adapter: adapter({ pages: 'build', assets: 'build', fallback: undefined }),
			paths: { base }
		})
	]
});
