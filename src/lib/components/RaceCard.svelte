<script lang="ts">
	import CandidateRow from './CandidateRow.svelte';
	import ReportingMeter from './ReportingMeter.svelte';
	import { rankContest, methodTotals, isUncontested, isBallotQuestion } from '#lib/data/rank';
	import { formatMargin, formatNumber, formatPercent, formatPercentPrecise } from '#lib/data/format';
	import type { BallotItem } from '#lib/data/types';
	import ScopeToggle from './ScopeToggle.svelte';
	import {
		scopeOptions,
		defaultScope,
		type ResolvedBallotEntry,
		type ResultScope
	} from '#lib/data/ballot';

	interface Props {
		entry: ResolvedBallotEntry;
		/** County name, used to label the county geography. */
		countyName: string;
		/** Render larger with the margin headline. */
		featured?: boolean;
	}

	let { entry, countyName, featured = false }: Props = $props();

	// Older polls may leave the statewide copy null; the toggle hides itself then.
	const options = $derived(scopeOptions(entry, countyName));
	let scope = $state<ResultScope | null>(null);

	// Open on statewide for statewide offices, county for local races.
	const resolvedScope = $derived(scope ?? defaultScope(options));
	const contest = $derived(
		options.find((option) => option.scope === resolvedScope)?.contest ?? null
	);

	const standing = $derived(rankContest(contest));
	const methods = $derived(methodTotals(contest));
	const uncontested = $derived(isUncontested(contest));
	const question = $derived(isBallotQuestion(contest));

	// Only show the leader-vs-runner-up headline once votes actually exist.
	const showMargin = $derived(
		!question && !uncontested && standing.totalVotes > 0 && standing.leader && standing.runnerUp
	);
	const marginLabel = $derived(
		standing.isTied ? 'Tied' : formatMargin(standing.margin)
	);

	let detailsOpen = $state(false);
	const detailsId = $derived(`details-${entry.key}`);
</script>

