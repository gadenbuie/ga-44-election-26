<script lang="ts">
	import { COUNTIES, type CountyKey } from '#lib/data/config';

	interface Props {
		/** Currently selected county. */
		value: CountyKey;
		/** Called when the reader picks a different county. */
		onSelect: (county: CountyKey) => void;
	}

	let { value, onSelect }: Props = $props();

	const options = Object.entries(COUNTIES) as [CountyKey, (typeof COUNTIES)[CountyKey]][];
</script>

<div class="switcher">
	<span class="label" id="county-label">County</span>
	<div class="choices" role="radiogroup" aria-labelledby="county-label">
		{#each options as [key, county] (key)}
			<button
				type="button"
				role="radio"
				aria-checked={value === key}
				class:active={value === key}
				onclick={() => onSelect(key)}
			>
				{county.name}
			</button>
		{/each}
	</div>
</div>

<style>
	.switcher {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.label {
		font-size: 0.6875rem;
		font-weight: 640;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}

	.choices {
		display: inline-flex;
		background: var(--surface-sunken);
		border-radius: var(--radius-pill);
		padding: 2px;
		gap: 2px;
	}

	button {
		appearance: none;
		border: 0;
		background: none;
		color: var(--ink-secondary);
		font: inherit;
		font-size: var(--step--1);
		font-weight: 520;
		padding: 0.3125rem 0.75rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		min-height: 2rem;
		transition:
			background 160ms ease,
			color 160ms ease;
	}

	button:hover {
		color: var(--ink);
	}

	button.active {
		background: var(--surface);
		color: var(--ink);
		box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
	}

	button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
</style>
