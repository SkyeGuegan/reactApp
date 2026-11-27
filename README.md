# The Scoreboard

A win tally for our game nights: who has won which game, overall totals, and how the race has changed over time.

**Live site:** https://master.d1uiq2n8l3hr2t.amplifyapp.com/

![The Scoreboard](pictures/scoreboard.png)

## Features

Every view has its own address (hash links), so Back, refresh and sharing a link all work.

- **Scoreboard** (`#/`): the main table: wins per game for each regular, a Played column and a Totals row. The overall leader gets a crown; the best score in each game is bold; shared wins give half points.
- **Players** (`#/players`): everyone's played / wins / win rate, either **All time** (games from before individual recording count as games between the regulars, since only the winner was kept) or **All recorded** (individually recorded games, guests included).
- **Player pages** (`#/player/sg`): a player's record in every game (sortable), best and most-played games, win streaks, head-to-head against everyone they've played, and their recorded games with where they finished.
- **Game pages** (`#/game/terra-mystica`): box art and links (BoardGameGeek, plus guides for some games), at-a-glance numbers, a player-count filter, standings (main scoreboard or all recorded games), sortable stats per choice (e.g. faction win rates, average place, points against the table average, best score, online win rates for Terra Mystica), setups (e.g. Catan expansions), records (biggest win, closest game), head-to-head, win streaks, wins and winning score over time, and recent games.
- **Scoring details** (optional, per game): e.g. Catan victory points and expansions, Terra Mystica faction + points with colour-coded factions (one player per colour). The winner defaults to the best score. Admins choose the fields under Scoring details.
- **Game log** (`#/log`): every recorded game, newest first, including ones with guests or where a regular was missing (marked *not on scoreboard*), with each player's faction and score when noted.
- **Trends** (`#/trends`): each player's cumulative wins over time. Corrections (a win added then removed) don't show as dips.
- **Pick a game** (`#/pick`): a wheel that picks a random game from the ones you tick (plus any typed in). Optional "favour games we haven't played lately" makes long-unplayed games come up more; slice sizes show the odds.
- **Box art**: each game shows its BoardGameGeek cover.

### Main scoreboard, all recorded, all time

- **Main scoreboard**: games where every regular played. These change the main table.
- **All recorded**: every game recorded individually, including guests and games where a regular was missing.
- **All time**: both together, counting the pre-recording history as games between the regulars.

### Admins

Signed-in members of the Cognito `admin` group only:

- **＋ Record a game** (in the header on every page): pick the game, date, who played and who won (shared wins split evenly), plus any scoring details. A game counts on the main scoreboard only when all three regulars played. Guests are saved as players but never get a column on the main table. A hidden TEST player lets you try things on the live site without affecting anything.
- **Void** a recorded game from the Game log; the record is kept, marked voided.
- **Manage** (`#/manage`): add games and players (with admin-only full names), edit the roster, set box art and scoring details, and **Corrections**: edit totals directly with −/+ (for fixing mistakes; recording a game is the normal way to add a win), with the full score-change history below, where any change can be voided.
- Scores can never go below 0 (enforced by the server, not just the UI).

Anyone can view the board. Only admins can change it, and the backend enforces that on every write.

## Stack

- React 18, react-bootstrap 5, Recharts, built with Create React App (react-scripts 5) + CRACO
- AWS Amplify Gen 1: AppSync GraphQL API, DynamoDB, Cognito user pool (region `us-west-2`)
- Hosting: Amplify Hosting, built from `master`

## Data model

Defined in `amplify/backend/api/reactapp/schema.graphql`:

| Model | What it is |
|---|---|
| `Player` | A player's initials (and an admin-only full name); regulars get a column on the main table |
| `Game` | A game on the board |
| `GameScore` | One player's current score in one game (a table cell) |
| `Play` | One recorded game: who played, who won, optional scoring details, and whether it counts on the main scoreboard |
| `ScoreEvent` | Append-only history: one row per score change. Rows are voided, never deleted. Powers Trends and the admin history. |

Score changes go through a custom `incrementScore` mutation that updates the cell atomically on the server and refuses to go below 0.

## Development

Requires Node 20 (see `.nvmrc`).

```
npm install
npm start                      # http://localhost:3000
npm test -- --watchAll=false   # run the tests once
npm run build                  # production build
```

The app reads its backend settings from `src/aws-exports.js`, which is generated and not committed. On a new machine:

```
npm install -g @aws-amplify/cli
amplify configure              # region us-west-2, profile "default"
amplify pull --appId d1uiq2n8l3hr2t --envName dev   # connect to the existing backend
```

Never run `amplify init`: it creates a brand-new backend. Backend changes are deployed with `amplify push`.

`amplify pull` also recreates `amplify/team-provider-info.json` (environment details such as the AWS account ID), which is kept out of the repo.

## Ideas

- MFA for admin sign-in
- Move from Create React App to Vite
