<script lang="ts">
	interface Tab {
		id: string;
		label: string;
		count?: number;
	}

	interface Props {
		tabs: Tab[];
		active: string;
		onSelect: (id: string) => void;
	}

	let { tabs, active, onSelect }: Props = $props();
</script>

<nav class="tabs" aria-label="Sections">
	<div class="scroller" role="tablist">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				id={`tab-${tab.id}`}
				aria-selected={active === tab.id}
				aria-controls={`panel-${tab.id}`}
				tabindex={active === tab.id ? 0 : -1}
				class:active={active === tab.id}
				onclick={() => onSelect(tab.id)}
			>
				{tab.label}
				{#if tab.count != null && tab.count > 0}
					<span class="count tnum">{tab.count}</span>
				{/if}
			</button>
		{/each}
	</div>
</nav>

<style>
	.tabs {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--page) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
		/* Full-bleed within the padded shell, without widening the page. */
		margin-inline: calc(var(--shell-pad, var(--space-4)) * -1);
		padding-inline: var(--shell-pad, var(--space-4));
		max-width: 100vw;
	}

	.scroller {
		display: flex;
		gap: var(--space-1);
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
		max-width: var(--content-max);
		margin-inline: auto;
		/* Never let the tab strip widen the page itself. */
		min-width: 0;
	}

	.scroller::-webkit-scrollbar {
		display: none;
	}

	button {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: none;
		border: 0;
		border-bottom: 2px solid transparent;
		padding: var(--space-3) var(--space-2);
		font-size: var(--step--1);
		font-weight: 520;
		color: var(--ink-muted);
		cursor: pointer;
		white-space: nowrap;
		min-height: 2.75rem;
	}

	button:hover {
		color: var(--ink-secondary);
	}

	button.active {
		color: var(--ink);
		font-weight: 620;
		border-bottom-color: var(--accent);
	}

	.count {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--ink-muted);
		background: var(--surface-sunken);
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-pill);
	}

	button.active .count {
		color: var(--accent);
		background: var(--accent-wash);
	}
</style>
