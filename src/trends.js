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
// Summing all non-voided deltas reconciles to the current GameScore totals
// (migration baseline rows + every click), so the chart's end values match the
// table's Total Wins.
export function buildCumulativeSeries(events) {
  const active = events
    .filter(e => !e.voided && e.playerInitials)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

  const players = [...new Set(active.map(e => e.playerInitials))].sort();
  const running = Object.fromEntries(players.map(p => [p, 0]));

  const series = active.map(e => {
    running[e.playerInitials] += e.delta;
    return { time: e.createdAt, ...running };
  });

  return { series, players };
}
