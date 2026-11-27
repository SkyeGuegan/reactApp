// Pure "records & rivalries" numbers for a game's page, from its recorded
// plays (no Amplify imports, unit-tested): game records by the main score,
// head-to-head between players, winning streaks, and the series behind the
// recorded-games charts.
import { mainScoreField, placings } from './scoring';

// A game's live, non-test plays, oldest first.
const oldestFirst = (a, b) => (a.playedAt < b.playedAt ? -1 : a.playedAt > b.playedAt ? 1 : 0);
export const recordedPlays = (game, plays) => plays
  .filter(p => p.gameId === game.id && !p.voided && !p.test)
  .sort(oldestFirst);
// Every game's live, non-test plays, oldest first.
export const allRecordedPlays = (plays) => plays.filter(p => !p.voided && !p.test).sort(oldestFirst);

// Scores in a play by the main field, best first: [{ playerId, score }].
function rankedScores(play, f) {
  const placed = placings(play, f);
  return Object.entries(placed)
    .map(([playerId, r]) => ({ playerId, score: r.score, place: r.place }))
    .sort((a, b) => a.place - b.place);
}

// Game records by the main score (needs two or more scores in a play):
//   biggestWin / closest: winning margin over the runner-up
//   bestLosing: best score that didn't win
//   worstWinning: weakest score that still won
// Each is { play, playerId, score, margin?, runnerUpId? } or null; most recent
// play wins ties. games: how many plays had two or more scores. Returns null
// when the game has no number field or no such play.
export function gameRecords(game, plays) {
  const f = mainScoreField(game);
  if (!f) return null;
  const better = (a, b) => (f.lowWins ? a < b : a > b);
  let biggestWin = null; let closest = null; let bestLosing = null; let worstWinning = null;
  let games = 0;
  for (const play of recordedPlays(game, plays)) {
    const ranked = rankedScores(play, f);
    if (ranked.length < 2) continue;
    games += 1;
    const [first, second] = ranked;
    if (play.winnerIds.length === 1 && play.winnerIds[0] === first.playerId && first.place !== second.place) {
      const margin = Math.abs(first.score - second.score);
      const rec = { play, playerId: first.playerId, score: first.score, margin, runnerUpId: second.playerId };
      if (!biggestWin || margin >= biggestWin.margin) biggestWin = rec;
      if (!closest || margin <= closest.margin) closest = rec;
    }
    for (const r of ranked) {
      const won = play.winnerIds.includes(r.playerId);
      if (!won && (!bestLosing || !better(bestLosing.score, r.score))) bestLosing = { play, playerId: r.playerId, score: r.score };
      if (won && (!worstWinning || !better(r.score, worstWinning.score))) worstWinning = { play, playerId: r.playerId, score: r.score };
    }
  }
  if (!biggestWin && !bestLosing && !worstWinning) return null;
  return { field: f, games, biggestWin, closest, bestLosing, worstWinning };
}

// Head-to-head among ids over plays both took part in: for the pair (a, b),
// how often a finished above b, below, or level. Uses places by the main
// score when both have one; otherwise the result (a winner is above a
// non-winner, two winners or two non-winners are level).
// Returns Map 'a|b' → { ahead, behind, level, games }.
export function headToHead(game, plays, ids) {
  const f = mainScoreField(game);
  const out = new Map();
  for (const a of ids) for (const b of ids) if (a !== b) out.set(`${a}|${b}`, { ahead: 0, behind: 0, level: 0, games: 0 });
  for (const play of recordedPlays(game, plays)) {
    const placed = placings(play, f);
    for (const a of ids) {
      for (const b of ids) {
        if (a === b || !play.playerIds.includes(a) || !play.playerIds.includes(b)) continue;
        const r = out.get(`${a}|${b}`);
        r.games += 1;
        let cmp;
        if (placed[a] && placed[b]) cmp = placed[b].place - placed[a].place;
        else cmp = (play.winnerIds.includes(a) ? 1 : 0) - (play.winnerIds.includes(b) ? 1 : 0);
        if (cmp > 0) r.ahead += 1; else if (cmp < 0) r.behind += 1; else r.level += 1;
      }
    }
  }
  return out;
}

// Winning streaks over each player's own recorded games (a shared win counts).
// Rows: { playerId, current, longest, from, to } (from/to: the longest
// streak's first and last play dates), sorted by longest then current.
export const winStreaks = (game, plays) => streaksIn(recordedPlays(game, plays));

// The same over any list of plays, oldest first (e.g. every game: a player's
// streak runs across games).
export function streaksIn(list) {
  const rows = new Map();
  for (const play of list) {
    for (const id of play.playerIds) {
      const r = rows.get(id) || { playerId: id, current: 0, longest: 0, from: null, to: null, start: null };
      if (play.winnerIds.includes(id)) {
        if (r.current === 0) r.start = play.playedAt;
        r.current += 1;
        if (r.current >= r.longest) { r.longest = r.current; r.from = r.start; r.to = play.playedAt; }
      } else {
        r.current = 0;
      }
      rows.set(id, r);
    }
  }
  return [...rows.values()].map(({ start, ...r }) => r)
    .filter(r => r.longest > 0)
    .sort((a, b) => b.longest - a.longest || b.current - a.current);
}

// Cumulative wins over recorded games (shared wins split), one point per play:
// { series: [{ time, [label]: total }], labels } where label(id) names a
// player; only players with a win get a line.
export function cumulativeWins(game, plays, label) {
  const list = recordedPlays(game, plays);
  const winners = [...new Set(list.flatMap(p => p.winnerIds))];
  const labels = winners.map(label);
  const running = Object.fromEntries(labels.map(l => [l, 0]));
  const series = list.map(p => {
    for (const id of p.winnerIds) running[label(id)] += 1 / p.winnerIds.length;
    return { time: p.playedAt, ...running };
  });
  return { series, labels };
}

// Winning score per recorded game (by the main field) and the running
// average of the last `window` of them: [{ time, n, score, avg }].
export function winningScores(game, plays, window = 5) {
  const f = mainScoreField(game);
  if (!f) return [];
  const out = [];
  for (const p of recordedPlays(game, plays)) {
    const ranked = rankedScores(p, f).filter(r => p.winnerIds.includes(r.playerId));
    if (!ranked.length) continue;
    const score = ranked[0].score;
    const recent = [...out.slice(-(window - 1)).map(o => o.score), score];
    out.push({ time: p.playedAt, n: out.length + 1, score, avg: Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 10) / 10 });
  }
  return out;
}
