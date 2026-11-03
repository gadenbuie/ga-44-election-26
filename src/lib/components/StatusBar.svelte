<script lang="ts">
	import { relativeTime, formatClockTime } from '#lib/data/format';

	interface Props {
		/** Timestamp of the last successful fetch, in ms. */
		fetchedAt: number | null;
		/** `asOf` reported by the feed. */
		asOf: string | null;
		isRefreshing: boolean;
		error: string | null;
		failures: number;
		/** True when the numbers shown came from localStorage, not this visit. */
		isCached?: boolean;
		onRefresh: () => void;
	}

	let { fetchedAt, asOf, isRefreshing, error, failures, isCached = false, onRefresh }: Props =
		$props();

	// Recompute relative time on a slow tick so "2 min ago" stays honest.
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 15_000);
		return () => clearInterval(id);
	});

	const freshness = $derived(fetchedAt ? relativeTime(new Date(fetchedAt).toISOString(), now) : '');
	const feedTime = $derived(formatClockTime(asOf));
	const isStale = $derived(fetchedAt ? now - fetchedAt > 3 * 60_000 : false);
</script>

<div class="status" role="status" aria-live="polite">
	<span class="live" class:error={Boolean(error)} class:stale={isStale && !error}>
		<span class="pulse" aria-hidden="true"></span>
		{#if error}
			Disconnected
		{:else if isRefreshing}
			Updating
		{:else}
			Live
		{/if}
	</span>

	<p class="meta tnum">
		{#if error}
			Retrying{failures > 1 ? ` (attempt ${failures})` : ''} · checked {freshness}
		{:else if isCached && fetchedAt}
			Showing saved results from {freshness} · refreshing
		{:else if fetchedAt}
			{feedTime ? `Feed updated ${feedTime}` : 'Feed connected'} · checked {freshness}
		{:else}
			Connecting to results feed
		{/if}
	</p>

	<button type="button" class="refresh" onclick={onRefresh} disabled={isRefreshing}>
		<svg
			viewBox="0 0 16 16"
			width="14"
			height="14"
			aria-hidden="true"
			class:spin={isRefreshing}
		>
			<path
				d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5V5H11"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<span>Refresh</span>
	</button>
</div>

<style>
	.status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
		font-size: 0.75rem;
	}

	.live {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-weight: 640;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--positive);
	}

	.live.stale {
		color: var(--caution);
	}

	.live.error {
		color: var(--alert);
	}

	.pulse {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		animation: pulse 2.4s ease-in-out infinite;
	}

	.live.error .pulse {
		animation: none;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			box-shadow: 0 0 0 0 currentColor;
		}
		50% {
			opacity: 0.55;
			box-shadow: 0 0 0 3px transparent;
		}
	}

	.meta {
		color: var(--ink-muted);
		flex: 1;
		min-width: 8rem;
	}

	.refresh {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		background: none;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		color: var(--ink-secondary);
		cursor: pointer;
		min-height: 1.75rem;
	}

	.refresh:hover:not(:disabled) {
		color: var(--ink);
		border-color: var(--border-strong);
	}

	.refresh:disabled {
		opacity: 0.55;
		cursor: progress;
	}

	.spin {
		animation: spin 900ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
