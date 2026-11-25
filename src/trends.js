// Pure transform: turn a flat list of ScoreEvent rows into cumulative-wins data
// for a line chart. Kept out of the chart component so it's unit-testable
// without rendering Recharts.
//
// Each event looks like { playerInitials, delta, createdAt, voided }. Returns
// { series, players } where:
//   - `players` is the sorted list of player-initials keys (one <Line> each),
//     taken from the denormalized event labels so renamed/deleted players still
//     appear correctly.
//   - `series` is one point per (non-voided) event in chronological order:
//     { time, <initials>: runningTotal, ... }, carrying every player's current
//     cumulative total forward so the lines step rather than gap.
//
// Decreases are treated as corrections, not lost wins: see netCorrections.
//
// Summing all non-voided deltas reconciles to the current GameScore totals
// (migration baseline rows + every click), so the chart's end values match the
// table's Total Wins.
export function buildCumulativeSeries(events) {
  const active = netCorrections(events
    .filter(e => !e.voided && e.playerInitials)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)));

  const players = [...new Set(active.map(e => e.playerInitials))].sort();
  const running = Object.fromEntries(players.map(p => [p, 0]));

  const series = active.map(e => {
    running[e.playerInitials] += e.delta;
    return { time: e.createdAt, ...running };
  });

  return { series, players };
}

// A decrease is almost always fixing an earlier over-count (a mis-click), so
// instead of drawing the line down and back up, cancel it against the most
// recent earlier increase(s) for the same player in the same game: those
// points are removed or reduced and the decrease disappears. Any amount with
// nothing earlier to cancel against stays as a real decrease. End totals are
// unchanged. Expects events sorted oldest first; returns a new array.
export function netCorrections(sorted) {
  const out = sorted.map(e => ({ ...e }));
  const key = e => `${e.gameId || e.gameName}#${e.playerId || e.playerInitials}`;
  for (let i = 0; i < out.length; i++) {
    const neg = out[i];
    if (!(neg.delta < 0)) continue;
    for (let j = i - 1; j >= 0 && neg.delta < 0; j--) {
      const pos = out[j];
      if (!(pos.delta > 0) || key(pos) !== key(neg)) continue;
      const used = Math.min(pos.delta, -neg.delta);
      pos.delta -= used;
      neg.delta += used;
    }
  }
  return out.filter(e => e.delta !== 0);
}
