// Pure rules for recorded games (Play records). No Amplify imports, so it's
// unit-testable and shared by the data hook and the UI.

// The regulars shown on the main table. Falls back to every visible player when
// nobody is flagged core yet (data from before the core flag existed).
export function corePlayers(players) {
  const visible = players.filter(p => !p.hidden);
  const core = visible.filter(p => p.core);
  return core.length ? core : visible;
}

// Does a play with these participants count on the main table?
//   counted: every core player played and no hidden (test) player did.
//   test:    a hidden player took part (the play is admin-only everywhere).
//   missing: initials of core players who didn't play (for the UI to explain).
export function classifyPlay(playerIds, players) {
  const ids = new Set(playerIds);
  const test = players.some(p => p.hidden && ids.has(p.id));
  const missing = corePlayers(players).filter(p => !ids.has(p.id)).map(p => p.initials);
  return { counted: !test && missing.length === 0, test, missing };
}

// Main-table wins from a counted play: 1 win shared equally by all winners
// (guests included in the split), but only core winners get table points.
export function winShares(winnerIds, players) {
  if (!winnerIds.length) return [];
  const share = 1 / winnerIds.length;
  const core = new Set(corePlayers(players).map(p => p.id));
  return winnerIds.filter(id => core.has(id)).map(playerId => ({ playerId, share }));
}

const live = (plays) => plays.filter(p => !p.voided);

// Played count per game id: the pre-Play estimate (rounded; old half-point
// data can make it fractional) plus this game's counted, non-voided plays.
export function playedCounts(games, plays) {
  const counts = new Map(games.map(g => [g.id, Math.round(g.baselinePlays || 0)]));
  for (const p of live(plays)) {
    if (p.counted && !p.test && counts.has(p.gameId)) counts.set(p.gameId, counts.get(p.gameId) + 1);
  }
  return counts;
}

// Everyone's record across all recorded (non-test, non-voided) plays,
// including games that didn't count on the main table. Returns rows sorted by
// wins then games played: { player, played, wins }.
export function everyoneStats(players, plays) {
  const rows = new Map(players.filter(p => !p.hidden).map(p => [p.id, { player: p, played: 0, wins: 0 }]));
  for (const play of live(plays)) {
    if (play.test) continue;
    for (const id of play.playerIds) if (rows.has(id)) rows.get(id).played += 1;
    const share = play.winnerIds.length ? 1 / play.winnerIds.length : 0;
    for (const id of play.winnerIds) if (rows.has(id)) rows.get(id).wins += share;
  }
  return [...rows.values()]
    .filter(r => r.played > 0)
    .sort((a, b) => b.wins - a.wins || b.played - a.played || a.player.initials.localeCompare(b.player.initials));
}

// Round a share like 0.333… for display: "1", "0.5", "0.33".
export const fmtWins = (n) => String(Math.round(n * 100) / 100);
