<script lang="ts">
	import ReportingMeter from './ReportingMeter.svelte';
	import PrecinctBreakdown from './PrecinctBreakdown.svelte';
	import { rankContest, methodTotals, isBallotQuestion } from '#lib/data/rank';
	import { fetchBallotItemDetail } from '#lib/data/api';
	import { COUNTIES, type CountyKey } from '#lib/data/config';
	import {
		formatMargin,
		formatNumber,
		formatPercent,
		formatPercentPrecise,
		partyTone
	} from '#lib/data/format';
	import type { BallotItemDetail } from '#lib/data/types';
	import type { ResolvedBallotEntry } from '#lib/data/ballot';

	interface Props {
		entry: ResolvedBallotEntry;
		/** County whose precincts are being read, for the detail endpoint. */
		activeCounty: CountyKey;
	}

	let { entry, activeCounty }: Props = $props();

	const contest = $derived(entry.countyContest ?? entry.stateContest);
	const standing = $derived(rankContest(contest));
	const methods = $derived(methodTotals(contest));
	const question = $derived(isBallotQuestion(contest));

	let detailsOpen = $state(false);
	let detail = $state<BallotItemDetail | null>(null);
	let detailError = $state<string | null>(null);
	let detailLoading = $state(false);

	// Reload precinct detail whenever we open the panel or the contest changes.
	$effect(() => {
		if (!detailsOpen || !contest) return;
		const ids = `${contest.id}:${contest.voteTotal}`;
		void ids;
		void loadDetail();
	});

	async function loadDetail() {
		if (!contest) return;
		detailLoading = true;
		detailError = null;
		try {
			// Local districts live in the county feed; statewide races resolve there too.
			detail = await fetchBallotItemDetail(COUNTIES[activeCounty].slug, contest.id);
		} catch {
			detailError = 'Could not load precinct detail. Retrying on next refresh.';
		} finally {
			detailLoading = false;
		}
	}

	const marginLabel = $derived(standing.isTied ? 'Tied' : formatMargin(standing.margin));
	const leading = $derived(standing.leader);
</script>

