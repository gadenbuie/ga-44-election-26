<script lang="ts">
	import { formatNumber, formatPercent } from '#lib/data/format';

	interface Props {
		methods: { label: string; votes: number }[];
		totalVotes: number;
	}

	let { methods, totalVotes }: Props = $props();

	const visible = $derived(methods.filter((m) => m.votes > 0));
	const maxVotes = $derived(Math.max(1, ...methods.map((m) => m.votes)));
</script>

{#if visible.length}
	<div class="methods">
		<ul>
			{#each methods as method (method.label)}
				<li class:empty={method.votes === 0}>
					<div class="row">
						<span class="label">{method.label}</span>
						<span class="value tnum">
							{formatNumber(method.votes)}
							{#if totalVotes > 0}
								<em>{formatPercent(method.votes / totalVotes)}</em>
							{/if}
						</span>
					</div>
					<div class="bar" aria-hidden="true">
						<span class="fill" style:width="{(method.votes / maxVotes) * 100}%"></span>
					</div>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.methods ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	li.empty {
		opacity: 0.55;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		font-size: var(--step--1);
		margin-bottom: 0.1875rem;
	}

	.label {
		color: var(--ink-secondary);
	}

	.value {
		font-weight: 520;
	}

	em {
		font-style: normal;
		color: var(--ink-muted);
		margin-left: var(--space-2);
	}

	.bar {
		height: 4px;
		background: var(--surface-sunken);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--ink-muted);
		border-radius: var(--radius-pill);
		transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
	}
</style>
