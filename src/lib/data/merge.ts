import type { BallotItem, BallotOption, GroupResult, ReportingStatus } from './types';
import { localize } from './format';

/**
 * Some legislative districts span more than one county, and each county
 * publishes its own copy of the contest covering only its precincts. Neither
 * copy is the district total, and the statewide feed inherits whichever county
 * reported it (Cherokee, for District 44), so it is not the total either.
 *
 * State House District 44 is the case that matters here: 2 Cherokee precincts
 * plus 11 Cobb precincts, 13 in all. Summing across both counties is the only
 * way to get a correct number.
 */

/** A copy of one contest as published by one jurisdiction. */
export interface ContestSource {
	/** Slug of the county that published it. */
	county: string;
	contest: BallotItem;
}

/**
 * Combine several county copies of the same contest into one aggregate.
 *
 * Candidates are matched by cleaned name rather than option id, because each
 * county mints its own option ids for the same person. Vote method groups do
 * share ids across counties, so those merge by id.
 *
 * A single source is returned untouched: merging it would otherwise recompute
 * totals for contests that are not split across counties.
 */
export function mergeContests(sources: ContestSource[]): BallotItem | null {
	const usable = sources.filter(
		(source) => (source.contest.summaryResults?.ballotOptions?.length ?? 0) > 0
	);
	if (usable.length === 0) return sources[0]?.contest ?? null;
	if (usable.length === 1) return usable[0].contest;

	const [first] = usable;
	const options = new Map<string, BallotOption>();

	for (const { contest } of usable) {
		for (const option of contest.summaryResults?.ballotOptions ?? []) {
			const key = normalizeCandidate(option);
			const existing = options.get(key);
			if (!existing) {
				// Clone so the merged option never aliases a live object.
				options.set(key, {
					...option,
					groupResults: (option.groupResults ?? []).map((group) => ({ ...group }))
				});
				continue;
			}
			existing.voteCount += option.voteCount;
			mergeGroups(existing, option);
		}
	}

	const reportingStatus: ReportingStatus = {
		reportingUnits: usable.reduce(
			(sum, source) => sum + (source.contest.reportingStatus?.reportingUnits ?? 0),
			0
		),
		totalUnits: usable.reduce(
			(sum, source) => sum + (source.contest.reportingStatus?.totalUnits ?? 0),
			0
		),
		// The stalest county sets the timestamp: never claim fresher than the slowest.
		asOf: oldestAsOf(usable.map((source) => source.contest.reportingStatus?.asOf)),
		reportingStatusDetails: null
	};

	const ballotOptions = [...options.values()];
	const voteTotal = ballotOptions.reduce((sum, option) => sum + option.voteCount, 0);

	return {
		...first.contest,
		reportingStatus,
		voteTotal,
		summaryResults: { ballotOptions },
		// Precinct breakdown differs per county, so the merged view has none.
		hasBreakdownResults: false
	};
}

/** Party label as it appears in the candidate's name, e.g. `(Rep)`. */
function normalizeCandidate(option: BallotOption): string {
	return localize(option.name)
		.replace(/\s*\((I|Incumbent)\)\s*/i, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

/** Add one county's per-method votes into an already-merged option. */
function mergeGroups(target: BallotOption, incoming: BallotOption) {
	const byId = new Map<string, GroupResult>(
		(target.groupResults ?? []).map((group) => [group.groupId, group])
	);
	for (const group of incoming.groupResults ?? []) {
		const existing = byId.get(group.groupId);
		if (existing) {
			existing.voteCount += group.voteCount;
		} else {
			byId.set(group.groupId, { ...group });
		}
	}
	target.groupResults = [...byId.values()];
}

/** Earliest valid timestamp, so an aggregate is never newer than its parts. */
function oldestAsOf(values: (string | null | undefined)[]): string | null {
	let oldest: number | null = null;
	let oldestRaw: string | null = null;
	for (const raw of values) {
		if (!raw) continue;
		const parsed = Date.parse(raw);
		if (Number.isNaN(parsed)) continue;
		if (oldest === null || parsed < oldest) {
			oldest = parsed;
			oldestRaw = raw;
		}
	}
	return oldestRaw;
}
