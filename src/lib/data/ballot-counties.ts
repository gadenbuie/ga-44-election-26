import type { CountyKey } from './config';

/**
 * A ballot for one reader, plus how to find each contest in the feeds.
 *
 * `contestName` matches the feed exactly so lookups stay stable. `publishedBy`
 * lists every county that publishes a copy of the contest: county-local races
 * are published by one county, while split legislative districts are published
 * by each county they touch and must be summed. Getting this list wrong shows
 * up as a plausible but incomplete percentage, so it is explicit rather than
 * inferred from the contest name.
 *
 * `expect` is a tripwire: if a contest disappears or gets renamed, the app says
 * so instead of quietly rendering an empty card.
 */
export interface BallotEntry {
	/** Key used for deep links. */
	key: string;
	/** Short label for compact summaries. */
	label: string;
	/** Grouping used by the UI. */
	group: 'federal' | 'state' | 'county' | 'ballot-question';
	/** Full contest name as it appears in the feed. */
	contestName: string;
	/** Candidate names we expect to find in the contest. */
	expect: string[];
	/** One sentence on why this is on the ballot. */
	blurb: string;
	/** Counties publishing a copy of this contest, summed when more than one. */
	publishedBy?: CountyKey[];
}

/** Everything one county's reader sees. */
export interface CountyBallot {
	key: CountyKey;
	/** Where in the county this ballot is anchored, for the page subtitle. */
	anchor: string;
	/** The race that gets hero treatment. */
	featuredKey: string;
	/** Precincts inside that featured district, used to highlight turnout rows. */
	districtPrecincts: string[];
	entries: BallotEntry[];
}

/**
 * District 44 is split: Cherokee counts Woodstock and Lickskillet, Cobb counts
 * eleven East Cobb precincts. Both feeds publish a partial copy under the same
 * name, so both must be summed to reach the district total.
 */
const SPLIT_DISTRICT_44: CountyKey[] = ['cherokee', 'cobb'];

/** Races every Georgia voter sees, regardless of county. */
const STATEWIDE: BallotEntry[] = [
	{
		key: 'us-senate',
		label: 'U.S. Senate',
		group: 'federal',
		contestName: 'US Senate',
		expect: ['Mike Collins', 'Jon Ossoff'],
		blurb: 'Statewide race for one of Georgia’s two U.S. Senate seats.'
	},
	{
		key: 'governor',
		label: 'Governor',
		group: 'state',
		contestName: 'Governor',
		expect: ['Rick Jackson', 'Keisha Lance Bottoms'],
		blurb: 'Statewide race for governor.'
	},
	{
		key: 'lt-governor',
		label: 'Lieutenant Governor',
		group: 'state',
		contestName: 'Lieutenant Governor',
		expect: ['Greg Dolezal', 'Josh McLaurin'],
		blurb: 'Statewide race for lieutenant governor.'
	},
	{
		key: 'secretary-of-state',
		label: 'Secretary of State',
		group: 'state',
		contestName: 'Secretary of State',
		expect: ['Tim Fleming', 'Penny Brown Reynolds'],
		blurb: 'Oversees elections and business filings for Georgia.'
	},
	{
		key: 'attorney-general',
		label: 'Attorney General',
		group: 'state',
		contestName: 'Attorney General',
		expect: ['Brian Strickland', 'Tanya Miller'],
		blurb: 'Statewide race for Georgia’s chief legal officer.'
	}
];

const AMENDMENTS: BallotEntry[] = [
	{
		key: 'amendment-1',
		label: 'Amendment 1',
		group: 'ballot-question',
		contestName: 'Proposed Constitutional Amendment 1',
		expect: ['Yes', 'No'],
		blurb: 'A statewide proposed constitutional amendment.'
	},
	{
		key: 'amendment-2',
		label: 'Amendment 2',
		group: 'ballot-question',
		contestName: 'Proposed Constitutional Amendment 2',
		expect: ['Yes', 'No'],
		blurb: 'A statewide proposed constitutional amendment.'
	},
	{
		key: 'amendment-3',
		label: 'Amendment 3',
		group: 'ballot-question',
		contestName: 'Proposed Constitutional Amendment 3',
		expect: ['Yes', 'No'],
		blurb: 'A statewide proposed constitutional amendment.'
	}
];

const DISTRICT_44: BallotEntry = {
	key: 'state-house-44',
	label: 'State House · Dist. 44',
	group: 'state',
	contestName: 'State House of Representatives - District 44',
	expect: ['Don L. Parsons', 'Danielle Bell'],
	blurb: 'Your district in the Georgia House. It straddles Cherokee and Cobb.',
	publishedBy: SPLIT_DISTRICT_44
};

