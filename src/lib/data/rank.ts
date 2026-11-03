import type { BallotItem, BallotOption } from './types';
import { cleanCandidateName, localize, voteShare } from './format';

export interface RankedCandidate {
	option: BallotOption;
	/** Candidate name with party suffixes removed. */
	name: string;
	/** Party label, e.g. "Rep". */
	party: string;
	isIncumbent: boolean;
	votes: number;
	share: number;
	/** Share difference from the leader, as a 0-1 ratio. Negative for the leader. */
	gapToLeader: number;
	isLeader: boolean;
	/** True when the candidate's votes are all that separates them from another. */
	isTied: boolean;
}

export interface RaceStanding {
	/** Total votes across all options in this contest. */
	totalVotes: number;
	ranked: RankedCandidate[];
	leader: RankedCandidate | null;
	runnerUp: RankedCandidate | null;
	/** Margin between the top two, as a 0-1 ratio of total votes. */
	margin: number;
	/** True when the leader and runner-up have the same vote count and votes exist. */
	isTied: boolean;
	/** True when every reporting unit has reported. */
	isComplete: boolean;
	reportingUnits: number;
	totalUnits: number;
	/** 0-1 share of reporting units that have reported. */
	reportProgress: number;
	/** True when race has votes but no unit reported yet (transmission lag). */
	awaitingUnits: boolean;
}

/**
 * Order candidates by votes, then derive the comparisons the UI needs. Ties are
 * resolved by original ballot order so the list never flickers between polls.
 */
export function rankContest(contest: BallotItem | null): RaceStanding {
	const empty: RaceStanding = {
		totalVotes: 0,
		ranked: [],
		leader: null,
		runnerUp: null,
		margin: 0,
		isTied: false,
		isComplete: false,
		reportingUnits: 0,
		totalUnits: 0,
		reportProgress: 0,
		awaitingUnits: false
	};
	if (!contest) return empty;

	const options = contest.summaryResults?.ballotOptions ?? [];
	const totalVotes = options.reduce((sum, option) => sum + (option.voteCount ?? 0), 0);
	const sorted = [...options].sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0));
	const topVotes = sorted[0]?.voteCount ?? 0;
	const leaderName = sorted[0]?.id;

	const ranked: RankedCandidate[] = sorted.map((option) => {
		const rawName = localize(option.name);
		return {
			option,
			name: cleanCandidateName(rawName),
			party: option.party?.standardName || option.party?.abbreviation || '',
			isIncumbent: /\((I|Incumbent)\)/i.test(rawName),
			votes: option.voteCount ?? 0,
			share: voteShare(option.voteCount ?? 0, totalVotes),
			gapToLeader: voteShare((option.voteCount ?? 0) - topVotes, totalVotes || 1),
			isLeader: option.id === leaderName && totalVotes > 0,
			isTied: totalVotes > 0 && (option.voteCount ?? 0) === topVotes && sorted.filter((o) => (o.voteCount ?? 0) === topVotes).length > 1
		};
	});

	const leader = ranked[0] ?? null;
	const runnerUp = ranked[1] ?? null;
	const reportingUnits = contest.reportingStatus?.reportingUnits ?? 0;
	const totalUnits = contest.reportingStatus?.totalUnits ?? 0;

	return {
		totalVotes,
		ranked,
		leader,
		runnerUp,
		margin: leader && runnerUp && totalVotes > 0 ? (leader.votes - runnerUp.votes) / totalVotes : 0,
		isTied: Boolean(leader && runnerUp && totalVotes > 0 && leader.votes === runnerUp.votes),
		isComplete: totalUnits > 0 && reportingUnits >= totalUnits,
		reportingUnits,
		totalUnits,
		reportProgress: totalUnits > 0 ? Math.min(reportingUnits / totalUnits, 1) : 0,
		awaitingUnits: totalVotes > 0 && reportingUnits === 0
	};
}

/** Sum votes per accepted-vote method (Election Day, mail, early, provisional). */
export function methodTotals(contest: BallotItem | null): { label: string; votes: number }[] {
	if (!contest) return [];
	const totals = new Map<string, number>();
	for (const option of contest.summaryResults?.ballotOptions ?? []) {
		for (const group of option.groupResults ?? []) {
			const label = localize(group.groupName) || 'Other';
			totals.set(label, (totals.get(label) ?? 0) + (group.voteCount ?? 0));
		}
	}
	// Stable, meaningful order regardless of how the feed arranges groups.
	const preferred = ['Election Day', 'Advance Voting', 'Absentee by Mail', 'Provisional'];
	return [...totals.entries()]
		.map(([label, votes]) => ({ label, votes }))
		.sort((a, b) => {
			const ai = preferred.indexOf(a.label);
			const bi = preferred.indexOf(b.label);
			return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		});
}

/** True when a contest has a single candidate, i.e. an uncontested seat. */
export function isUncontested(contest: BallotItem | null): boolean {
	const options = contest?.summaryResults?.ballotOptions ?? [];
	return options.length === 1;
}

/** "Yes"/"No" contests render differently from candidate races. */
export function isBallotQuestion(contest: BallotItem | null): boolean {
	const options = contest?.summaryResults?.ballotOptions ?? [];
	if (options.length === 0) return false;
	return options.every((option) => /^(yes|no)$/i.test(localize(option.name).trim()));
}
