<script lang="ts">
	import type { RankedCandidate } from '#lib/data/rank';
	import { formatNumber, formatPercent, partyTone } from '#lib/data/format';

	interface Props {
		candidate: RankedCandidate;
		/** Total votes in the race, used to size the bar. */
		totalVotes: number;
		/** Hide the bar for compact rows. */
		compact?: boolean;
	}

	let { candidate, totalVotes, compact = false }: Props = $props();

	const tone = $derived(partyTone(candidate.option.party));
	const barWidth = $derived(
		totalVotes > 0 ? Math.max((candidate.votes / totalVotes) * 100, candidate.votes > 0 ? 2 : 0) : 0
	);
</script>

<div class="row" class:compact class:leader={candidate.isLeader}>
	<div class="who">
		<span class="name">{candidate.name}</span>
		{#if candidate.isIncumbent}
			<span class="incumbent" title="Incumbent">inc.</span>
		{/if}
		{#if candidate.party}
			<span class="party" data-tone={tone}>{candidate.party}</span>
		{/if}
		{#if candidate.isTied}
			<span class="tied">tied</span>
		{/if}
	</div>

	<div class="figures tnum">
		<span class="pct">{formatPercent(candidate.share)}</span>
		<span class="votes">{formatNumber(candidate.votes)}</span>
	</div>

	{#if !compact}
		<div class="bar" aria-hidden="true">
			<span class="fill" data-tone={tone} style:width="{barWidth}%"></span>
		</div>
	{/if}
</div>

<style>
	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas:
			'who figures'
			'bar bar';
		gap: var(--space-1) var(--space-3);
		padding: var(--space-2) 0;
		position: relative;
		border-top: 1px solid var(--border);
	}

	/* Each row carries its own separator so sibling margins never collapse. */
	.row:first-child {
		border-top: 0;
	}

	.row.compact {
		grid-template-areas: 'who figures';
		padding: var(--space-1) 0;
	}

	.who {
		grid-area: who;
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.375rem;
		min-width: 0;
	}

	.name {
		font-weight: 500;
		letter-spacing: -0.005em;
	}

	.leader .name {
		font-weight: 660;
	}

	.party {
		font-size: 0.6875rem;
		font-weight: 620;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.party[data-tone='rep'] {
		color: var(--rep);
		background: var(--rep-wash);
	}
	.party[data-tone='dem'] {
		color: var(--dem);
		background: var(--dem-wash);
	}
	.party[data-tone='lib'] {
		color: var(--lib);
		background: var(--lib-wash);
	}
	.party[data-tone='grn'] {
		color: var(--grn);
		background: var(--grn-wash);
	}
	.party[data-tone='ind'] {
		color: var(--ind);
		background: var(--ind-wash);
	}
	.party[data-tone='neutral'] {
		color: var(--neutral);
		background: var(--neutral-wash);
	}

	.incumbent {
		font-size: 0.6875rem;
		color: var(--ink-muted);
		font-style: italic;
	}

	.tied {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--caution);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.figures {
		grid-area: figures;
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		justify-content: flex-end;
	}

	.pct {
		font-weight: 600;
		font-size: var(--step-0);
		min-width: 4.25ch;
		text-align: right;
	}

	.votes {
		font-size: var(--step--1);
		color: var(--ink-muted);
		min-width: 5ch;
		text-align: right;
	}

	.bar {
		grid-area: bar;
		height: 5px;
		background: var(--surface-sunken);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		border-radius: var(--radius-pill);
		transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.fill[data-tone='rep'] {
		background: var(--rep);
	}
	.fill[data-tone='dem'] {
		background: var(--dem);
	}
	.fill[data-tone='lib'] {
		background: var(--lib);
	}
	.fill[data-tone='grn'] {
		background: var(--grn);
	}
	.fill[data-tone='ind'] {
		background: var(--ind);
	}
	.fill[data-tone='neutral'] {
		background: var(--ink-muted);
	}

	@media (max-width: 30rem) {
		.figures {
			gap: var(--space-2);
		}
		.votes {
			min-width: 4ch;
		}
	}
</style>
