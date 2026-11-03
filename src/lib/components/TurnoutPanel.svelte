<script lang="ts">
	import { formatNumber, formatPercent } from '#lib/data/format';
	import type { PrecinctTurnout } from '#lib/data/types';

	interface Props {
		turnout: PrecinctTurnout[];
		/** Precinct names inside District 44, highlighted in the list. */
		districtPrecincts: string[];
	}

	let { turnout, districtPrecincts }: Props = $props();

	const totalRegistered = $derived(
		turnout.reduce((sum, precinct) => sum + (precinct.voterRegistration ?? 0), 0)
	);
	const totalCast = $derived(turnout.reduce((sum, precinct) => sum + (precinct.ballotsCast ?? 0), 0));
	const countyRate = $derived(totalRegistered > 0 ? totalCast / totalRegistered : 0);

	const sorted = $derived(
		[...turnout].sort((a, b) => (b.ballotsCast ?? 0) - (a.ballotsCast ?? 0))
	);

	const districtRows = $derived(
		sorted.filter((precinct) => districtPrecincts.includes(precinct.precinctName))
	);

	const maxCast = $derived(Math.max(1, ...sorted.map((p) => p.ballotsCast ?? 0)));

	let expanded = $state(false);
	const visible = $derived(expanded ? sorted : districtRows.length ? districtRows : sorted.slice(0, 6));
</script>

<section class="turnout" aria-labelledby="turnout-heading">
	<header>
		<div>
			<h2 id="turnout-heading">Turnout</h2>
			<p>Ballots cast by precinct, Cherokee County.</p>
		</div>
		<div class="county-rate tnum">
			<span class="rate-value">{formatPercent(countyRate)}</span>
			<span class="rate-label">
				{formatNumber(totalCast)} of {formatNumber(totalRegistered)} registered
			</span>
		</div>
	</header>

	<ul class="list">
		{#each visible as precinct (precinct.id)}
			{@const inDistrict = districtPrecincts.includes(precinct.precinctName)}
			{@const width = ((precinct.ballotsCast ?? 0) / maxCast) * 100}
			<li class="precinct" class:in-district={inDistrict}>
				<div class="row">
					<span class="name">
						{precinct.precinctName}
						{#if inDistrict}
							<span class="tag">Dist. 44</span>
						{/if}
					</span>
					<span class="figures tnum">
						<span class="cast">{formatNumber(precinct.ballotsCast)}</span>
						<span class="rate">
							{precinct.voterRegistration
								? formatPercent((precinct.ballotsCast ?? 0) / precinct.voterRegistration)
								: '—'}
						</span>
					</span>
				</div>
				<div class="bar" aria-hidden="true">
					<span class="fill" style:width="{width}%"></span>
				</div>
			</li>
		{/each}
	</ul>

	{#if sorted.length > visible.length || (expanded && sorted.length > districtRows.length)}
		<button type="button" class="more" onclick={() => (expanded = !expanded)}>
			{expanded ? 'Show district precincts only' : `Show all ${sorted.length} precincts`}
		</button>
	{/if}
</section>

<style>
	.turnout {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	h2 {
		font-size: var(--step-1);
	}

	header p {
		margin-top: var(--space-1);
		font-size: var(--step--1);
		color: var(--ink-muted);
	}

	.county-rate {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
	}

	.rate-value {
		font-size: var(--step-3);
		font-weight: 660;
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.rate-label {
		font-size: 0.75rem;
		color: var(--ink-muted);
		margin-top: 0.125rem;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		font-size: var(--step--1);
		margin-bottom: 0.1875rem;
	}

	.name {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--ink-secondary);
	}

	.in-district .name {
		color: var(--ink);
		font-weight: 560;
	}

	.tag {
		font-size: 0.625rem;
		font-weight: 620;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--accent);
		background: var(--accent-wash);
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
	}

	.figures {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-3);
	}

	.cast {
		font-weight: 560;
	}

	.rate {
		color: var(--ink-muted);
		min-width: 4.5ch;
		text-align: right;
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
		background: var(--border-strong);
		border-radius: var(--radius-pill);
		transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.in-district .fill {
		background: var(--accent);
	}

	.more {
		align-self: flex-start;
		background: none;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		padding: 0.3125rem 0.75rem;
		font-size: var(--step--1);
		color: var(--ink-secondary);
		cursor: pointer;
		min-height: 2rem;
	}

	.more:hover {
		color: var(--ink);
		border-color: var(--border-strong);
	}
</style>
