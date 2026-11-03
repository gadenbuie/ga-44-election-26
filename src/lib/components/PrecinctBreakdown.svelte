<script lang="ts">
	import { localize, formatNumber, formatPercent, cleanCandidateName, partyTone } from '#lib/data/format';
	import type { BallotItemDetail, BreakdownResult } from '#lib/data/types';

	interface Props {
		detail: BallotItemDetail;
	}

	let { detail }: Props = $props();

	interface PrecinctRow {
		name: string;
		votes: number;
		reported: boolean;
		options: { name: string; votes: number; share: number; tone: string }[];
	}

	const rows = $derived<PrecinctRow[]>(
		(detail.breakdownResults ?? [])
			.map((item: BreakdownResult) => {
				const options = (item.ballotOptions ?? [])
					.map((option) => ({
						name: cleanCandidateName(localize(option.name)),
						votes: option.voteCount ?? 0,
						share: item.voteTotal > 0 ? (option.voteCount ?? 0) / item.voteTotal : 0,
						tone: partyTone(option.party)
					}))
					.sort((a, b) => b.votes - a.votes);
				return {
					name: localize(item.precinct.name) || 'Precinct',
					votes: item.voteTotal ?? 0,
					reported: item.precinct.reportingStatus === 1,
					options
				};
			})
			.sort((a, b) => b.votes - a.votes)
	);

	const reportedCount = $derived(rows.filter((row) => row.reported).length);
</script>

<section class="precincts" aria-labelledby="precinct-heading">
	<header>
		<h4 id="precinct-heading">Precinct results</h4>
		<span class="count tnum">{reportedCount} of {rows.length} reported</span>
	</header>

	<ul class="list">
		{#each rows as row (row.name)}
			<li class="precinct">
				<div class="precinct-name">
					<span>{row.name}</span>
					<span class="precinct-votes tnum">{formatNumber(row.votes)}</span>
				</div>
				<div class="precinct-bar" aria-hidden="true">
					{#each row.options as option (option.name)}
						<span
							class="seg"
							data-tone={option.tone}
							style:width="{option.share * 100}%"
							title="{option.name}: {formatNumber(option.votes)}"
						></span>
					{/each}
				</div>
				<div class="precinct-legend tnum">
					{#each row.options as option (option.name)}
						<span><em data-tone={option.tone}></em>{formatPercent(option.share)}</span>
					{/each}
				</div>
			</li>
		{/each}
	</ul>

	<p class="note">
		District 44 covers the Woodstock and Lickskillet precincts. Woodstock is larger, so most of
		the vote comes from there.
	</p>
</section>

<style>
	.precincts {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
	}

	h4 {
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.count {
		font-size: 0.75rem;
		color: var(--ink-muted);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.precinct-name {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		font-size: var(--step--1);
		font-weight: 520;
		margin-bottom: var(--space-1);
	}

	.precinct-votes {
		color: var(--ink-muted);
		font-weight: 400;
	}

	.precinct-bar {
		display: flex;
		height: 8px;
		border-radius: var(--radius-pill);
		overflow: hidden;
		background: var(--surface-sunken);
		gap: 1px;
	}

	.seg {
		display: block;
		height: 100%;
		transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.seg[data-tone='rep'] {
		background: var(--rep);
	}
	.seg[data-tone='dem'] {
		background: var(--dem);
	}
	.seg[data-tone='lib'] {
		background: var(--lib);
	}
	.seg[data-tone='grn'] {
		background: var(--grn);
	}
	.seg[data-tone='ind'] {
		background: var(--ind);
	}
	.seg[data-tone='neutral'] {
		background: var(--ink-muted);
	}

	.precinct-legend {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-1);
		font-size: 0.75rem;
		color: var(--ink-secondary);
	}

	.precinct-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.precinct-legend em {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 2px;
	}

	.precinct-legend em[data-tone='rep'] {
		background: var(--rep);
	}
	.precinct-legend em[data-tone='dem'] {
		background: var(--dem);
	}
	.precinct-legend em[data-tone='lib'] {
		background: var(--lib);
	}
	.precinct-legend em[data-tone='grn'] {
		background: var(--grn);
	}
	.precinct-legend em[data-tone='ind'] {
		background: var(--ind);
	}
	.precinct-legend em[data-tone='neutral'] {
		background: var(--ink-muted);
	}

	.note {
		font-size: 0.75rem;
		color: var(--ink-muted);
		max-width: var(--measure);
	}
</style>
