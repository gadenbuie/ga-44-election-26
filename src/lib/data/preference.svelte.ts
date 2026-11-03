import { COUNTIES, type CountyKey } from './config';

/** Where the chosen county is remembered between visits. */
export const COUNTY_STORAGE_KEY = 'election-monitor:county';

/** Default reader is Cherokee, since that is where District 44's western half is. */
export const DEFAULT_COUNTY: CountyKey = 'cherokee';

function isCountyKey(value: string | null): value is CountyKey {
	return value !== null && Object.hasOwn(COUNTIES, value);
}

/**
 * The selected county, persisted in `localStorage`.
 *
 * The site is prerendered, so there is no `localStorage` during the build. The
 * store therefore starts at the default and adopts the saved value on mount,
 * which keeps the markup deterministic instead of causing a hydration mismatch.
 */
export function createCountyPreference() {
	/** Null until mounted, so the UI does not flash the wrong county choice. */
	let restored = $state(false);
	let county = $state<CountyKey>(DEFAULT_COUNTY);

	function restore() {
		restored = true;
		try {
			const saved = localStorage.getItem(COUNTY_STORAGE_KEY);
			if (isCountyKey(saved)) county = saved;
		} catch {
			// Private mode or blocked storage: fall back to the default silently.
		}
	}

	function select(next: CountyKey) {
		county = next;
		try {
			localStorage.setItem(COUNTY_STORAGE_KEY, next);
		} catch {
			// Not being able to remember the choice should not break the page.
		}
	}

	return {
		get county() {
			return county;
		},
		get restored() {
			return restored;
		},
		restore,
		select
	};
}
