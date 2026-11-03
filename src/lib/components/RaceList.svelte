<script lang="ts">
	import RaceCard from './RaceCard.svelte';
	import type { ResolvedBallotEntry } from '#lib/data/ballot';

	interface Props {
		entries: ResolvedBallotEntry[];
		title: string;
		description?: string;
		/** County name, used to label each card's county geography. */
		countyName: string;
	}

	let { entries, title, description, countyName }: Props = $props();
</script>

<section class="race-list" aria-labelledby={`section-${title.replace(/\W+/g, '-').toLowerCase()}`}>
	<header>
		<h2 id={`section-${title.replace(/\W+/g, '-').toLowerCase()}`}>{title}</h2>
		{#if description}
			<p>{description}</p>
		{/if}
	</header>

	<div class="grid">
		{#each entries as entry (entry.key)}
			<RaceCard {entry} {countyName} />
		{/each}
	</div>
</section>

<style>
	.race-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	header h2 {
		font-size: var(--step-1);
		letter-spacing: -0.008em;
	}

	header p {
		margin-top: var(--space-1);
		font-size: var(--step--1);
		color: var(--ink-muted);
		max-width: var(--measure);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	@media (min-width: 46rem) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
