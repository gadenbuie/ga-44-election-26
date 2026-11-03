<script lang="ts">
	interface Props {
		reportingUnits: number;
		totalUnits: number;
		/** 0-1 */
		progress: number;
		voteTotal?: number;
		/** Label for the unit, plural. */
		unitLabel?: string;
		compact?: boolean;
	}

	let {
		reportingUnits,
		totalUnits,
		progress,
		voteTotal,
		unitLabel = 'precincts',
		compact = false
	}: Props = $props();

	const isComplete = $derived(totalUnits > 0 && reportingUnits >= totalUnits);
</script>

<div class="reporting" class:compact>
	<div class="meter" aria-hidden="true">
		<span class="fill" style:width="{Math.round(progress * 100)}%"></span>
	</div>
	<p class="label">
		{#if isComplete}
			<span class="done">All {totalUnits} {unitLabel} reporting</span>
		{:else if totalUnits > 0}
			<span class="count tnum">{reportingUnits}</span><span class="of">/</span>{totalUnits}
			{unitLabel} reporting
		{:else if voteTotal}
			Waiting on first {unitLabel}
		{:else}
			Polls closed · awaiting results
		{/if}
	</p>
</div>

<style>
	.reporting {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.meter {
		flex: 1;
		height: 3px;
		min-width: 3rem;
		background: var(--surface-sunken);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--ink-muted);
		border-radius: var(--radius-pill);
		transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.label {
		font-size: var(--step--1);
		color: var(--ink-muted);
		white-space: nowrap;
	}

	.done {
		color: var(--ink-secondary);
	}

	.count {
		color: var(--ink-secondary);
		font-weight: 600;
	}

	.of {
		margin: 0 0.1em;
	}

	.compact .label {
		font-size: 0.75rem;
	}
</style>
