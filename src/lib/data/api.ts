import { readCountyCache, readStateCache, writeCountyCache, writeStateCache } from './cache';
import {
	COUNTIES,
	COUNTY_JURISDICTION,
	STATE_JURISDICTION,
	type CountyKey,
	type Jurisdiction
} from './config';
import type { BallotItem, BallotItemDetail, PagedResponse, PrecinctTurnout } from './types';
import { ballotItemUrl, ballotItemsUrl, turnoutUrl, urlVariants } from './config';

/**
 * Transport notes.
 *
 * The results API is behind a CDN that stores `Access-Control-Allow-Origin` as
 * part of the cached object. Some fraction of origin responses arrive without
 * that header, and the CDN then serves the header-less copy to everyone for the
 * life of the entry (`cache-control: max-age=60`). Because the header is part
 * of the object rather than of the negotiation, `Vary` cannot save us: the same
 * path is either reliably CORS-enabled or reliably not, for stretches of
 * minutes at a time, and then flips. That is the "it worked once" behaviour.
 *
 * Two consequences shape the code below:
 *
 * - Query strings do not help. `?cachebust=123` and `?v=<minute>` were measured
 *   to land on the same poisoned object, because the CDN's key ignores them.
 * - Path spelling does help. `/ballot-items` and `/ballot-items/` are separate
 *   cache objects with independent luck, so when one is poisoned the other is
 *   usually healthy. Measured over interleaved rounds, the un-slashed statewide
 *   feed served CORS roughly 30% of the time while the slashed spelling served
 *   it 100% of the time.
 *
 * So each request carries both spellings, and a failure moves to the other one
 * rather than repeating an identical request. Whichever spelling last worked is
 * tried first next time, so a healthy path stays fast.
 */
const REQUEST_TIMEOUT_MS = 25_000;
const RETRY_DELAYS_MS = [300, 800, 1_600, 3_000];

/**
 * Last spelling known to have answered, keyed by the path without its slash.
 * Module state, so every snapshot and detail read benefits from one success.
 */
const healthySpelling = new Map<string, string>();

/**
 * Order the spellings for one request: the one that worked last time first,
 * then the rest. Pure of side effects so the retry loop can rotate freely.
 */
function spellingsFor(url: string): string[] {
	const variants = urlVariants(url);
	const key = url.replace(/\/$/, '');
	const known = healthySpelling.get(key);
	if (!known) return variants;
	return [known, ...variants.filter((variant) => variant !== known)];
}

function rememberSpelling(url: string): void {
	healthySpelling.set(url.replace(/\/$/, ''), url);
}

/** A CORS rejection gives no status; a 5xx is worth retrying; a 4xx is final. */
function isRetryable(error: unknown): boolean {
	if (error instanceof HttpError) {
		return error.status >= 500 || error.status === 429;
	}
	// TypeError from fetch means the request never reached a usable edge.
	return error instanceof TypeError;
}

class HttpError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'HttpError';
	}
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				reject(new DOMException('Aborted', 'AbortError'));
			},
			{ once: true }
		);
	});
}

/** A single attempt, with an internal timeout that composes with the outer signal. */
async function attempt<T>(url: string, signal?: AbortSignal): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	const onAbort = () => controller.abort();
	signal?.addEventListener('abort', onAbort, { once: true });

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: { Accept: 'application/json' },
			// Respect the feed's own `max-age=60`, while still revalidating.
			cache: 'no-cache'
		});
		if (!response.ok) {
			throw new HttpError(`${response.status} ${response.statusText}`, response.status);
		}
		// A cross-origin response that reached us but lost its CORS header would
		// already have thrown. Reaching here means the edge was healthy.
		rememberSpelling(url);
		return (await response.json()) as T;
	} finally {
		clearTimeout(timeout);
		signal?.removeEventListener('abort', onAbort);
	}
}

