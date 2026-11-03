import type { BallotItem } from './types';
import { localize } from './format';
import { COUNTIES, type CountyKey } from './config';
import { mergeContests, type ContestSource } from './merge';
import { BALLOTS, type BallotEntry, type CountyBallot } from './ballot-counties';

export type { BallotEntry, CountyBallot };
export { BALLOTS };

/** Every county feed this app loads. */
export const LOADED_COUNTIES: CountyKey[] = ['cherokee', 'cobb'];

export interface ResolvedBallotEntry extends BallotEntry {
	/** Contest summed across every county that publishes it. */
	countyContest: BallotItem | null;
	/** Contest as counted statewide (may include precincts outside the county). */
	stateContest: BallotItem | null;
	/** True when the feed no longer contains a contest we expected. */
	missing: boolean;
	/** How many counties contributed to `countyContest`. */
	sourceCount: number;
}

/**
 * Attach live contests to one county's ballot definition.
 *
 * @param ballot The county's ballot (Cherokee or Cobb).
 * @param countyFeeds Contest lists keyed by county, in load order.
 * @param stateContests The statewide feed, used for federal totals.
 */
export function resolveBallot(
	ballot: CountyBallot,
	countyFeeds: Partial<Record<CountyKey, BallotItem[]>>,
	stateContests: BallotItem[]
): ResolvedBallotEntry[] {
	const indexes = new Map<CountyKey, Map<string, BallotItem>>();
	for (const [county, contests] of Object.entries(countyFeeds)) {
		if (!contests) continue;
		indexes.set(
			county as CountyKey,
			new Map(contests.map((contest) => [localize(contest.name), contest]))
		);
	}
	const state = new Map(stateContests.map((contest) => [localize(contest.name), contest]));

	return ballot.entries.map((entry) => {
		const publishers = entry.publishedBy ?? [ballot.key];
		const sources: ContestSource[] = [];
		for (const county of publishers) {
			const contest = indexes.get(county)?.get(entry.contestName);
			if (contest) sources.push({ county: COUNTIES[county].slug, contest });
		}

		const countyContest = mergeContests(sources);
		const stateContest = state.get(entry.contestName) ?? null;

		return {
			...entry,
			countyContest,
			stateContest,
			missing: !countyContest && !stateContest,
			sourceCount: sources.length
		};
	});
}

/**
 * Statewide contests report local numbers in the county feeds and the full
 * statewide count in the state feed. Prefer statewide numbers for federal and
 * statewide offices, and county numbers for local districts.
 */
export function primaryContest(entry: ResolvedBallotEntry): BallotItem | null {
	if (entry.group === 'federal') return entry.stateContest ?? entry.countyContest;
	return entry.countyContest ?? entry.stateContest;
}

export function countyContestOf(entry: ResolvedBallotEntry): BallotItem | null {
	return entry.countyContest;
}

/** True when this contest is counted across more than one county feed. */
export function crossesCounties(entry: ResolvedBallotEntry): boolean {
	return (entry.publishedBy?.length ?? 0) > 1;
}

/** Which reporting geography a card is showing. */
export type ResultScope = 'state' | 'county';

/** One geography a contest can be read in. */
export interface ScopeOption {
	scope: ResultScope;
	/** Short label for the toggle, e.g. "Georgia" or "Cherokee". */
	label: string;
	contest: BallotItem;
	/** Reporting units this view covers. */
	totalUnits: number;
}

/**
 * The geographies a contest can be read in.
 *
 * A statewide office is published twice: the county feed counts only that
 * county's precincts, the state feed counts the whole state. Both are useful,
 * so both become toggle options. A county-only race has just one.
 *
 * The statewide copy is only offered when it actually covers more ground. Some
 * legislative districts are published statewide as a partial copy — District 44
 * reports 2 units statewide but 13 across its two counties — and offering that
 * as "statewide" would be a downgrade, not an alternative.
 */
export function scopeOptions(entry: ResolvedBallotEntry, countyName: string): ScopeOption[] {
	const options: ScopeOption[] = [];
	const stateUnits = entry.stateContest?.reportingStatus?.totalUnits ?? 0;
	const countyUnits = entry.countyContest?.reportingStatus?.totalUnits ?? 0;

	if (entry.stateContest && stateUnits > countyUnits) {
		options.push({
			scope: 'state',
			label: 'Georgia',
			contest: entry.stateContest,
			totalUnits: stateUnits
		});
	}

	if (entry.countyContest) {
		options.push({
			scope: 'county',
			label: countyName,
			contest: entry.countyContest,
			totalUnits: countyUnits
		});
	}

	return options;
}

/**
 * Statewide contests open on statewide numbers, because that is the count that
 * decides the office. Everything else opens on the county view.
 */
export function defaultScope(options: ScopeOption[]): ResultScope {
	return options.some((option) => option.scope === 'state') ? 'state' : 'county';
}
