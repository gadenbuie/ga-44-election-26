import type { Party, Translation } from './types';

const numberFormat = new Intl.NumberFormat('en-US');
const percentFormat = new Intl.NumberFormat('en-US', {
	style: 'percent',
	maximumFractionDigits: 1
});
const percentFormatTight = new Intl.NumberFormat('en-US', {
	style: 'percent',
	maximumFractionDigits: 2
});

/** Pull the English string out of a translation array. */
export function localize(value: Translation[] | null | undefined): string {
	if (!value?.length) return '';
	return (
		value.find((entry) => entry.languageId === 'en')?.text ??
		value[0]?.text ??
		''
	).trim();
}

export function formatNumber(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return '—';
	return numberFormat.format(value);
}

/** Share of votes, as a 0-1 ratio, guarding against an empty race. */
export function voteShare(votes: number, total: number): number {
	if (!total) return 0;
	return votes / total;
}

export function formatPercent(ratio: number): string {
	return percentFormat.format(ratio);
}

export function formatPercentPrecise(ratio: number): string {
	return percentFormatTight.format(ratio);
}

/** Points of margin between the top two candidates, as a 0-1 ratio. */
export function marginRatio(topVotes: number, runnerUpVotes: number, total: number): number {
	if (!total) return 0;
	return (topVotes - runnerUpVotes) / total;
}

export function formatMargin(ratio: number): string {
	const points = Math.abs(ratio) * 100;
	const precision = points < 1 ? 1 : points < 10 ? 1 : 0;
	return `${points.toFixed(precision)} pts`;
}

/** Strip the party suffix that candidates carry inside their display name. */
export function cleanCandidateName(raw: string): string {
	return raw
		.replace(/\s*\((I|Incumbent)\)\s*/gi, ' ')
		.replace(/\s*\((Rep|Dem|Lib|Grn|Ind)\)\s*/gi, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

export function isIncumbent(raw: string): boolean {
	return /\((I|Incumbent)\)/i.test(raw);
}

export function partyAbbreviation(party: Party | null): string {
	return party?.standardName || party?.abbreviation || '';
}

/**
 * Party colors come from the feed but are tuned for light backgrounds and are
 * low-contrast for text. Map the meaningful ones to our own tokens.
 */
export function partyTone(party: Party | null): 'rep' | 'dem' | 'lib' | 'grn' | 'ind' | 'neutral' {
	const abbr = partyAbbreviation(party).toLowerCase();
	if (abbr.startsWith('rep')) return 'rep';
	if (abbr.startsWith('dem')) return 'dem';
	if (abbr.startsWith('lib')) return 'lib';
	if (abbr.startsWith('grn')) return 'grn';
	if (abbr.startsWith('ind')) return 'ind';
	return 'neutral';
}

/** Turn a state feed contest name into something short enough for a phone. */
export function shortContestName(name: string): string {
	return name
		.replace(/^State House of Representatives - District\s*/i, 'State House · Dist. ')
		.replace(/^State Senate - District\s*/i, 'State Senate · Dist. ')
		.replace(/^US House of Representatives - District\s*/i, 'U.S. House · Dist. ')
		.replace(/^US Senate$/i, 'U.S. Senate')
		.replace(/^PSC - District\s*/i, 'PSC · Dist. ')
		.replace(/\s*\/\s*[^/]*[áéíóúñ][^/]*$/i, '')
		.trim();
}

/** Relative time like "2 min ago", tolerant of clock skew. */
export function relativeTime(iso: string | null, now: number): string {
	if (!iso) return 'unknown';
	const then = Date.parse(iso);
	if (Number.isNaN(then)) return 'unknown';
	const diffMs = now - then;
	const future = diffMs < -30_000;
	const abs = Math.abs(diffMs);

	if (abs < 45_000) return future ? 'moments from now' : 'just now';

	const minutes = Math.round(abs / 60_000);
	if (minutes < 60) return future ? `in ${minutes} min` : `${minutes} min ago`;

	const hours = Math.round(minutes / 60);
	if (hours < 24) return future ? `in ${hours} hr` : `${hours} hr ago`;

	const days = Math.round(hours / 24);
	return future ? `in ${days} days` : `${days} days ago`;
}

export function formatClockTime(iso: string | null): string {
	if (!iso) return '';
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return '';
	return parsed.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'America/New_York'
	}) + ' ET';
}

export function formatLongDate(iso: string | null): string {
	if (!iso) return '';
	const parsed = new Date(`${iso.slice(0, 10)}T12:00:00`);
	if (Number.isNaN(parsed.getTime())) return '';
	return parsed.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}
