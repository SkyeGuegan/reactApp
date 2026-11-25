// Pure per-game numbers for a game's page (no Amplify imports, unit-tested).

// Each core player's wins in this game (from the table cells) and win rate
// (wins / games played). Before Play records existed, every counted game had
// all core players at the table, so wins / Played is a fair rate.
// Returns rows sorted by wins (then initials) and leaderIds: everyone on the
// most wins (co-leaders on a tie, like the main table), empty if nobody has won.
export function gameStandings(game, corePlayers, gameScores, played) {
  const rows = corePlayers.map(player => {
    const cell = gameScores.find(gs => gs.gameId === game.id && gs.playerId === player.id);
    const wins = cell ? cell.score : 0;
    return { player, wins, rate: played > 0 ? wins / played : null };
  }).sort((a, b) => b.wins - a.wins || a.player.initials.localeCompare(b.player.initials));
  const best = rows.length ? rows[0].wins : 0;
  const leaderIds = new Set(best > 0 ? rows.filter(r => r.wins === best).map(r => r.player.id) : []);
  return { rows, leaderIds };
}

// This game's recorded plays, newest first. Voided plays are dropped; test
// plays only when includeTest (admins).
export function playsForGame(gameId, plays, includeTest = false) {
  return plays
    .filter(p => p.gameId === gameId && !p.voided && (includeTest || !p.test))
    .sort((a, b) => (a.playedAt < b.playedAt ? 1 : a.playedAt > b.playedAt ? -1 : 0));
}

export const fmtPercent = (rate) => (rate == null ? '—' : `${Math.round(rate * 100)}%`);
