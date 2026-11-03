<script lang="ts">
	import type { ResultScope, ScopeOption } from '#lib/data/ballot';

	interface Props {
		/** Geographies this contest can be read in, in display order. */
		options: ScopeOption[];
		/** Currently shown geography. */
		value: ResultScope;
		onSelect: (scope: ResultScope) => void;
		/** Distinguishes the radio group from others on the page. */
		entryKey: string;
	}

	let { options, value, onSelect, entryKey }: Props = $props();

	const groupId = $derived(`scope-${entryKey}`);
</script>

{#if options.length > 1}
	<div class="scope">
		<span class="sr-only" id={`${groupId}-label`}>Results shown for</span>
		<div class="pill" role="radiogroup" aria-labelledby={`${groupId}-label`}>
			{#each options as option (option.scope)}
				<button
					type="button"
					role="radio"
					aria-checked={value === option.scope}
					class:active={value === option.scope}
					onclick={() => onSelect(option.scope)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.scope {
		display: flex;
		align-items: center;
	}

	.pill {
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
		color: var(--ink-muted);
		font: inherit;
		font-size: 0.6875rem;
		font-weight: 620;
		letter-spacing: 0.02em;
		padding: 0.1875rem 0.5625rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		min-height: 1.625rem;
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
		box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
	}

	button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
</style>
