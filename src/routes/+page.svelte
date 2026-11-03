<script lang="ts">
	import { onMount } from 'svelte';

	import StatusBar from '#lib/components/StatusBar.svelte';
	import NavTabs from '#lib/components/NavTabs.svelte';
	import FeaturedRace from '#lib/components/FeaturedRace.svelte';
	import RaceList from '#lib/components/RaceList.svelte';
	import RaceCard from '#lib/components/RaceCard.svelte';
	import TurnoutPanel from '#lib/components/TurnoutPanel.svelte';
	import CountySwitcher from '#lib/components/CountySwitcher.svelte';

	import { createFeedPoller } from '#lib/data/poller.svelte';
	import { resolveBallot, BALLOTS, primaryContest } from '#lib/data/ballot';
	import { createCountyPreference } from '#lib/data/preference.svelte';
	import { rankContest } from '#lib/data/rank';
	import {
		PUBLIC_RESULTS_URL,
		STATE_JURISDICTION,
		COUNTIES,
		ballotItemsUrl,
		type CountyKey
	} from '#lib/data/config';
	import {
		formatLongDate,
		formatNumber,
		formatPercent,
		localize,
		shortContestName
	} from '#lib/data/format';

	const poller = createFeedPoller();
	const preference = createCountyPreference();

	onMount(() => {
		// Adopt the saved county before the first paint of results.
		preference.restore();
		poller.start();
		return () => poller.stop();
	});

	/** The county whose ballot is being read. */
	const activeCounty = $derived(preference.county);
	const countyBallot = $derived(BALLOTS[activeCounty]);
	const countyMeta = $derived(COUNTIES[activeCounty]);

	function selectCounty(next: CountyKey) {
		if (next === activeCounty) return;
		preference.select(next);
		// Land on the ballot rather than staying on a now-irrelevant tab.
		activeTab = 'ballot';
	}

	const feed = $derived(poller.state);
	const county = $derived(feed.county);
	const stateFeed = $derived(feed.state);

	/** Contest lists keyed by county, for the multi-county resolver. */
	const countyFeeds = $derived({
		cherokee: county?.counties.cherokee?.contests,
		cobb: county?.counties.cobb?.contests
	});

	const ballot = $derived(
		county ? resolveBallot(countyBallot, countyFeeds, stateFeed?.contests ?? []) : []
	);
	const featured = $derived(
		ballot.find((entry) => entry.key === countyBallot.featuredKey) ?? null
	);
	const federal = $derived(ballot.filter((entry) => entry.group === 'federal'));
	const stateRaces = $derived(ballot.filter((entry) => entry.group === 'state'));
	const countyRaces = $derived(ballot.filter((entry) => entry.group === 'county'));
	const questions = $derived(ballot.filter((entry) => entry.group === 'ballot-question'));

	/** Precincts inside the featured district, for highlighting turnout rows. */
	const districtPrecincts = $derived(countyBallot.districtPrecincts);

	/** The active county's own contests, for the county tab. */
	const activeCountyContests = $derived(county?.counties[activeCounty]?.contests ?? []);

	/** Every loaded feed's contests, for the data tab's totals. */
	const allCountyContests = $derived(
		Object.values(county?.counties ?? {}).flatMap((feed) => feed?.contests ?? [])
	);

	/** County feed contests that are not on your ballot. */
	const otherCountyContests = $derived(
		activeCountyContests.filter((contest) => {
			const name = localize(contest.name);
			return !ballot.some((entry) => entry.contestName === name);
		})
	);

	const tabs = $derived([
		{ id: 'ballot', label: 'My ballot', count: ballot.length },
		{ id: 'county', label: countyMeta.name, count: otherCountyContests.length },
		{ id: 'state', label: 'Statewide', count: 0 },
		{ id: 'data', label: 'Data', count: 0 }
	]);

	let activeTab = $state('ballot');

	function selectTab(id: string) {
		activeTab = id;
		// The statewide feed is ~600 kB, so only fetch it once it is wanted.
		if (id === 'state') poller.ensureState();
		// Keep the tab strip in view rather than jumping to the top of the page.
		document.getElementById('top')?.scrollIntoView({ block: 'start' });
	}

	/** Keyboard support for the tab strip. */
	function onTabKeydown(event: KeyboardEvent) {
		const index = tabs.findIndex((tab) => tab.id === activeTab);
		if (index === -1) return;
		let next = index;
		if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = tabs.length - 1;
		else return;
		event.preventDefault();
		selectTab(tabs[next].id);
		document.getElementById(`tab-${tabs[next].id}`)?.focus();
	}

	const countyTurnout = $derived(county?.turnout ?? []);
	const countyTotalCast = $derived(
		countyTurnout.reduce((sum, precinct) => sum + (precinct.ballotsCast ?? 0), 0)
	);
	const countyRegistered = $derived(
		countyTurnout.reduce((sum, precinct) => sum + (precinct.voterRegistration ?? 0), 0)
	);
	const woodstockRegistered = $derived(
		countyTurnout.find((p) => p.precinctName === 'Woodstock')?.voterRegistration ?? 0
	);
	const lickskilletRegistered = $derived(
		countyTurnout.find((p) => p.precinctName === 'Lickskillet')?.voterRegistration ?? 0
	);
