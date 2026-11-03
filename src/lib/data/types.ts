/**
 * Wire types for the Enhanced Voting public results API.
 *
 * Every user-facing string arrives as a translation array, so anything that
 * reaches the UI goes through {@link localize} first.
 */

export interface Translation {
	languageId: string;
	text: string;
}

export interface Party {
	id: string;
	name: Translation[] | null;
	abbreviation: string | null;
	standardName: string | null;
	color: string | null;
	textColor: string | null;
}

export interface GroupResult {
	groupId: string;
	groupName: Translation[] | null;
	voteCount: number;
}

export interface BallotOption {
	id: string;
	nativeId: string;
	name: Translation[] | null;
	voteCount: number;
	party: Party | null;
	groupResults: GroupResult[] | null;
	isWriteIn?: boolean;
}

export interface ReportingStatus {
	reportingUnits: number;
	totalUnits: number;
	asOf: string | null;
	reportingStatusDetails: unknown;
}

export interface SummaryResults {
	ballotOptions: BallotOption[] | null;
}

/** One row of the paginated `/ballot-items` list. */
export interface BallotItem {
	id: string;
	parentId: string | null;
	parentJurisdictionName: string | null;
	publishPublicElectionId: string | null;
	relatedIds: string[] | null;
	name: Translation[] | null;
	voteFor: Translation[] | null;
	referendum: Translation[] | null;
	turnout: unknown;
	reportingStatus: ReportingStatus | null;
	voteTotal: number;
	underVoteCount: number | null;
	overVoteCount: number | null;
	contestGroupId: string | null;
	contestType: string;
	summaryResults: SummaryResults | null;
	rankedChoiceSummaryResults: unknown;
	hasBreakdownResults: boolean;
	crossCounties: unknown;
	isCloseRace: boolean;
	partyName: Translation[] | null;
}

export interface PrecinctInfo {
	id: string;
	name: Translation[] | null;
	precinctOrder: number;
	reportingStatus: number;
	mapFeatureId: string | null;
	isVirtual: boolean;
}

/** A precinct-level slice of one contest, from `/ballot-items/{id}`. */
export interface BreakdownResult {
	parentBallotItemId: string;
	precinct: PrecinctInfo;
	voteTotal: number;
	underVoteCount: number | null;
	overVoteCount: number | null;
	ballotOptions: BallotOption[] | null;
}

/** Full detail for a single contest, from `/ballot-items/{id}`. */
export interface BallotItemDetail {
	id: string;
	name: Translation[] | null;
	voteFor: Translation[] | null;
	referendum: Translation[] | null;
	turnout: unknown;
	reportingStatus: ReportingStatus | null;
	contestType: string;
	voteTotal: number;
	underVoteCount: number | null;
	overVoteCount: number | null;
	summaryResults: SummaryResults | null;
	rankedChoiceSummaryResults: unknown;
	breakdownResults: BreakdownResult[] | null;
	breakdownResultCount: number;
}

export interface PagedResponse<T> {
	data: T[];
	limit: number;
	offset: number;
	totalRecordCount: number;
}

/** Election-level metadata from `/elections/{jurisdiction}/{slug}`. */
export interface ElectionSummary {
	id: string;
	ballotItemCount: number;
	electionDate: string;
	name: Translation[] | null;
	dateText: Translation[] | null;
	isOfficialResults: boolean;
	asOf: string | null;
	lastUpdated: string | null;
	publishDate: string | null;
	totalVoters: number;
	ballotsCast: number;
	precinctsReporting: number | null;
	nextUpdateAt: string | null;
	isPrimary: boolean;
}

export interface PrecinctTurnout {
	/** County that published this row (added client-side, not in the feed). */
	county?: string;
	id: string;
	precinctName: string;
	ballotsCast: number;
	voterTurnout: number;
	voterRegistration: number;
}
