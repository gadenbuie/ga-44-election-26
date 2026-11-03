import type { BallotItem, PrecinctTurnout } from './types';

/**
 * A small read-through cache in `localStorage`.
 *
 * Two things make this worth doing on election night: the CDN intermittently
 * drops CORS headers, and a phone on a weak connection may fail mid-poll. With
 * a cached copy the page paints last known numbers instantly, then refreshes on
 * top of them — instead of showing a spinner or an error where the results
 * were a few seconds ago.
 *
 * Cached data is never presented as current: `fetchedAt` travels with it, and
 * the UI shows how old it is.
 */

const PREFIX = 'election-monitor:cache:';

/** Bump when the payload shape changes, so old entries are ignored. */
const SCHEMA_VERSION = 1;

/** Give up caching rather than risk a storage quota error mid-election. */
const MAX_ENTRY_BYTES = 1_500_000;

interface CacheEnvelope<T> {
	version: number;
	fetchedAt: number;
	data: T;
}

/** What we store for one county feed. */
export interface CachedCountyFeed {
	contests: BallotItem[];
	turnout: PrecinctTurnout[];
}

/** What we store for the statewide feed. */
export interface CachedStateFeed {
	contests: BallotItem[];
}

function keyFor(name: string): string {
	return `${PREFIX}${name}`;
}

function read<T>(name: string): { data: T; fetchedAt: number } | null {
	try {
		const raw = localStorage.getItem(keyFor(name));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CacheEnvelope<T>;
		if (parsed?.version !== SCHEMA_VERSION || !parsed.data) return null;
		return { data: parsed.data, fetchedAt: parsed.fetchedAt ?? 0 };
	} catch {
		// Corrupt entry, blocked storage, or private mode: treat as a miss.
		return null;
	}
}

function write<T>(name: string, data: T): void {
	try {
		const envelope: CacheEnvelope<T> = {
			version: SCHEMA_VERSION,
			fetchedAt: Date.now(),
			data
		};
		const serialized = JSON.stringify(envelope);
		if (serialized.length > MAX_ENTRY_BYTES) return;
		localStorage.setItem(keyFor(name), serialized);
	} catch {
		// Quota exceeded or storage unavailable. Results still work; they just
		// will not survive the reload.
	}
}

/** Cached county feed, if one was stored. */
export function readCountyCache(county: string): { data: CachedCountyFeed; fetchedAt: number } | null {
	return read<CachedCountyFeed>(`county:${county}`);
}

export function writeCountyCache(county: string, feed: CachedCountyFeed): void {
	write(`county:${county}`, feed);
}

/** Cached statewide feed, if one was stored. */
export function readStateCache(): { data: CachedStateFeed; fetchedAt: number } | null {
	return read<CachedStateFeed>('state');
}

export function writeStateCache(feed: CachedStateFeed): void {
	write('state', feed);
}

/** Drop every cached feed, e.g. if a schema change left stale entries. */
export function clearFeedCache(): void {
	try {
		for (const key of Object.keys(localStorage)) {
			if (key.startsWith(PREFIX)) localStorage.removeItem(key);
		}
	} catch {
		// Nothing to do if storage is unavailable.
	}
}
