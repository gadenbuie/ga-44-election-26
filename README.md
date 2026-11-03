# Election monitor — Cherokee County, Georgia

A small static site that reads the public Enhanced Voting results API and shows
unofficial returns for the November 3, 2026 general election, focused on the
races on one Woodstock ballot: **State House District 44** at the top, then the
rest of the state and county races, ballot questions, and turnout.

Built with SvelteKit + Svelte 5 (runes) and `@sveltejs/adapter-static`.

## Running it

```sh
npm install
npm run dev      # opens http://localhost:5173
```

Other scripts:

| Command | What it does |
|:---|:---|
| `npm run dev` | Dev server with hot reload, opens a browser |
| `npm run dev:host` | Same, but bound to the network so a phone can load it |
| `npm run build` | Static production build into `build/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Type-check with `svelte-check` |

Live results refresh on their own. The poller re-fetches every 45 seconds while
the tab is visible, pauses in a background tab, and backs off when the feed
errors. There is also a Refresh button in the header.

## Where the numbers come from

The URL originally used for this project,
`.../cdn/results/Georgia/export-11032026GeneralAndSpecialElection.json`, is a
**46 MB** blob with no CORS headers and no county-scoped variant. It cannot be
read from a browser and is far too heavy for a phone, so this app does not use it.

Instead it uses the small JSON API that the official results page itself calls:

| Endpoint | Size | Purpose |
|:---|:---|:---|
| `/results/public/api/elections/cherokee-county-ga/{slug}/ballot-items/` | 99 kB | Every race on the ballot, incl. county races |
| `/results/public/api/elections/Georgia/{slug}/ballot-items/` | 616 kB | Statewide totals, loaded only for the Statewide tab |
| `/results/public/api/elections/cherokee-county-ga/{slug}/turnout/` | 6 kB | Ballots cast and registration by precinct |
| `/results/public/api/elections/cherokee-county-ga/{slug}/ballot-items/{id}/` | 7 kB | Precinct-level breakdown for one contest |

Every path ends in a slash. That is deliberate; see below.

Cherokee's feed alone carries the whole ballot, so first paint depends on 99 kB
(under 4 kB compressed by the CDN), not 616 kB. The statewide feed is fetched
lazily from `poller.ensureState()` when that tab is first opened.

### The CORS lottery, and why the trailing slash matters

The CDN in front of this API caches `Access-Control-Allow-Origin` **as part of
the cached response**. Some share of origin responses come back without that
header, and the header-less copy is then served to every browser for the life of
the entry (`cache-control: max-age=60`). A browser sees a `200` with no CORS
header and reports `TypeError: Failed to fetch`.

Measured from outside, that makes any one URL either reliably fine or reliably
broken for stretches of minutes at a time, then change. Two things follow:

- **Query strings cannot rescue it.** `?cachebust=<uuid>` and `?v=<minute>`
  resolve to the same cached object, so they behave exactly like the bare URL.
  Only the *path* is part of the cache key.
- **Path spelling is a second lottery ticket.** `/ballot-items` and
  `/ballot-items/` are separate cache objects with independent luck. In an
  interleaved 30-round trial the un-slashed statewide feed answered with CORS
  about 30% of the time while the slashed spelling answered 100% of the time, and
  in earlier rounds the ordering reversed. Neither spelling is inherently good;
  what matters is that they fail independently.

So `config.ts` emits trailing slashes, and `getJson()` in `src/lib/data/api.ts`
takes both spellings of a resource and switches to the other one on each retry.
The spelling that last answered is remembered per path and tried first, so the
steady state is still one request. If a load still fails after all retries you
will see a brief "The results server refused this request" message; it clears on
its own once the CDN expires the bad copy.

One more detail worth keeping: the summary endpoint
`/elections/{jurisdiction}/{slug}` is still unused, but not for CORS reasons. It
only duplicates `reportingStatus` that every contest already carries, so
`latestAsOf()` derives the freshness label without a second request.

## Layout

```
src/
  routes/
    +layout.svelte        imports design tokens
    +page.svelte          all four tabs and the layout
  lib/
    data/
      config.ts           API origin, election slug, URL builders
      types.ts            wire types for the API payloads
      api.ts              fetch + retry, county/state snapshots
      poller.svelte.ts    polling loop, backoff, visibility handling
      ballot.ts           the 15 contests on this ballot, in order
      rank.ts             sorting, shares, margins, ballot-question detection
      format.ts           number, percent, time, party helpers
    components/           RaceCard, FeaturedRace, CandidateRow, TurnoutPanel, ...
    styles/tokens.css     light/dark colour and type tokens
```

`ballot.ts` is the file to edit if the ballot changes: each entry carries a
`contestName` that must match the feed, plus an `expect` list of candidate names
used as a tripwire so a reshuffled feed shows up as a "missing" card instead of
silently wrong numbers.

## District 44 spans two counties

This is the one thing that will make the numbers look wrong if you don't know it.
State House District 44 covers **2 Cherokee precincts** (Woodstock, Lickskillet)
and **11 Cobb precincts** (Addison 01, Bells Ferry 02/03, Blackwell 01,
Elizabeth 03/05, Gritters 01, Kell 01, Lassiter 01, McCleskey 01,
Nicholson 01) — 13 in all.

Each county publishes only its own copy of the race, and the statewide feed
inherits Cherokee's copy (it reports 2 units, not 13). So the app loads **both**
county feeds and sums the HD44 vote counts and reporting units across them.

That summing lives in `src/lib/data/merge.ts`. `publishedBy` on each `BALLOT`
entry lists which counties publish a contest: county races list one county, and
split districts list both. It is explicit rather than inferred, because a wrong
guess shows up as a plausible percentage rather than an obvious error.

## Statewide vs county numbers

Each card carries a small toggle when a contest is reported in more than one
geography: statewide offices (Governor, U.S. Senate, the constitutional
amendments) are counted both across Georgia and inside the county, so both are
one tap away. Statewide contests open on **Georgia** numbers, since that is the
count that decides the office; district and county races have no toggle.

The statewide option only appears when it covers more ground. District 44 is
published statewide as a two-precinct partial copy, so offering that as
"statewide" would be a downgrade rather than an alternative.

## Cached results

Both feeds are cached in `localStorage` under `election-monitor:cache:*`, so a
reload paints the last known numbers immediately and refreshes over them. The
status bar says **Cached — showing results from N minutes ago** until a live read
succeeds, so saved numbers are never presented as current. Entries carry a schema
version; bumping `SCHEMA_VERSION` in `cache.ts` invalidates old shapes, and an
entry over 1.5 MB is skipped rather than risking a quota error.

## Switching counties

The county control under the masthead switches between Cherokee and Cobb. The
choice is stored in `localStorage` under `election-monitor:county`, so the page
reopens on whichever county you last looked at.

Adding a third county takes two things: an entry in `COUNTIES`
(`src/lib/data/config.ts`) and a `CountyBallot` in `ballot-counties.ts` listing
which contests are on that county's ballot. Everything else — fetching, merging,
ranking, formatting, components — is county-agnostic.

`npm run dev` — the app retries past the CDN's intermittent CORS failures.

## Notes

- Data is unofficial until the county certifies it.
- No backend: the API is CORS-enabled, so the static build talks to it directly.
- District 44 covers the **Woodstock** and **Lickskillet** precincts. Woodstock
  is much larger (8,435 registered voters vs 7,809), so it dominates the count.
