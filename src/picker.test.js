import { lastPlayedByGame, pickWeights, pickWeighted, wheelSegments, spinRotation, segmentAtPointer } from './picker';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-11-25T00:00:00Z');

test('lastPlayedByGame keeps the latest real play per game', () => {
  const last = lastPlayedByGame([
    { gameId: 'a', playedAt: '2026-11-03T00:00:00Z' },
    { gameId: 'a', playedAt: '2026-11-16T00:00:00Z' },
    { gameId: 'a', playedAt: '2026-11-20T00:00:00Z', voided: true },
    { gameId: 'b', playedAt: '2026-11-20T00:00:00Z', test: true },
  ]);
  expect(new Date(last.get('a')).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  expect(last.has('b')).toBe(false);
});

test('all games are equal unless "favour stale" is on', () => {
  expect(pickWeights([{ gameId: 'a' }, { key: 'new' }])).toEqual([1, 1]);
});

test('favour stale: recent games light, long-unplayed and unknown games heavy, capped', () => {
  const lastPlayed = new Map([['week', now - 3 * DAY], ['twoMonths', now - 60 * DAY], ['ancient', now - 900 * DAY]]);
  const w = pickWeights(
    [{ gameId: 'week' }, { gameId: 'twoMonths' }, { gameId: 'ancient' }, { gameId: 'neverRecorded' }, { key: 'Azul' }],
    { favorStale: true, lastPlayed, now },
  );
  expect(w[0]).toBeCloseTo(1.1, 1);
  expect(w[1]).toBeCloseTo(3, 1);
  expect(w[2]).toBe(6);
  expect(w[3]).toBe(4);
  expect(w[4]).toBe(4);
});

test('pickWeighted follows the weights', () => {
  expect(pickWeighted([1, 3], () => 0.1)).toBe(0);
  expect(pickWeighted([1, 3], () => 0.3)).toBe(1);
  expect(pickWeighted([1, 3], () => 0.99)).toBe(1);
  expect(pickWeighted([], () => 0.5)).toBe(-1);
});

test('segments are proportional to weight and cover the circle', () => {
  const s = wheelSegments([1, 1, 2]);
  expect(s.map(x => [x.start, x.end])).toEqual([[0, 90], [90, 180], [180, 360]]);
});

test('a spin always lands the pointer inside the chosen segment', () => {
  const segs = wheelSegments([1, 2, 1, 4, 1]);
  let rot = 0;
  for (let i = 0; i < 200; i++) {
    const target = i % segs.length;
    const r = (i * 0.618) % 1;
    const next = spinRotation(rot, segs[target], () => r);
    expect(next).toBeGreaterThan(rot + 5 * 360 - 1);
    expect(segmentAtPointer(segs, next)).toBe(target);
    rot = next;
  }
});
