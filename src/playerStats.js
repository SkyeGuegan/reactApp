// Pure numbers for a player's page (no Amplify imports, unit-tested): their
// record in each game, head-to-head against other players across every game,
// and their recorded games.
import { playerScoringStats } from './scoring';
import { recordedPlays, allRecordedPlays, headToHead } from './insights';

// The player's record in each game they've played, most played first:
//   { game, played, wins, rate, best, avgScore, favourite, scoreField }
// Regulars: the main scoreboard (its Played and wins, including games from
// before recording) plus recorded games that didn't count on it. Guests:
// their recorded games. best / avgScore / favourite (most-played choice, e.g.
// faction) come from recorded games with details.
export function playerGameRows(player, { games, plays, gameScores, playedCounts, isCore }) {
  const rows = [];
  for (const game of games) {
    const mine = recordedPlays(game, plays).filter(p => p.playerIds.includes(player.id));
    const share = (p) => (p.winnerIds.includes(player.id) ? 1 / p.winnerIds.length : 0);
    let played; let wins;
    if (isCore) {
      const off = mine.filter(p => !p.counted);
      const cell = gameScores.find(gs => gs.gameId === game.id && gs.playerId === player.id);
      played = (playedCounts.get(game.id) || 0) + off.length;
      wins = (cell ? cell.score : 0) + off.reduce((a, p) => a + share(p), 0);
    } else {
      played = mine.length;
      wins = mine.reduce((a, p) => a + share(p), 0);
    }
    if (!played) continue;
    const scored = mine.length ? playerScoringStats(game, plays).find(r => r.playerId === player.id) : null;
    rows.push({
      game, played, wins, rate: wins / played,
      best: scored ? scored.best : null,
      avgScore: scored ? scored.avgScore : null,
      favourite: scored ? scored.mostPlayed : null,
      choiceField: scored ? scored.choiceField : null,
    });
  }
  return rows.sort((a, b) => b.played - a.played || b.wins - a.wins || a.game.name.localeCompare(b.game.name));
}

// Head-to-head across every game against each other player they've shared a
// recorded game with: { opponent, ahead, behind, level, games }, most games
// first. Same rules as a game's head-to-head (places by score, else result).
export function playerHeadToHead(player, others, games, plays) {
  const out = new Map(others.filter(o => o.id !== player.id).map(o => [o.id, { opponent: o, ahead: 0, behind: 0, level: 0, games: 0 }]));
  for (const game of games) {
    const list = recordedPlays(game, plays).filter(p => p.playerIds.includes(player.id));
    if (!list.length) continue;
    for (const [id, r] of out) {
      const h = headToHead(game, list, [player.id, id]).get(`${player.id}|${id}`);
      r.ahead += h.ahead; r.behind += h.behind; r.level += h.level; r.games += h.games;
    }
  }
  return [...out.values()].filter(r => r.games > 0)
    .sort((a, b) => b.games - a.games || a.opponent.initials.localeCompare(b.opponent.initials));
}

// The player's recorded games, newest first.
export const playerPlays = (player, plays) =>
  allRecordedPlays(plays).filter(p => p.playerIds.includes(player.id)).reverse();