/**
 * GET with retries. Each retry switches to the other path spelling, so the loop
 * samples both cache objects instead of asking a poisoned one five times. 4xx
 * responses are permanent and are not retried.
 */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
	const spellings = spellingsFor(url);
	let lastError: unknown;

	for (let index = 0; index <= RETRY_DELAYS_MS.length; index += 1) {
		if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

		// Alternate spellings; modulo keeps the shorter list usable.
		const target = spellings[index % spellings.length];

		try {
			return await attempt<T>(target, signal);
		} catch (error) {
			lastError = error;

			// The caller cancelled: stop immediately.
			if (error instanceof DOMException && error.name === 'AbortError' && signal?.aborted) {
				throw error;
			}
			// A real HTTP rejection (bad id, gone) will not fix itself.
			if (!isRetryable(error)) {
				throw error;
			}

			const wait = RETRY_DELAYS_MS[index];
			if (wait == null) break;
			// Spread retries out so two callers do not collide on the same edge.
			await delay(wait + Math.random() * 250, signal);
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export async function fetchBallotItems(
	jurisdiction: Jurisdiction,
	signal?: AbortSignal
): Promise<BallotItem[]> {
	const payload = await getJson<PagedResponse<BallotItem>>(ballotItemsUrl(jurisdiction), signal);
	return payload.data ?? [];
}

export async function fetchBallotItemDetail(
	jurisdiction: Jurisdiction,
	ballotItemId: string,
	signal?: AbortSignal
): Promise<BallotItemDetail> {
	return getJson<BallotItemDetail>(ballotItemUrl(jurisdiction, ballotItemId), signal);
}

export async function fetchTurnout(
	jurisdiction: Jurisdiction,
	signal?: AbortSignal
): Promise<PrecinctTurnout[]> {
	const payload = await getJson<PagedResponse<PrecinctTurnout> | PrecinctTurnout[]>(
		turnoutUrl(jurisdiction),
		signal
	);
	return Array.isArray(payload) ? payload : (payload.data ?? []);
}

/** One county's feed. */
export interface CountyFeed {
	key: CountyKey;
	slug: string;
	name: string;
	contests: BallotItem[];
	turnout: PrecinctTurnout[];
}

/**
 * The payloads the first paint depends on. Cherokee is always present because
 * it carries most of this ballot; Cobb is loaded because District 44 straddles
 * both counties. Combined they are ~200 kB raw and well under 10 kB compressed.
 *
 * The `/elections/{jurisdiction}/{slug}` summary endpoint is still unused: a
 * summary call would only duplicate `reportingStatus` that every contest
 * already carries, so `latestAsOf()` derives it for free.
 */
export interface CountySnapshot {
	counties: Partial<Record<CountyKey, CountyFeed>>;
	fetchedAt: number;
	/** Most recent `asOf` reported by any contest in any loaded feed. */
	asOf: string | null;
	/** Precinct turnout across every loaded county. */
	turnout: PrecinctTurnout[];
}

async function fetchCountyFeed(key: CountyKey, signal?: AbortSignal): Promise<CountyFeed> {
	const county = COUNTIES[key];
	const [contests, turnout] = await Promise.all([
		fetchBallotItems(county.slug, signal),
		// Turnout is a nice-to-have; a failure must not blank the page.
		fetchTurnout(county.slug, signal).catch(() => [] as PrecinctTurnout[])
	]);
	return { key, slug: county.slug, name: county.name, contests, turnout };
}

/**
 * Load every county this app needs. The first county is required; if a
 * secondary county fails, the app renders with the counties it has rather than
 * nothing at all, because a partial-but-labelled total beats a blank page.
 */
export async function fetchCountySnapshot(
	keys: CountyKey[],
	signal?: AbortSignal
): Promise<CountySnapshot> {
	const [required, ...optional] = keys;

	const settled = await Promise.all([
		fetchCountyFeed(required, signal),
		...optional.map(async (key) => {
			try {
				return await fetchCountyFeed(key, signal);
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') throw error;
				console.warn(`County feed "${key}" unavailable, continuing without it:`, error);
				return null;
			}
		})
	]);

	const feeds = settled.filter((feed): feed is CountyFeed => feed !== null);

	// Remember each successful feed so the next load can paint immediately.
	for (const feed of feeds) {
		writeCountyCache(feed.key, { contests: feed.contests, turnout: feed.turnout });
	}
	const counties: Partial<Record<CountyKey, CountyFeed>> = {};
	const turnout: PrecinctTurnout[] = [];
	const contests: BallotItem[] = [];

	for (const feed of feeds) {
		counties[feed.key] = feed;
		contests.push(...feed.contests);
		// Tag turnout rows so two counties' precinct names cannot collide.
		for (const precinct of feed.turnout) {
			turnout.push({ ...precinct, county: feed.name });
		}
	}

	return { counties, fetchedAt: Date.now(), asOf: latestAsOf(contests), turnout };
}

/** Newest reporting timestamp across contests, used for the freshness label. */
export function latestAsOf(contests: BallotItem[]): string | null {
	let newest: number | null = null;
	let newestRaw: string | null = null;
	for (const contest of contests) {
		const raw = contest.reportingStatus?.asOf;
		if (!raw) continue;
		const parsed = Date.parse(raw);
		if (Number.isNaN(parsed)) continue;
		if (newest === null || parsed > newest) {
			newest = parsed;
			newestRaw = raw;
		}
	}
	return newestRaw;
}

/**
 * The ~616 kB statewide feed, kept separate so it can load on demand for the
 * Statewide tab instead of delaying first paint on a phone.
 */
export interface StateSnapshot {
	contests: BallotItem[];
	fetchedAt: number;
}

export async function fetchStateSnapshot(signal?: AbortSignal): Promise<StateSnapshot> {
	const contests = await fetchBallotItems(STATE_JURISDICTION, signal);
	writeStateCache({ contests });
	return { contests, fetchedAt: Date.now() };
}

/** A cached county feed, shaped like a live one, with its original timestamp. */
export interface CachedCountySnapshot {
	counties: Partial<Record<CountyKey, CountyFeed>>;
	fetchedAt: number;
	asOf: string | null;
	turnout: PrecinctTurnout[];
	/** True when this came from localStorage rather than the network. */
	fromCache: true;
}

/**
 * Rebuild a snapshot from cached feeds, so the page can paint last known
 * numbers before the first network response arrives. Returns null when nothing
 * usable is cached.
 */
export function readCachedCountySnapshot(keys: CountyKey[]): CachedCountySnapshot | null {
	const counties: Partial<Record<CountyKey, CountyFeed>> = {};
	const turnout: PrecinctTurnout[] = [];
	const contests: BallotItem[] = [];
	let oldest = Number.POSITIVE_INFINITY;

	for (const key of keys) {
		const cached = readCountyCache(key);
		if (!cached) continue;
		const config = COUNTIES[key];
		const feed: CountyFeed = {
			key,
			slug: config.slug,
			name: config.name,
			contests: cached.data.contests,
			turnout: cached.data.turnout
		};
		counties[key] = feed;
		contests.push(...feed.contests);
		for (const precinct of feed.turnout) turnout.push({ ...precinct, county: feed.name });
		oldest = Math.min(oldest, cached.fetchedAt);
	}

	if (!Object.keys(counties).length) return null;

	// The oldest county's timestamp, so the age label never overstates freshness.
	return {
		counties,
		fetchedAt: Number.isFinite(oldest) ? oldest : Date.now(),
		asOf: latestAsOf(contests),
		turnout,
		fromCache: true
	};
}

/** The cached statewide feed, if one exists. */
export function readCachedStateSnapshot(): StateSnapshot | null {
	const cached = readStateCache();
	if (!cached) return null;
	return { contests: cached.data.contests, fetchedAt: cached.fetchedAt };
}