<article class="card" class:featured class:missing={entry.missing}>
	<header>
		<div class="heading">
			<h3 class="label">{entry.label}</h3>
			<ScopeToggle
				{options}
				value={resolvedScope}
				onSelect={(next) => (scope = next)}
				entryKey={entry.key}
			/>
			{#if standing.isComplete}
				<span class="chip complete">Complete</span>
			{:else if standing.awaitingUnits}
				<span class="chip pending">Finalizing</span>
			{/if}
		</div>
		<p class="blurb">{entry.blurb}</p>
	</header>

	{#if entry.missing}
		<p class="empty">
			This contest is not in the results feed yet. It may publish once counting begins.
		</p>
	{:else if !standing.ranked.length}
		<p class="empty">No results reported yet.</p>
	{:else}
		{#if showMargin}
			<p class="margin">
				<span class="margin-name">{standing.leader?.name}</span>
				{#if standing.isTied}
					tied with <span class="margin-name">{standing.runnerUp?.name}</span>
				{:else}
					leads <span class="margin-name">{standing.runnerUp?.name}</span>
					by <strong class="tnum">{marginLabel}</strong>
				{/if}
			</p>
		{:else if uncontested}
			<p class="margin"><span class="margin-name">{standing.leader?.name}</span> is unopposed</p>
		{:else if standing.totalVotes === 0}
			<p class="margin awaiting">Awaiting the first votes from this race.</p>
		{/if}

		<div class="candidates">
			{#each standing.ranked as candidate (candidate.option.id)}
				<CandidateRow {candidate} totalVotes={standing.totalVotes} />
			{/each}
		</div>

		<ReportingMeter
			reportingUnits={standing.reportingUnits}
			totalUnits={standing.totalUnits}
			progress={standing.reportProgress}
			voteTotal={standing.totalVotes}
		/>

		<button
			type="button"
			class="disclosure"
			aria-expanded={detailsOpen}
			aria-controls={detailsId}
			onclick={() => (detailsOpen = !detailsOpen)}
		>
			<span>Race details</span>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" class:open={detailsOpen}>
				<path
					d="M4 6l4 4 4-4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>

		<div id={detailsId} class="details" hidden={!detailsOpen}>
			{#if methods.length}
				<div class="detail-block">
					<h4>Votes by method</h4>
					<dl class="method-list">
						{#each methods as method (method.label)}
							<div class="method">
								<dt>{method.label}</dt>
								<dd class="tnum">
									{formatNumber(method.votes)}
									{#if standing.totalVotes > 0}
										<span class="method-share">
											{formatPercent(method.votes / standing.totalVotes)}
										</span>
									{/if}
								</dd>
							</div>
						{/each}
					</dl>
				</div>
			{/if}

			<div class="detail-block">
				<h4>Totals</h4>
				<dl class="stat-list">
					<div class="stat">
						<dt>Votes cast in race</dt>
						<dd class="tnum">{formatNumber(standing.totalVotes)}</dd>
					</div>
					{#if showMargin && !standing.isTied}
						<div class="stat">
							<dt>Gap to second</dt>
							<dd class="tnum">
								{formatNumber((standing.leader?.votes ?? 0) - (standing.runnerUp?.votes ?? 0))}
								votes · {formatPercentPrecise(standing.margin)}
							</dd>
						</div>
					{/if}
					<div class="stat">
						<dt>Reporting units</dt>
						<dd class="tnum">
							{standing.reportingUnits} of {standing.totalUnits || '—'}
						</dd>
					</div>
					{#if contest?.underVoteCount != null}
						<div class="stat">
							<dt>Undervotes</dt>
							<dd class="tnum">{formatNumber(contest.underVoteCount)}</dd>
						</div>
					{/if}
					{#if contest?.overVoteCount != null}
						<div class="stat">
							<dt>Overvotes</dt>
							<dd class="tnum">{formatNumber(contest.overVoteCount)}</dd>
						</div>
					{/if}
				</dl>
			</div>
		</div>
	{/if}
</article>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.card.featured {
		padding: var(--space-5);
		border-color: var(--border-strong);
		box-shadow: var(--shadow);
	}

	.card.missing {
		border-style: dashed;
		box-shadow: none;
	}

	.heading {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.label {
		font-size: var(--step-1);
	}

	.featured .label {
		font-size: var(--step-2);
	}

	.blurb {
		margin-top: var(--space-1);
		font-size: var(--step--1);
		color: var(--ink-muted);
		max-width: var(--measure);
	}

	.chip {
		font-size: 0.6875rem;
		font-weight: 620;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		padding: 0.0625rem 0.4375rem;
		border-radius: var(--radius-pill);
	}

	.chip.complete {
		color: var(--positive);
		background: var(--grn-wash);
	}

	.chip.pending {
		color: var(--caution);
		background: var(--lib-wash);
	}

	.margin {
		font-size: var(--step-0);
		color: var(--ink-secondary);
		padding-bottom: var(--space-1);
	}

	.featured .margin {
		font-size: var(--step-1);
	}

	.margin.awaiting {
		color: var(--ink-muted);
		font-style: italic;
	}

	.margin-name {
		color: var(--ink);
		font-weight: 560;
	}

	.margin strong {
		color: var(--ink);
		font-weight: 640;
	}

	.candidates {
		display: flex;
		flex-direction: column;
	}

	.empty {
		font-size: var(--step--1);
		color: var(--ink-muted);
		padding: var(--space-2) 0;
	}

	.disclosure {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2) 0;
		background: none;
		border: 0;
		border-top: 1px solid var(--border);
		color: var(--ink-muted);
		font-size: var(--step--1);
		cursor: pointer;
		text-align: left;
	}

	.disclosure:hover {
		color: var(--ink);
	}

	.disclosure svg {
		transition: transform 160ms ease;
		flex-shrink: 0;
	}

	.disclosure svg.open {
		transform: rotate(180deg);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-1);
	}

	.details[hidden] {
		display: none;
	}

	.detail-block h4 {
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-muted);
		margin-bottom: var(--space-2);
	}

	.method-list,
	.stat-list {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.method,
	.stat {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		font-size: var(--step--1);
	}

	.method dt,
	.stat dt {
		color: var(--ink-secondary);
	}

	.method dd,
	.stat dd {
		margin: 0;
		color: var(--ink);
	}

	.method-share {
		color: var(--ink-muted);
		margin-left: var(--space-2);
	}

	.stat dd {
		font-weight: 560;
		text-align: right;
	}
</style>
