/**
 * Endpoint configuration for the Georgia results feed.
 *
 * The public site at app.enhancedvoting.com is an Angular app backed by a small
 * JSON API under `/results/public/api`. The bulk `export-*.json` blob in
 * `/cdn/results/` is ~46 MB and has no CORS headers, so it is unusable from a
 * browser. The API is the right tool: it returns a whole collection in one
 * payload, is CORS-enabled (`access-control-allow-origin: *`), and compresses
 * to a few kilobytes.
 *
 * One thing to know before changing a URL here: the CDN in front of this API
 * caches `Access-Control-Allow-Origin` *with* the response, and some fetches
 * from the origin come back without it. A path therefore spends minutes at a
 * time either always-CORS-enabled or never, and its cache key ignores query
 * strings, so `?cachebust=` does nothing. Two path spellings of the same
 * resource are two separate cache objects, so a path that is poisoned right now
 * usually has a healthy twin. Every builder below emits a trailing slash and
 * `urlVariants()` pairs it with the un-slashed form; the fetch layer alternates
 * between the two instead of re-hitting the same bad object.
 */

const ORIGIN = 'https://app.enhancedvoting.com';
const API = `${ORIGIN}/results/public/api`;

/** Election slug shared by the state feed and the county feed. */
export const ELECTION_SLUG = '11032026GeneralAndSpecialElection';

/** Statewide feed: contains every statewide and legislative contest. */
export const STATE_JURISDICTION = 'Georgia';

/**
 * Counties that appear in this app. Every Georgia county publishes at
 * `<name>-county-ga` on this platform, so adding a county is one line here plus
 * a ballot definition in `ballot-counties.ts`.
 *
 * District 44 spans two of them, which is why Cherokee alone is not enough.
 */
export interface CountyConfig {
	/** Jurisdiction slug used in every API path. */
	slug: string;
	/** Display name, used in labels and headings. */
	name: string;
	/** Precinct label sample used by the sanity check in the data tab. */
	expectedPrecincts: number;
}

export const COUNTIES = {
	cherokee: { slug: 'cherokee-county-ga', name: 'Cherokee', expectedPrecincts: 42 },
	cobb: { slug: 'cobb-county-ga', name: 'Cobb', expectedPrecincts: 148 }
} as const satisfies Record<string, CountyConfig>;

export type CountyKey = keyof typeof COUNTIES;

/** The county this reader is centered on. */
export const COUNTY_JURISDICTION = COUNTIES.cherokee.slug;

export const PUBLIC_RESULTS_URL = `${ORIGIN}/results/public/${COUNTY_JURISDICTION}/elections/${ELECTION_SLUG}`;

/** A county slug, or the statewide feed. */
export type Jurisdiction = string;

export function electionSummaryUrl(jurisdiction: Jurisdiction): string {
	return `${API}/elections/${jurisdiction}/${ELECTION_SLUG}/`;
}

export function ballotItemsUrl(jurisdiction: Jurisdiction): string {
	return `${API}/elections/${jurisdiction}/${ELECTION_SLUG}/ballot-items/`;
}

export function ballotItemUrl(jurisdiction: Jurisdiction, ballotItemId: string): string {
	return `${API}/elections/${jurisdiction}/${ELECTION_SLUG}/ballot-items/${ballotItemId}/`;
}

/** County precinct turnout and registration, useful for turnout context. */
export function turnoutUrl(jurisdiction: Jurisdiction): string {
	return `${API}/elections/${jurisdiction}/${ELECTION_SLUG}/turnout/`;
}

/**
 * Every path spelling that serves the same resource, preferred first.
 *
 * The two spellings are distinct CDN cache entries, so they fail and recover
 * independently. Handing both to the fetch layer is what turns an
 * all-or-nothing bad cache object into a coin flip that is retried across.
 */
export function urlVariants(url: string): string[] {
	return url.endsWith('/') ? [url, url.slice(0, -1)] : [url, `${url}/`];
}
