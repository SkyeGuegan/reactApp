# The Scoreboard

A win tally for our game nights: who has won which game, overall totals, and how the race has changed over time.

**Live site:** https://master.d1uiq2n8l3hr2t.amplifyapp.com/

![The Scoreboard](pictures/scoreboard.png)

## Features

- **Table**: wins per game and player, with a Totals row. The overall leader gets a crown and gold total; the best score in each game is bold. Scores can include half points (from shared wins).
- **Game pages**: click a game for its own page (e.g. `#/game/settlers-of-catan`): box art, a BoardGameGeek link, standings with win rates, wins over time, and recent games.
- **Scoring details** (optional, per game): e.g. Catan victory points, Terra Mystica faction + points. Game pages then show best and average winning scores and faction win rates. Admins choose the fields under Scoring details.
- **All time vs Recorded**: All games → Everyone counts games from before individual recording as games between the three regulars.
- **Pick a game**: a wheel that picks a random game from the ones you tick (plus any typed in). Optional "favour games we haven't played lately" makes long-unplayed games come up more; slice sizes show the odds.
- **Box art**: each game shows its BoardGameGeek cover (admins set or change it under Manage → Roster → Set artwork, or on the game's page).
- **Trends**: each player's cumulative wins over time. Corrections (a win added then removed) don't show as dips.
- **Played**: a column on the right counting how often each game has been played with all three regulars; the Totals row has the overall count.
- **All games**: every recorded game, including ones with guests or where someone was missing, plus everyone's played / wins / win rate.
- **Admin editing** (signed-in members of the Cognito `admin` group only):
  - **Record a game**: pick the game, date, who played and who won (shared wins split evenly). A game counts on the main table only when Skye, Nick and Montana all played. Guests are saved as players but never get a table column. A hidden TEST player lets you try things on the live site without affecting anything.
  - **Edit scores** turns the table into −/+ steppers. Column order stays put while you edit; − asks for confirmation; every change shows a notice with **Undo**.
  - **Manage** card: add games and players, delete them from the roster, and browse the full score history, where any change can be voided.
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
| `Player` | A player's initials |
| `Game` | A game on the board |
| `GameScore` | One player's current score in one game (a table cell) |
| `Play` | One recorded game: who played, who won, and whether it counted on the main table |
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

- Links to each game's website
- MFA for admin sign-in
- Move from Create React App to Vite
