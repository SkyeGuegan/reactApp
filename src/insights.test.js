import { recordedPlays, gameRecords, headToHead, winStreaks, cumulativeWins, winningScores } from './insights';
import { SUGGESTED } from './scoring';

const game = { id: 'g', name: 'Terra Mystica', scoreFields: JSON.stringify(SUGGESTED['terra mystica']) };
let day = 0;
const play = (scores, winners, extra = {}) => {
  day += 1;
  return {
    id: `p${day}`, gameId: 'g', playedAt: `2026-01-${String(day).padStart(2, '0')}T12:00:00Z`,
    playerIds: Object.keys(scores), winnerIds: winners,
    details: JSON.stringify(Object.fromEntries(Object.entries(scores).map(([id, s]) => [id, s == null ? {} : { points: s }]))),
    ...extra,
  };
};
const plays = [
  play({ a: 130, b: 100, c: 90 }, ['a']),          // a by 30
  play({ a: 120, b: 121, c: 80 }, ['b']),          // b by 1; best losing 120
  play({ a: 150, b: 105 }, ['a']),                 // a by 45
  play({ a: 140, b: 160 }, ['b'], { test: true }), // ignored
  play({ a: 101, b: 99, c: 99 }, ['a']),           // a by 2; lowest winning 101
  play({ a: null, c: null }, ['c']),               // no scores: result only
];

test('recordedPlays drops test, voided and other games, oldest first', () => {
  expect(recordedPlays(game, [...plays].reverse()).map(p => p.id)).toEqual(['p1', 'p2', 'p3', 'p5', 'p6']);
});

test('gameRecords: biggest win, closest game, best losing and lowest winning scores', () => {
  const r = gameRecords(game, plays);
  expect(r.biggestWin).toMatchObject({ playerId: 'a', score: 150, margin: 45, runnerUpId: 'b' });
  expect(r.closest).toMatchObject({ playerId: 'b', score: 121, margin: 1, runnerUpId: 'a' });
  expect(r.bestLosing).toMatchObject({ playerId: 'a', score: 120 });
  expect(r.worstWinning).toMatchObject({ playerId: 'a', score: 101 });
  expect(r.games).toBe(4);
  expect(gameRecords({ id: 'g', name: 'X' }, plays)).toBeNull(); // no score field
});

test('headToHead: by place when scored, else by result; ties level', () => {
  const h = headToHead(game, plays, ['a', 'b', 'c']);
  expect(h.get('a|b')).toEqual({ ahead: 3, behind: 1, level: 0, games: 4 });
  expect(h.get('b|a')).toEqual({ ahead: 1, behind: 3, level: 0, games: 4 });
  expect(h.get('b|c')).toEqual({ ahead: 2, behind: 0, level: 1, games: 3 });
  expect(h.get('a|c')).toEqual({ ahead: 3, behind: 1, level: 0, games: 4 }); // c won the unscored game
});

test('winStreaks: longest and current per player', () => {
  const s = winStreaks(game, plays);
  const a = s.find(r => r.playerId === 'a');
  expect(a).toMatchObject({ longest: 2, current: 0, from: plays[2].playedAt, to: plays[4].playedAt });
  expect(s.find(r => r.playerId === 'c')).toMatchObject({ longest: 1, current: 1 });
  expect(s[0].playerId).toBe('a');
});

test('cumulativeWins and winningScores follow recorded games in order', () => {
  const { series, labels } = cumulativeWins(game, plays, id => id.toUpperCase());
  expect(labels).toEqual(['A', 'B', 'C']);
  expect(series.map(p => p.A)).toEqual([1, 1, 2, 3, 3]);
  const w = winningScores(game, plays, 2);
  expect(w.map(p => p.score)).toEqual([130, 121, 150, 101]); // unscored game skipped
  expect(w.map(p => p.avg)).toEqual([130, 125.5, 135.5, 125.5]);
});
