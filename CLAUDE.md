# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A public game scoreboard: a table of games × players showing wins, plus a "Trends" line chart of cumulative wins over time. Anyone can read; only admins can edit. React 18 (Create React App via react-scripts 5 + CRACO), react-bootstrap 5, Recharts, and an AWS Amplify Gen 1 backend (AppSync GraphQL + DynamoDB + Cognito).

## Commands

```
npm start                     # dev server (craco start)
npm run build                 # production build
npm test                      # Jest in watch mode
npm test -- --watchAll=false  # run once (use this non-interactively)
npm test -- trends            # run a single test file by name pattern
npm test -- -t "name"         # run tests matching a test name
```

Node 20 (`.nvmrc`). Linting is CRA's built-in ESLint (`react-app` config), surfaced during start/build — there is no separate lint script.

Use `craco`, never plain `react-scripts`: `craco.config.js` disables webpack 5's `fullySpecified` ESM resolution, which `@aws-amplify/ui-react` v6 dependencies need to build.

### Amplify backend

- New machine: `npm install`, then `amplify pull` to connect to the existing backend. **Never `amplify init`** — it creates a new backend.
- Backend changes (schema, auth, resolvers) are edited under `amplify/backend/` and deployed with `amplify push`, which changes the live AWS environment — only run it when the user asks.
- `src/aws-exports.js` and `src/amplifyconfiguration.json` are generated and gitignored.
- `ENOENT … amplify-codegen-temp` errors after a successful `amplify push` are harmless (codegen for DataStore models, which this app doesn't use).
- If a push fails with `S3 object does not exist … amplify-appsync-files/<hash>/stacks/<Model>.json`, check `amplify/.config/local-env-info.json`: a `projectPath` from another machine makes the CLI rebuild the root stack from stale cloud state, pointing at an old deployment folder. Set it to this checkout's path and push again.

## Architecture

**Data model** (`amplify/backend/api/reactapp/schema.graphql` — read its comments, they document the design decisions):
- `Player` (initials) and `Game` (name) are the roster.
- `GameScore` is one cell per (game, player) with the current total. Adding a player or game fans out a `GameScore` row at 0 for every pairing; deleting one deletes its related cells client-side. `score` is `Float` on purpose (draws give half points) — don't change it to `Int`.
- `ScoreEvent` is an append-only history ledger: one row per +/- click (plus migration baseline rows), with denormalized `playerInitials`/`gameName` so history survives renames/deletes, `recordedBy` for attribution, and `voided` for soft deletes. Never hard-delete or mutate events — void them (and prefer void + re-add over editing). Summing non-voided deltas reconciles to the `GameScore` totals.
- `incrementScore(id, delta)` is a custom AppSync mutation backed by VTL resolvers in `amplify/backend/api/reactapp/resolvers/` that does an atomic DynamoDB `ADD`, avoiding read-modify-write races.

**Auth:** the API's default mode is API key. Every model allows public `read` via `apiKey` and full access to the Cognito `admin` group; `incrementScore` is restricted to `admin` via `@aws_cognito_user_pools`. Client reads pass `authMode: 'apiKey'`, writes pass `authMode: 'userPool'`. The backend is the real security boundary; the UI's `isAdmin` (a `cognito:groups` check from `fetchAuthSession()` in `src/App.js`) only controls what's shown. The Cognito identity pool is intentionally stripped from the runtime config in `src/api.js` (unauthenticated access is disabled and would otherwise cause 400s).

- `Player.core` marks the regulars shown on the main table; `Player.hidden` marks the test player (TEST), never shown publicly.
- `Play` records one game: who played, who won. It `counted` on the main table only if every core player played and no hidden player did; then each core winner gets an equal share of 1 win via `incrementScore` + ScoreEvents with `playId` (and `occurredAt` = played date, which Trends uses). Non-counted plays still feed the All games view. Played column = `Game.baselinePlays` (pre-Play estimate) + counted plays. Rules live in `src/plays.js`.

**Client layers:**
- `src/api.js` — configures Amplify once and exports the shared `client` plus `fetchAllPages` (paginates list queries with the API key; rows can exceed the 100-item default).
- `src/useScoreboard.js` — owns board state (games, players, gameScores) and all admin mutations, with optimistic updates and rollback on failure. `increment` calls `incrementScore`, then writes a `ScoreEvent` fire-and-forget (a failed event is logged, not rolled back).
- `src/App.js` — view layer: header/sign-in toggle, Table|Trends switch, admin panel, delete-confirmation modal, input validation. Sorts player columns by total wins.
- `src/TrendsChart.js` loads `ScoreEvent`s lazily (only on the Trends view); the pure transform lives in `src/trends.js` so it's unit-tested without rendering Recharts.

**Navigation:** hash routing in `src/route.js` — `#/game/<slug>` (slug from the game name) renders `GamePage`; anything else is the board. No router library; hash URLs need no Amplify rewrite rules. `Game.bggId`/`imageUrl` hold BoardGameGeek link + box art (images hot-linked from cf.geekdo-images.com; thumbnails hide themselves on load errors).

**GraphQL documents:** the app imports hand-written queries/mutations from `src/graphql/customQueries.js` and `customMutations.js`. `queries.js`, `mutations.js`, `subscriptions.js` and `schema.json` are generated by `amplify codegen` and would overwrite hand edits — put new operations in the `custom*` files.

`scripts/migrate-to-players.mjs` (`npm run migrate`) is a one-time, already-run migration from the old `Score` model; dry-run by default, `--commit` writes directly to DynamoDB.

## Conventions

- Commit directly to `master` with a concise one-line message.
- ScoreEvent rows with `recordedBy: "backfill"` are synthetic history (random dates before 2026-06-23); don't treat their dates as real.
