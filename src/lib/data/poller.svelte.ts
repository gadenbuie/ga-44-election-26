import {
	fetchCountySnapshot,
	fetchStateSnapshot,
	readCachedCountySnapshot,
	readCachedStateSnapshot,
	type CountySnapshot,
	type StateSnapshot
} from './api';
import { LOADED_COUNTIES } from './ballot';

export interface FeedState {
	/** Always-loaded county feed: small and sufficient for the main view. */
	county: CountySnapshot | null;
	/**
	 * Statewide feed. It is larger than the county feeds, but statewide races
	 * need it to show Georgia-wide numbers and to offer the county comparison,
	 * so it loads right after the first county paint rather than on demand.
	 */
	state: StateSnapshot | null;
	stateError: string | null;
	isLoadingState: boolean;
	error: string | null;
	/** True only for the very first load, so the UI can show a skeleton. */
	isInitialLoad: boolean;
	/** True while a background refresh is in flight. */
	isRefreshing: boolean;
	/** Consecutive failed polls, used to back off. */
	failures: number;
	/**
	 * True while the shown numbers came from localStorage rather than a
	 * successful network read this visit. The UI labels them as cached.
	 */
	isCached: boolean;
	/** When the cached copy was originally fetched, if showing cached data. */
	cachedAt: number | null;
}

/** A bare `TypeError` from fetch is a CORS or network rejection, not a crash. */
function describeError(error: unknown): string {
	if (error instanceof TypeError) {
		return 'The results server refused this request. Retrying…';
	}
	if (error instanceof DOMException && error.name === 'AbortError') {
		return 'The request timed out. Retrying…';
	}
	return error instanceof Error ? error.message : 'Could not reach the results feed';
}

/** Normal refresh cadence while the tab is visible and the feed is healthy. */
const BASE_INTERVAL_MS = 5 * 60_000;
const MAX_INTERVAL_MS = 15 * 60_000;

/**
 * Returning to a visible tab is the exception to the base cadence: if the
 * data is even this stale when the user comes back, refresh immediately
 * rather than making them wait out the rest of the interval.
 */
const STALE_ON_RETURN_MS = 45_000;

export function createFeedPoller() {
	let state = $state<FeedState>({
		county: null,
		state: null,
		stateError: null,
		isLoadingState: false,
		error: null,
		isInitialLoad: true,
		isRefreshing: false,
		failures: 0,
		isCached: false,
		cachedAt: null
	});

	let timer: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;
	let stateController: AbortController | null = null;
	let stopped = false;
	/**
	 * Whether to keep the statewide feed current. It turns on after the first
	 * county paint, so refreshes update both geographies.
	 */
	let wantsState = false;

	/**
	 * Back off on repeated failures instead of hammering a struggling feed —
	 * except before the first successful load, where waiting minutes to show
	 * anything at all is worse than retrying promptly. The CDN rotates between
	 * edges that do and don't send CORS headers, so a quick retry usually wins.
	 */
	function nextDelay(failures: number): number {
		if (failures === 0) return BASE_INTERVAL_MS;
		if (!state.county) return Math.min(2_000 * failures, 10_000);
		return Math.min(BASE_INTERVAL_MS * 2 ** (failures - 1), MAX_INTERVAL_MS);
	}

	function clearTimer() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	async function loadState() {
		if (stopped) return;
		stateController?.abort();
		stateController = new AbortController();
		state.isLoadingState = true;
		state.stateError = null;
		try {
			state.state = await fetchStateSnapshot(stateController.signal);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') return;
			state.stateError =
				error instanceof Error ? error.message : 'Could not reach the statewide feed';
		} finally {
			if (!stopped) state.isLoadingState = false;
		}
	}

	async function load(): Promise<void> {
		if (stopped) return;
		clearTimer();
		controller?.abort();
		controller = new AbortController();

		if (state.county) {
			state.isRefreshing = true;
		}

		try {
			const snapshot = await fetchCountySnapshot(LOADED_COUNTIES, controller.signal);
			if (stopped) return;
			state.county = snapshot;
			state.error = null;
			state.failures = 0;
			// Fetch the statewide feed once the county view has painted, so a phone
			// is never blocked on it but statewide races still get Georgia-wide
			// numbers and a county comparison.
			wantsState = true;
			void loadState();
		} catch (error) {
			if (stopped) return;
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}
			state.failures += 1;
			state.error = describeError(error);
		} finally {
			if (!stopped) {
				state.isInitialLoad = false;
				state.isRefreshing = false;
				schedule(nextDelay(state.failures));
			}
		}
	}

	function schedule(delay: number) {
		clearTimer();
		if (stopped) return;
		timer = setTimeout(() => {
			// Do not burn the feed's bandwidth in a background tab.
			if (typeof document !== 'undefined' && document.hidden) {
				schedule(BASE_INTERVAL_MS);
				return;
			}
			void load();
		}, delay);
	}

	function onVisibilityChange() {
		if (typeof document === 'undefined') return;
		if (!document.hidden && state.county) {
			const age = Date.now() - state.county.fetchedAt;
			if (age > STALE_ON_RETURN_MS) void load();
		}
	}

	return {
		get state() {
			return state;
		},
		start() {
			stopped = false;
			if (typeof document !== 'undefined') {
				document.addEventListener('visibilitychange', onVisibilityChange);
			}
			void load();
		},
		stop() {
			stopped = true;
			clearTimer();
			controller?.abort();
			stateController?.abort();
			if (typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', onVisibilityChange);
			}
		},
		refresh() {
			void load();
		},
		/** Called the first time the Statewide tab is opened. */
		ensureState() {
			wantsState = true;
			if (!state.state && !state.isLoadingState) void loadState();
		},
		retryState() {
			void loadState();
		}
	};
}