/** Woodstock, Cherokee County. */
export const CHEROKEE_BALLOT: CountyBallot = {
	key: 'cherokee',
	anchor: 'Woodstock',
	featuredKey: 'state-house-44',
	districtPrecincts: ['Woodstock', 'Lickskillet'],
	entries: [
		STATEWIDE[0],
		{
			key: 'us-house-11',
			label: 'U.S. House · Dist. 11',
			group: 'federal',
			contestName: 'US House of Representatives - District 11',
			expect: ['John Cowan', 'Chris Harden'],
			blurb: 'Cherokee County sits inside Georgia’s 11th Congressional District.'
		},
		STATEWIDE[1],
		STATEWIDE[2],
		STATEWIDE[3],
		STATEWIDE[4],
		{
			key: 'state-senate-56',
			label: 'State Senate · Dist. 56',
			group: 'state',
			contestName: 'State Senate - District 56',
			expect: ['John Albers', 'Patrick Thompson'],
			blurb: 'Your district covering the Woodstock area in the Georgia Senate.',
			publishedBy: ['cherokee', 'cobb']
		},
		DISTRICT_44,
		{
			key: 'county-commission-4',
			label: 'County Commission · Dist. 4',
			group: 'county',
			contestName: 'County Commission - District 4',
			expect: ['Corey Ragsdale', 'Steven Rogers'],
			blurb: 'Cherokee County Board of Commissioners, the district covering Woodstock.',
			publishedBy: ['cherokee']
		},
		{
			key: 'boe-5',
			label: 'Board of Education · Dist. 5',
			group: 'county',
			contestName: 'County BOE - District 5',
			expect: ['Erin Ragsdale'],
			blurb: 'Cherokee County Board of Education for the district serving Woodstock schools.',
			publishedBy: ['cherokee']
		},
		...AMENDMENTS,
		{
			key: 'ed-splost',
			label: 'Ed-SPLOST renewal',
			group: 'ballot-question',
			contestName:
				'To Continue the Special One Percent Sales and Use Tax and Issue Bonds for the Cherokee County School System',
			expect: ['Yes', 'No'],
			blurb: 'Cherokee County school sales tax, renewed for another cycle.',
			publishedBy: ['cherokee']
		},
		{
			key: 'school-homestead',
			label: 'School homestead exemption',
			group: 'ballot-question',
			contestName:
				'Homestead Exemption – School District Ad Valorem Taxes for Educational Purposes',
			expect: ['Yes', 'No'],
			blurb: 'Cherokee County school property tax homestead exemption.',
			publishedBy: ['cherokee']
		}
	]
};

/**
 * East Cobb, Cobb County.
 *
 * Cobb's county commission and school board districts are address-specific, and
 * Mableton's redevelopment referendum only reaches Mableton voters, so they are
 * left off this general ballot rather than guessed at. They all appear in the
 * county tab, which lists everything Cobb reports.
 */
export const COBB_BALLOT: CountyBallot = {
	key: 'cobb',
	anchor: 'East Cobb',
	featuredKey: 'state-house-44',
	districtPrecincts: [
		'Addison 01',
		'Bells Ferry 02',
		'Bells Ferry 03',
		'Blackwell 01',
		'Elizabeth 03',
		'Elizabeth 05',
		'Gritters 01',
		'Kell 01',
		'Lassiter 01',
		'McCleskey 01',
		'Micholson 01'
	],
	entries: [
		STATEWIDE[0],
		{
			key: 'us-house-11',
			label: 'U.S. House · Dist. 11',
			group: 'federal',
			contestName: 'US House of Representatives - District 11',
			expect: ['John Cowan', 'Chris Harden'],
			blurb: 'East Cobb precincts in District 44 sit inside Georgia’s 11th Congressional District.'
		},
		STATEWIDE[1],
		STATEWIDE[2],
		STATEWIDE[3],
		STATEWIDE[4],
		{
			key: 'state-senate-56',
			label: 'State Senate · Dist. 56',
			group: 'state',
			contestName: 'State Senate - District 56',
			expect: ['John Albers', 'Patrick Thompson'],
			blurb: 'The Georgia Senate district covering these East Cobb precincts.',
			publishedBy: ['cherokee', 'cobb']
		},
		DISTRICT_44,
		{
			key: 'solicitor-general',
			label: 'Solicitor General',
			group: 'county',
			contestName: 'Solicitor General',
			expect: [],
			blurb: 'Cobb County prosecutors office, elected countywide.',
			publishedBy: ['cobb']
		},
		{
			key: 'surveyor',
			label: 'Surveyor',
			group: 'county',
			contestName: 'Surveyor',
			expect: [],
			blurb: 'Cobb County surveyor, a partisan countywide row office.',
			publishedBy: ['cobb']
		},
		{
			key: 'soil-water',
			label: 'Soil & Water Supervisor',
			group: 'county',
			contestName: 'Cobb Co Soil and Water Conservation District Supervisor',
			expect: [],
			blurb: 'Cobb County soil and water conservation district supervisor.',
			publishedBy: ['cobb']
		},
		...AMENDMENTS,
		{
			key: 'cobb-splost',
			label: 'Cobb SPLOST',
			group: 'ballot-question',
			contestName: 'Cobb County Special Purpose Local Option Sales Tax',
			expect: ['Yes', 'No'],
			blurb: 'Cobb County special purpose local option sales tax.',
			publishedBy: ['cobb']
		}
	]
};

/** The ballot each county's reader sees. */
export const BALLOTS: Record<CountyKey, CountyBallot> = {
	cherokee: CHEROKEE_BALLOT,
	cobb: COBB_BALLOT
};