</script>

<svelte:head>
	<title>{countyMeta.name} County & District 44 results · Georgia 2026</title>
</svelte:head>

<a class="skip-link" href="#main">Skip to results</a>

<div class="shell" id="top">
	<header class="masthead">
		<div class="masthead-inner">
			<div class="where">
				<p class="kicker">Georgia · November 3, 2026</p>
				<h1>{countyMeta.name} County results</h1>
				<p class="sub">
					Unofficial returns for your ballot in {countyBallot.anchor}, State House District 44.
				</p>
				<div class="county-pick">
					<CountySwitcher value={activeCounty} onSelect={selectCounty} />
				</div>
			</div>
			<StatusBar
				fetchedAt={county?.fetchedAt ?? null}
				asOf={county?.asOf ?? null}
				isRefreshing={feed.isRefreshing}
				error={feed.error}
				failures={feed.failures}
				onRefresh={() => poller.refresh()}
			/>
		</div>
	</header>

	<div class="tabs-wrap" onkeydown={onTabKeydown} role="presentation">
		<NavTabs {tabs} active={activeTab} onSelect={selectTab} />
	</div>

	<main id="main">
		{#if feed.isInitialLoad && !county}
			<div class="loading" role="status">
				<p>Loading results…</p>
				<div class="skeleton"></div>
				<div class="skeleton short"></div>
				<div class="skeleton"></div>
			</div>
		{:else if !county}
			<div class="error-panel" role="alert">
				<h2>Can’t reach the results feed</h2>
				<p>{feed.error ?? 'The feed did not respond.'}</p>
				<button type="button" onclick={() => poller.refresh()}>Try again</button>
			</div>
		{:else}
			{#if activeTab === 'ballot'}
				<div class="panel" role="tabpanel" id="panel-ballot" aria-labelledby="tab-ballot">
					{#if featured}
						<FeaturedRace entry={featured} {activeCounty} />
					{/if}

					<div class="columns">
						<div class="primary-col">
							<RaceList
								entries={stateRaces}
								title="Your state races"
									description="Statewide offices show all of Georgia by default; toggle any card to {countyMeta.name} County."
									countyName={countyMeta.name}
							/>
							<RaceList
								entries={federal}
								title="Federal"
									description="Georgia-wide totals by default, county figures one tap away."
									countyName={countyMeta.name}
							/>
							<RaceList
									entries={questions}
									title="Ballot questions"
									countyName={countyMeta.name}
								/>
						</div>

						<aside class="secondary-col">
							<RaceList
								entries={countyRaces}
								title="{countyMeta.name} County races"
								countyName={countyMeta.name}
							/>
							<div class="panel-card">
								<TurnoutPanel turnout={countyTurnout} {districtPrecincts} />
							</div>
						</aside>
					</div>
				</div>
			{/if}

			{#if activeTab === 'county'}
				<div class="panel" role="tabpanel" id="panel-county" aria-labelledby="tab-county">
					<div class="panel-head">
						<h2>Headed to {countyMeta.name} County ballots</h2>
						<p>
							Every race {countyMeta.name} County reports that is not on your District 44
							ballot. Some cover districts or cities you may not live in.
						</p>
					</div>

					<div class="grid-auto">
						{#each otherCountyContests as contest (contest.id)}
							<RaceCard
								entry={{
									key: contest.id,
									label: shortContestName(localize(contest.name)),
									group: 'county',
									contestName: localize(contest.name),
									expect: [],
									blurb: '',
									countyContest: contest,
									stateContest: null,
									missing: false,
									sourceCount: 1
								}}
								countyName={countyMeta.name}
							/>
						{/each}
					</div>

					<div class="panel-card">
						<TurnoutPanel turnout={countyTurnout} {districtPrecincts} />
					</div>
				</div>
			{/if}

			{#if activeTab === 'state'}
				<div class="panel" role="tabpanel" id="panel-state" aria-labelledby="tab-state">
					<div class="panel-head">
						<h2>Georgia statewide</h2>
						<p>
							Statewide totals for the offices on your ballot, plus every other contest Georgia is
							reporting tonight.
						</p>
					</div>

					{#if feed.stateError && !stateFeed}
						<div class="inline-error" role="alert">
							<p>
								The statewide feed didn’t load. It’s a large download (about 600 kB), so it can
								time out on a weak connection.
							</p>
							<button type="button" onclick={() => poller.retryState()}>Try again</button>
						</div>
					{:else if !stateFeed}
						<div class="loading" role="status">
							<p>Loading statewide results…</p>
							<div class="skeleton short"></div>
							<div class="skeleton"></div>
						</div>
					{:else}
						{#each ['US Senate', 'Governor', 'Secretary of State', 'Attorney General'] as contestName (contestName)}
							{@const contest = stateFeed.contests.find((c) => localize(c.name) === contestName)}
							{@const entry = ballot.find((e) => e.contestName === contestName)}
							{#if contest && entry}
								<div class="state-row">
									<RaceCard {entry} countyName={countyMeta.name} />
								</div>
							{/if}
						{/each}

						<div class="panel-card">
							<h3 class="sub-head">Every statewide contest reporting votes</h3>
							{#if stateFeed.contests.some((c) => rankContest(c).totalVotes > 0)}
								<ul class="statestrip">
									{#each stateFeed.contests as contest (contest.id)}
										{@const standing = rankContest(contest)}
										{#if standing.leader && standing.totalVotes > 0}
											<li>
												<span class="strip-name"
													>{shortContestName(localize(contest.name))}</span
												>
												<span class="strip-leader">
													{standing.leader.name}
													<em class="tnum">{formatPercent(standing.leader.share)}</em>
												</span>
												<span class="strip-report tnum">
													{standing.reportingUnits}/{standing.totalUnits}
												</span>
											</li>
										{/if}
									{/each}
								</ul>
							{:else}
								<p class="note" style="margin-top: 0">
									No statewide votes are in yet. This list fills in as counties report.
								</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if activeTab === 'data'}
				<div class="panel" role="tabpanel" id="panel-data" aria-labelledby="tab-data">
					<div class="panel-head">
						<h2>Data nerd corner</h2>
						<p>Where the numbers come from, how fresh they are, and how to check them yourself.</p>
					</div>

					<div class="grid-auto">
						<div class="panel-card">
							<h3 class="sub-head">Feed status</h3>
							<dl class="facts">
								<div>
									<dt>Election</dt>
									<dd>November 3, 2026 — General &amp; Special Elections</dd>
								</div>
								<div>
									<dt>Election date</dt>
									<dd>{formatLongDate('2026-11-03')}</dd>
								</div>
								<div>
									<dt>Official yet?</dt>
									<dd>No — unofficial</dd>
								</div>
								<div>
									<dt>Feed timestamp</dt>
									<dd class="tnum">{county?.asOf ?? '—'}</dd>
								</div>
								<div>
									<dt>Contests in county feed</dt>
									<dd class="tnum">{formatNumber(allCountyContests.length)}</dd>
								</div>
								<div>
									<dt>Contests in state feed</dt>
									<dd class="tnum">{formatNumber(stateFeed?.contests.length ?? 0)}</dd>
								</div>
								<div>
									<dt>Ballots cast in county</dt>
									<dd class="tnum">{formatNumber(countyTotalCast)}</dd>
								</div>
								<div>
									<dt>County registration</dt>
									<dd class="tnum">{formatNumber(countyRegistered)}</dd>
								</div>
							</dl>
						</div>

						<div class="panel-card">
							<h3 class="sub-head">How to verify</h3>
							<p class="note">
								This page is an independent reader. Every number is fetched from the public
								Enhanced Voting results API the moment you load the page, then refreshed about
								every five minutes while the tab is visible. Nothing is cached or recalculated
								server-side.
							</p>
							<ul class="links">
								<li>
									<a href={PUBLIC_RESULTS_URL} target="_blank" rel="noreferrer">
										Official ${countyMeta.name} County results page
									</a>
								</li>
								<li>
								<a
									href={ballotItemsUrl(countyMeta.slug)}
									target="_blank"
									rel="noreferrer"
								>
									Raw JSON for {countyMeta.name} County
								</a>
								</li>
								<li>
								<a
									href={ballotItemsUrl(STATE_JURISDICTION)}
									target="_blank"
									rel="noreferrer"
								>
										Raw JSON for statewide contests
									</a>
								</li>
								<li>
									<a href="https://results.sos.ga.gov/" target="_blank" rel="noreferrer">
										Georgia Secretary of State results
									</a>
								</li>
							</ul>
							<p class="note">
								The site's bulk <code>export-*.json</code> file is roughly 46&nbsp;MB and is not
								CORS-enabled, so this page uses the small per-election API instead. Each county
								feed is around 100&nbsp;kB raw and a few kB compressed; the statewide feed is about
								616&nbsp;kB and only loads when you open the Statewide tab.
							</p>
							<p class="note">
								Heads up: that API sits behind a CDN whose edge nodes do not all send
								<code>Access-Control-Allow-Origin</code>, so a request can intermittently fail with
								a CORS error before succeeding. This page retries automatically, which is why a
								first paint sometimes takes a moment.
							</p>
						</div>

						<div class="panel-card">
							<h3 class="sub-head">District 44 arithmetic</h3>
							{#if featured && primaryContest(featured)}
								{@const contest = primaryContest(featured)}
								{@const standing = rankContest(contest)}
								<dl class="facts">
									<div>
										<dt>Total votes counted</dt>
										<dd class="tnum">{formatNumber(standing.totalVotes)}</dd>
									</div>
									<div>
										<dt>Precincts reporting</dt>
										<dd class="tnum">
											{standing.reportingUnits} of {standing.totalUnits}
										</dd>
									</div>
									<div>
										<dt>Precincts in district</dt>
										<dd>{districtPrecincts.length} in {countyMeta.name} County</dd>
									</div>
									{#if standing.leader && standing.runnerUp}
										<div>
											<dt>Gap</dt>
											<dd class="tnum">
												{formatNumber(standing.leader.votes - standing.runnerUp.votes)} votes
											</dd>
										</div>
										<div>
											<dt>Share difference</dt>
											<dd class="tnum">{formatPercent(Math.abs(standing.margin))}</dd>
										</div>
									{/if}
								</dl>
							{/if}
							<p class="note">
								District 44 covers two precincts, so a single precinct reporting can swing the
								percentage noticeably. Woodstock had
								{formatNumber(woodstockRegistered)}
								registered voters versus
								{formatNumber(lickskilletRegistered)}
								in Lickskillet.
							</p>
						</div>
					</div>

					<div class="panel-card">
						<h3 class="sub-head">Precinct turnout table</h3>
						<div class="table-wrap">
							<table>
								<thead>
									<tr>
										<th scope="col">Precinct</th>
										<th scope="col" class="num">Ballots cast</th>
										<th scope="col" class="num">Registered</th>
										<th scope="col" class="num">Turnout</th>
									</tr>
								</thead>
								<tbody>
									{#each [...countyTurnout].sort((a, b) => b.ballotsCast - a.ballotsCast) as precinct (precinct.id)}
										<tr
											class:highlight={districtPrecincts.includes(precinct.precinctName)}
										>
											<th scope="row">{precinct.precinctName}</th>
											<td class="num tnum">{formatNumber(precinct.ballotsCast)}</td>
											<td class="num tnum">{formatNumber(precinct.voterRegistration)}</td>
											<td class="num tnum">
												{precinct.voterRegistration
													? formatPercent(precinct.ballotsCast / precinct.voterRegistration)
													: '—'}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</main>

	<footer>
		<p>
			Unofficial results from the Enhanced Voting public API, refreshed automatically. Numbers can
			change as counties continue reporting.
		</p>
		{#if county}
			<p class="foot-meta tnum">
				Feed as of {county?.asOf ?? 'unknown'} · checked
				{new Date(county.fetchedAt).toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit'
				})}
			</p>
		{/if}
	</footer>
</div>

<style>
	.shell {
		--shell-pad: var(--space-4);
		max-width: var(--content-max);
		margin: 0 auto;
		padding: 0 var(--shell-pad) var(--space-7);
	}

	.masthead {
		padding: var(--space-5) 0 var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.masthead-inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.kicker {
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	h1 {
		font-size: var(--step-4);
		letter-spacing: -0.022em;
		margin-top: var(--space-1);
	}

	.sub {
		margin-top: var(--space-1);
		color: var(--ink-secondary);
		max-width: var(--measure);
	}

	.tabs-wrap {
		position: relative;
	}

	main {
		padding-top: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		animation: fade 220ms ease;
	}

	@keyframes fade {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.columns {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-5);
		align-items: start;
	}

	.primary-col,
	.secondary-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}

	.panel-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.panel-head h2 {
		font-size: var(--step-2);
		letter-spacing: -0.012em;
	}

	.panel-head p {
		margin-top: var(--space-1);
		font-size: var(--step--1);
		color: var(--ink-muted);
		max-width: var(--measure);
	}

	.sub-head {
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-muted);
		margin-bottom: var(--space-3);
	}

	.grid-auto {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		color: var(--ink-muted);
		font-size: var(--step--1);
	}

	.skeleton {
		height: 8rem;
		border-radius: var(--radius-lg);
		background: linear-gradient(
			90deg,
			var(--surface-sunken) 25%,
			var(--surface) 37%,
			var(--surface-sunken) 63%
		);
		background-size: 400% 100%;
		animation: shimmer 1.4s ease infinite;
	}

	.skeleton.short {
		height: 4rem;
	}

	@keyframes shimmer {
		from {
			background-position: 100% 50%;
		}
		to {
			background-position: 0 50%;
		}
	}

	.error-panel {
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		align-items: flex-start;
	}

	.error-panel h2 {
		font-size: var(--step-1);
	}

	.error-panel p {
		color: var(--ink-secondary);
		font-size: var(--step--1);
	}

	.inline-error {
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		align-items: flex-start;
	}

	.inline-error p {
		font-size: var(--step--1);
		color: var(--ink-secondary);
		max-width: var(--measure);
	}

	.inline-error button {
		background: none;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-pill);
		padding: 0.375rem 0.875rem;
		font-size: var(--step--1);
		cursor: pointer;
		min-height: 2rem;
	}

	.inline-error button:hover {
		border-color: var(--ink-muted);
	}

	.error-panel button {
		background: var(--accent);
		color: white;
		border: 0;
		border-radius: var(--radius-pill);
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-size: var(--step--1);
	}

	.facts {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.facts > div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		font-size: var(--step--1);
	}

	.facts dt {
		color: var(--ink-secondary);
	}

	.facts dd {
		margin: 0;
		text-align: right;
		font-weight: 520;
		word-break: break-word;
	}

	.note {
		font-size: var(--step--1);
		color: var(--ink-muted);
		margin-top: var(--space-3);
	}

	.note code {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background: var(--surface-sunken);
		padding: 0.0625rem 0.25rem;
		border-radius: 4px;
	}

	.links {
		list-style: none;
		margin: var(--space-3) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-size: var(--step--1);
	}

	.links a {
		text-decoration: none;
		border-bottom: 1px solid transparent;
	}

	.links a:hover {
		border-bottom-color: currentColor;
	}

	.statestrip {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.statestrip li {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: var(--space-3);
		align-items: baseline;
		font-size: var(--step--1);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border);
	}

	.statestrip li:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.strip-name {
		color: var(--ink-secondary);
		min-width: 0;
	}

	.strip-leader {
		color: var(--ink);
		font-weight: 520;
		text-align: right;
	}

	.strip-leader em {
		font-style: normal;
		font-weight: 640;
		margin-left: var(--space-2);
	}

	.strip-report {
		color: var(--ink-muted);
		font-size: 0.75rem;
		min-width: 3.5ch;
		text-align: right;
	}

	.state-row {
		display: grid;
		gap: var(--space-3);
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--step--1);
	}

	thead th {
		text-align: left;
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--ink-muted);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border);
	}

	tbody th {
		text-align: left;
		font-weight: 500;
		color: var(--ink-secondary);
		padding: var(--space-2) 0;
	}

	tbody td {
		padding: var(--space-2) 0;
	}

	tbody tr + tr th,
	tbody tr + tr td {
		border-top: 1px solid var(--border);
	}

	.num {
		text-align: right;
		min-width: 6ch;
	}

	tr.highlight th {
		color: var(--ink);
		font-weight: 640;
	}

	footer {
		margin-top: var(--space-7);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border);
		font-size: 0.75rem;
		color: var(--ink-muted);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-width: var(--measure);
	}

	.foot-meta {
		color: var(--ink-muted);
	}

	@media (min-width: 62rem) {
		.columns {
			grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
			gap: var(--space-6);
		}

		.grid-auto {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		h1 {
			font-size: var(--step-5);
		}

		.masthead-inner {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
		}
	}

	@media (max-width: 30rem) {
		h1 {
			font-size: var(--step-3);
		}
		.shell {
			--shell-pad: var(--space-3);
		}
	}
</style>
