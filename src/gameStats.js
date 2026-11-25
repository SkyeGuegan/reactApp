// Pure per-game numbers for a game's page (no Amplify imports, unit-tested).

// Standings for one game.
//   Core players: wins from the table cells; win rate = wins / games played
//     (before Play records existed, every counted game had all core players
//     at the table, so wins / Played is a fair rate).
//   Guests: anyone else (not hidden) who appears in this game's recorded,
//     non-test, non-voided plays; wins are their share of those plays' wins
//     and win rate is over the recorded games they played. Marked guest: true.
// Rows are sorted by wins (core players first on a tie, then initials).
// leaderIds: everyone on the most wins (co-leaders on a tie), empty if nobody
// has won.
export function gameStandings(game, corePlayers, gameScores, played, { plays = [], players = [] } = {}) {
  const coreIds = new Set(corePlayers.map(p => p.id));
  const coreRows = corePlayers.map(player => {
    const cell = gameScores.find(gs => gs.gameId === game.id && gs.playerId === player.id);
    const wins = cell ? cell.score : 0;
    return { player, wins, rate: played > 0 ? wins / played : null, guest: false };
  });

  const guestStats = new Map();
  for (const play of plays) {
    if (play.gameId !== game.id || play.voided || play.test) continue;
    const share = play.winnerIds.length ? 1 / play.winnerIds.length : 0;
    for (const id of play.playerIds) {
      if (coreIds.has(id)) continue;
      const s = guestStats.get(id) || { played: 0, wins: 0 };
      s.played += 1;
      if (play.winnerIds.includes(id)) s.wins += share;
      guestStats.set(id, s);
    }
  }
  const guestRows = [...guestStats.entries()]
    .map(([id, s]) => ({ player: players.find(p => p.id === id), ...s }))
    .filter(r => r.player && !r.player.hidden)
    .map(r => ({ player: r.player, wins: r.wins, rate: r.played > 0 ? r.wins / r.played : null, guest: true, played: r.played }));

  const rows = [...coreRows, ...guestRows].sort((a, b) =>
    b.wins - a.wins || (a.guest === b.guest ? 0 : a.guest ? 1 : -1) || a.player.initials.localeCompare(b.player.initials));
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