<section class="hero" aria-labelledby="featured-heading">
	<div class="eyebrow">
		<span class="dot" aria-hidden="true"></span>
		<span>Your district · {entry.label}</span>
	</div>

	<h2 id="featured-heading" class="title">{entry.label}</h2>
	<p class="blurb">{entry.blurb}</p>

	{#if contest && standing.ranked.length}
		<div class="scoreboard">
			{#each standing.ranked as candidate (candidate.option.id)}
				<div class="tile" class:leader={candidate.isLeader}>
					<span class="tile-name">{candidate.name}</span>
					<span class="tile-pct tnum">{formatPercent(candidate.share)}</span>
					<span class="tile-votes tnum">{formatNumber(candidate.votes)} votes</span>
				</div>
			{/each}
		</div>

		{#if leading && !question}
			<p class="verdict">
				{#if standing.totalVotes === 0}
					No votes counted yet — results arrive as Cherokee County reports.
				{:else if standing.isTied}
					Dead heat at <strong class="tnum">{formatNumber(leading.votes)}</strong> votes each.
				{:else}
					<strong>{leading.name}</strong>
					{#if leading.gapToLeader === 0 && standing.runnerUp}
						leads by <strong class="tnum">{marginLabel}</strong>
						{#if !standing.isComplete}
							with {standing.totalUnits - standing.reportingUnits} of {standing.totalUnits}
							precincts still out.
						{/if}
					{/if}
				{/if}
			</p>
		{/if}

		{#if standing.totalVotes > 0 && standing.leader && standing.runnerUp}
			<div class="headline-bar" aria-hidden="true">
				{#each standing.ranked as candidate (candidate.option.id)}
					<span
						class="headline-seg"
						data-tone={partyTone(candidate.option.party)}
						style:width="{candidate.share * 100}%"
					></span>
				{/each}
			</div>
		{/if}

		<div class="meter-row">
			<ReportingMeter
				reportingUnits={standing.reportingUnits}
				totalUnits={standing.totalUnits}
				progress={standing.reportProgress}
				voteTotal={standing.totalVotes}
			/>
			<button
				type="button"
				class="toggle"
				aria-expanded={detailsOpen}
				aria-controls="featured-details"
				onclick={() => (detailsOpen = !detailsOpen)}
			>
				{detailsOpen ? 'Hide' : 'Precinct'} detail
			</button>
		</div>

		<div id="featured-details" class="details" hidden={!detailsOpen}>
			{#if detailLoading && !detail}
				<p class="detail-status">Loading precinct results…</p>
			{:else if detailError}
				<p class="detail-status error">{detailError}</p>
			{:else if detail}
				<PrecinctBreakdown {detail} />
			{/if}

			{#if methods.length}
				<div class="methods">
					<h4>Votes by method</h4>
					<ul>
						{#each methods as method (method.label)}
							<li>
								<span>{method.label}</span>
								<span class="tnum">
									{formatNumber(method.votes)}
									{#if standing.totalVotes > 0}
										<em>{formatPercent(method.votes / standing.totalVotes)}</em>
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if standing.leader && standing.runnerUp && !standing.isTied && standing.totalVotes > 0}
				<p class="gap-note">
					Current gap: <strong class="tnum"
						>{formatNumber(standing.leader.votes - standing.runnerUp.votes)} votes</strong
					>
					({formatPercentPrecise(standing.margin)}).
				</p>
			{/if}
		</div>
	{:else}
		<p class="detail-status">Waiting for the first results from this race.</p>
	{/if}
</section>

<style>
	.hero {
		background: var(--surface-raised);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		box-shadow: var(--shadow);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
	}

	.title {
		font-size: var(--step-3);
		letter-spacing: -0.018em;
	}

	.blurb {
		font-size: var(--step--1);
		color: var(--ink-muted);
		max-width: var(--measure);
		margin-top: calc(var(--space-1) * -1);
	}

	.scoreboard {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: var(--space-2);
	}

	.tile {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-sunken);
	}

	.tile.leader {
		border-color: var(--border-strong);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}

	.tile-name {
		font-size: var(--step--1);
		color: var(--ink-secondary);
		font-weight: 520;
	}

	.tile.leader .tile-name {
		color: var(--ink);
	}

	.tile-pct {
		font-size: var(--step-4);
		font-weight: 660;
		line-height: 1.05;
		letter-spacing: -0.02em;
	}

	.tile-votes {
		font-size: var(--step--1);
		color: var(--ink-muted);
	}

	.verdict {
		font-size: var(--step-0);
		color: var(--ink-secondary);
	}

	.verdict strong {
		color: var(--ink);
		font-weight: 640;
	}

	.headline-bar {
		display: flex;
		height: 10px;
		border-radius: var(--radius-pill);
		overflow: hidden;
		background: var(--surface-sunken);
		gap: 2px;
	}

	.headline-seg {
		display: block;
		height: 100%;
		transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.headline-seg[data-tone='rep'] {
		background: var(--rep);
	}
	.headline-seg[data-tone='dem'] {
		background: var(--dem);
	}
	.headline-seg[data-tone='lib'] {
		background: var(--lib);
	}
	.headline-seg[data-tone='grn'] {
		background: var(--grn);
	}
	.headline-seg[data-tone='ind'] {
		background: var(--ind);
	}
	.headline-seg[data-tone='neutral'] {
		background: var(--ink-muted);
	}

	.meter-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.meter-row :global(.reporting) {
		flex: 1;
		min-width: 12rem;
	}

	.toggle {
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-pill);
		padding: 0.3125rem 0.75rem;
		font-size: var(--step--1);
		color: var(--ink-secondary);
		cursor: pointer;
		min-height: 2rem;
	}

	.toggle:hover {
		color: var(--ink);
		border-color: var(--ink-muted);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
	}

	.details[hidden] {
		display: none;
	}

	.detail-status {
		font-size: var(--step--1);
		color: var(--ink-muted);
	}

	.detail-status.error {
		color: var(--alert);
	}

	.methods h4 {
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-muted);
		margin-bottom: var(--space-2);
	}

	.methods ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.methods li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		font-size: var(--step--1);
		color: var(--ink-secondary);
	}

	.methods em {
		font-style: normal;
		color: var(--ink-muted);
		margin-left: var(--space-2);
	}

	.gap-note {
		font-size: var(--step--1);
		color: var(--ink-secondary);
	}

	.gap-note strong {
		color: var(--ink);
	}

	@media (max-width: 32rem) {
		.hero {
			padding: var(--space-4);
		}
		.title {
			font-size: var(--step-2);
		}
		.tile-pct {
			font-size: var(--step-3);
		}
	}
</style>
